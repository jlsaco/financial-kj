import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchRecords, insertRecord } from "@/store/records-store";
import {
  fetchRecurringEvents,
  fetchMonthConfigs,
  insertRecurringEvent,
} from "@/store/recurring-store";
import {
  computeDebtEndDate,
  getDebtSummary,
  getDebtAmortization,
} from "@/lib/debt-helpers";
import {
  fetchAbonos,
  insertAbono,
  deleteAbono,
} from "@/store/abonos-store";
import { ok, fail, guard, today, zUserId, zAbonoEffect } from "@/lib/mcp/shared";

/**
 * Tools para deudas. No existe una tabla `deudas`: una deuda es un registro
 * con `category = "deuda"` (puntual en finance_records, o recurrente en
 * recurring_events). Estas tools encapsulan esa convención.
 */
export function registerDebtTools(server: McpServer): void {
  server.tool(
    "crear_deuda",
    "Registra una deuda puntual (finance_records con category='deuda', type='gasto').",
    {
      name: z.string().describe("Descripción de la deuda, p.ej. 'Préstamo a Juan'"),
      amount: z.number().positive(),
      userId: zUserId,
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha YYYY-MM-DD (por defecto hoy)"),
    },
    async ({ name, amount, userId, date }) => {
      return guard(async () => {
        const record = await insertRecord({
          name,
          amount,
          category: "deuda",
          userId,
          type: "gasto",
          date: date ?? today(),
        });
        return ok(record);
      });
    }
  );

  server.tool(
    "crear_deuda_recurrente",
    "Crea una deuda con cuotas (recurring_events con category='deuda'). La cuota " +
      "mensual (defaultAmount) se calcula como totalAmount ÷ installmentsCount si no " +
      "se provee. La fecha de fin (end_date) se calcula automáticamente como " +
      "inicio + (cuotas − 1) meses en el día del mes; si no se da startDate se usa el " +
      "mes actual como inicio.",
    {
      name: z.string().describe("Nombre, p.ej. 'Cuota carro'"),
      dayOfMonth: z.number().int().min(1).max(31).describe("Día de cobro de la cuota"),
      totalAmount: z
        .number()
        .positive()
        .describe("Total a pagar (capital + intereses)"),
      installmentsCount: z
        .number()
        .int()
        .positive()
        .describe("Número de cuotas"),
      principalAmount: z
        .number()
        .positive()
        .optional()
        .describe("Capital prestado, sin intereses (opcional)"),
      interestRate: z
        .number()
        .optional()
        .describe("% de interés (opcional)"),
      defaultAmount: z
        .number()
        .positive()
        .optional()
        .describe(
          "Valor de la cuota mensual (opcional; por defecto totalAmount ÷ installmentsCount)"
        ),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha de inicio YYYY-MM-DD (opcional; por defecto el mes actual)"),
      tarjetaId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "Tarjeta a la que pertenece la deuda (F4): su cuota del mes entra en la liquidación de la tarjeta."
        ),
      userId: zUserId,
    },
    async ({
      name,
      dayOfMonth,
      totalAmount,
      installmentsCount,
      principalAmount,
      interestRate,
      defaultAmount,
      startDate,
      tarjetaId,
      userId,
    }) => {
      return guard(async () => {
        const cuota = defaultAmount ?? totalAmount / installmentsCount;
        const endDate =
          computeDebtEndDate(dayOfMonth, installmentsCount, startDate) ??
          undefined;
        const event = await insertRecurringEvent({
          name,
          type: "gasto",
          category: "deuda",
          dayOfMonth,
          defaultAmount: cuota,
          userId,
          isActive: true,
          startDate,
          endDate,
          totalAmount,
          principalAmount,
          interestRate,
          installmentsCount,
          tarjetaId,
        });
        return ok(event);
      });
    }
  );

  server.tool(
    "resumen_deuda",
    "Devuelve el resumen de una deuda recurrente: saldo pendiente, cuotas pagadas/" +
      "restantes, monto pagado, próxima cuota (con fecha y monto), progreso (%), " +
      "fecha de fin estimada, % de interés y total/capital. Incluye el SALDO DE " +
      "CAPITAL pendiente (outstandingPrincipal, que refleja los abonos), el interés " +
      "total estimado, las tasas declarada e implícita (impliedRate reproduce la " +
      "cuota real) con la bandera misaligned si difieren, y el total de abonos a " +
      "capital. Recibe el id (uuid) del recurrente (debe tener category='deuda').",
    {
      id: z.string().uuid().describe("ID (uuid) del recurrente con category='deuda'"),
    },
    async ({ id }) => {
      return guard(async () => {
        const [events, configs, abonos] = await Promise.all([
          fetchRecurringEvents(),
          fetchMonthConfigs(),
          fetchAbonos(),
        ]);
        const event = events.find((e) => e.id === id);
        if (!event) return fail(`No existe un recurrente con id ${id}.`);
        if (event.category !== "deuda")
          return fail(`El recurrente ${id} no es una deuda (category='deuda').`);
        const summary = getDebtSummary(event, configs, abonos);
        const eventAbonos = abonos.filter((a) => a.recurringEventId === id);
        return ok({ event, summary, abonos: eventAbonos });
      });
    }
  );

  server.tool(
    "tabla_amortizacion_deuda",
    "Devuelve la TABLA DE AMORTIZACIÓN real (sistema francés) de una deuda " +
      "recurrente (category='deuda'), con los abonos a capital ya aplicados. Por " +
      "cuota entrega: nº (index), fecha (dueDate), cuota (payment), interés " +
      "(interest), capital (principal), saldo de capital restante (balance) y el " +
      "abono aplicado tras esa cuota (abono, si hay). Expone declaredRate " +
      "(tasa % e.m. declarada), impliedRate (tasa % e.m. implícita que reproduce " +
      "la cuota real total÷cuotas), effectiveRate (la usada), rateSource y " +
      "misaligned=true cuando declarada e implícita difieren materialmente (caso " +
      "típico de datos desalineados). Interpreta la tasa como efectiva mensual.",
    {
      id: z.string().uuid().describe("ID (uuid) del recurrente con category='deuda'"),
    },
    async ({ id }) => {
      return guard(async () => {
        const [events, abonos] = await Promise.all([
          fetchRecurringEvents(),
          fetchAbonos(),
        ]);
        const event = events.find((e) => e.id === id);
        if (!event) return fail(`No existe un recurrente con id ${id}.`);
        if (event.category !== "deuda")
          return fail(`El recurrente ${id} no es una deuda (category='deuda').`);
        const eventAbonos = abonos.filter((a) => a.recurringEventId === id);
        const amortization = getDebtAmortization(event, eventAbonos);
        if (!amortization)
          return fail(
            `La deuda ${id} no tiene datos suficientes para amortizar ` +
              `(requiere installmentsCount y total/capital).`
          );
        return ok({ id, amortization });
      });
    }
  );

  server.tool(
    "abonar_capital_deuda",
    "Registra un ABONO EXTRAORDINARIO a capital sobre una deuda recurrente activa " +
      "(category='deuda'). El abono reduce el saldo de capital de inmediato y " +
      "recalcula el plan según el efecto elegido: 'reducir_plazo' (mantiene la " +
      "cuota y baja el nº de cuotas restantes) o 'reducir_cuota' (mantiene las " +
      "cuotas restantes y baja el valor de cada cuota futura). Devuelve el abono " +
      "creado, el resumen actualizado y la nueva tabla de amortización.",
    {
      deudaId: z
        .string()
        .uuid()
        .describe("ID (uuid) del recurrente con category='deuda'"),
      amount: z.number().positive().describe("Monto del abono a capital"),
      effect: zAbonoEffect.describe(
        "Efecto en el plan: 'reducir_plazo' o 'reducir_cuota'"
      ),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha del abono YYYY-MM-DD (por defecto hoy)"),
      note: z.string().optional().describe("Nota opcional del abono"),
    },
    async ({ deudaId, amount, effect, date, note }) => {
      return guard(async () => {
        const events = await fetchRecurringEvents();
        const event = events.find((e) => e.id === deudaId);
        if (!event) return fail(`No existe un recurrente con id ${deudaId}.`);
        if (event.category !== "deuda")
          return fail(`El recurrente ${deudaId} no es una deuda (category='deuda').`);
        const abono = await insertAbono({
          recurringEventId: deudaId,
          amount,
          date: date ?? today(),
          effect,
          note,
        });
        const [configs, abonos] = await Promise.all([
          fetchMonthConfigs(),
          fetchAbonos(),
        ]);
        const eventAbonos = abonos.filter((a) => a.recurringEventId === deudaId);
        const summary = getDebtSummary(event, configs, abonos);
        const amortization = getDebtAmortization(event, eventAbonos);
        return ok({ abono, summary, amortization });
      });
    }
  );

  server.tool(
    "listar_abonos_deuda",
    "Lista el historial de abonos a capital de una deuda recurrente " +
      "(fecha, monto, efecto y nota), ordenados por fecha.",
    {
      id: z.string().uuid().describe("ID (uuid) del recurrente con category='deuda'"),
    },
    async ({ id }) => {
      return guard(async () => {
        const abonos = (await fetchAbonos()).filter(
          (a) => a.recurringEventId === id
        );
        const totalAbonos = abonos.reduce((s, a) => s + a.amount, 0);
        return ok({ count: abonos.length, totalAbonos, abonos });
      });
    }
  );

  server.tool(
    "borrar_abono_capital",
    "Borra de forma definitiva un abono a capital (de una deuda o compra " +
      "diferida) por su id. Al borrarlo, el saldo de capital y el plan se " +
      "recalculan sin ese abono. La acción es irreversible.",
    {
      id: z.string().uuid().describe("ID (uuid) del abono a capital a borrar"),
    },
    async ({ id }) => {
      return guard(async () => {
        await deleteAbono(id);
        return ok({ deleted: true, id });
      });
    }
  );

  server.tool(
    "listar_deudas",
    "Lista los registros con category='deuda', con filtros opcionales por mes/año/usuario.",
    {
      month: z.number().int().min(1).max(12).optional(),
      year: z.number().int().min(2000).max(2100).optional(),
      userId: zUserId.optional(),
    },
    async ({ month, year, userId }) => {
      return guard(async () => {
        let records = (await fetchRecords()).filter((r) => r.category === "deuda");
        records = records.filter((r) => {
          const [ry, rm] = r.date.split("-").map(Number);
          if (year !== undefined && ry !== year) return false;
          if (month !== undefined && rm !== month) return false;
          if (userId !== undefined && r.userId !== userId) return false;
          return true;
        });
        const total = records.reduce((sum, r) => sum + r.amount, 0);
        return ok({ count: records.length, totalDeudas: total, records });
      });
    }
  );
}
