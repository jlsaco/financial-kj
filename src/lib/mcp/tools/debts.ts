import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchRecords, insertRecord } from "@/store/records-store";
import {
  fetchRecurringEvents,
  fetchMonthConfigs,
  insertRecurringEvent,
} from "@/store/recurring-store";
import { computeDebtEndDate, getDebtSummary } from "@/lib/debt-helpers";
import { ok, fail, guard, today, zUserId } from "@/lib/mcp/shared";

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
      "fecha de fin estimada, % de interés y total/capital. Recibe el id (uuid) del " +
      "recurrente (debe tener category='deuda').",
    {
      id: z.string().uuid().describe("ID (uuid) del recurrente con category='deuda'"),
    },
    async ({ id }) => {
      return guard(async () => {
        const [events, configs] = await Promise.all([
          fetchRecurringEvents(),
          fetchMonthConfigs(),
        ]);
        const event = events.find((e) => e.id === id);
        if (!event) return fail(`No existe un recurrente con id ${id}.`);
        if (event.category !== "deuda")
          return fail(`El recurrente ${id} no es una deuda (category='deuda').`);
        const summary = getDebtSummary(event, configs);
        return ok({ event, summary });
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
