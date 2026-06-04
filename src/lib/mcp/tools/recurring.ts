import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchRecurringEvents,
  fetchMonthConfigs,
  insertRecurringEvent,
  updateRecurringEvent,
  upsertMonthConfig,
  deleteRecurringEvent,
} from "@/store/recurring-store";
import { insertRecord } from "@/store/records-store";
import { fetchTarjetas } from "@/store/cards-store";
import { fetchCuentas } from "@/store/cuentas-store";
import { computeDebtEndDate } from "@/lib/debt-helpers";
import { classifyRecurringEvents } from "@/lib/date-helpers";
import { ok, fail, guard, today, zCategory, zUserId, zRecordType } from "@/lib/mcp/shared";

/** Fecha en formato YYYY-MM-DD. */
const zDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato esperado YYYY-MM-DD");

/** Fecha YYYY-MM-DD o cadena vacía (para limpiar la fecha). */
const zDateOrEmpty = z.union([zDate, z.literal("")]);

/** Tools over `recurring_events` y `month_payment_configs` (gastos recurrentes). */
export function registerRecurringTools(server: McpServer): void {
  server.tool(
    "crear_gasto_recurrente",
    "Crea un evento recurrente de tipo GASTO (p.ej. arriendo, suscripción) en " +
      "recurring_events. Para ingresos recurrentes (p.ej. salario) usa " +
      "crear_ingreso_recurrente.",
    {
      name: z.string().describe("Nombre del recurrente, p.ej. 'Arriendo'"),
      category: zCategory,
      dayOfMonth: z.number().int().min(1).max(31).describe("Día del mes de cobro"),
      defaultAmount: z.number().positive().describe("Monto mensual por defecto"),
      userId: zUserId,
      isActive: z.boolean().optional().describe("Activo (por defecto true)"),
      startDate: zDate
        .optional()
        .describe(
          "Fecha de inicio del recurrente YYYY-MM-DD (opcional; si se omite se asume el mes actual)"
        ),
      endDate: zDate
        .optional()
        .describe(
          "Fecha de fin del recurrente YYYY-MM-DD (opcional; si se omite es indefinido)"
        ),
    },
    async ({
      name,
      category,
      dayOfMonth,
      defaultAmount,
      userId,
      isActive,
      startDate,
      endDate,
    }) => {
      return guard(async () => {
        if (startDate && endDate && endDate < startDate) {
          return fail(
            "La fecha de fin no puede ser anterior a la fecha de inicio."
          );
        }
        const event = await insertRecurringEvent({
          name,
          type: "gasto",
          category,
          dayOfMonth,
          defaultAmount,
          userId,
          isActive: isActive ?? true,
          startDate,
          endDate,
        });
        return ok(event);
      });
    }
  );

  server.tool(
    "crear_ingreso_recurrente",
    "Crea un evento recurrente de tipo INGRESO (p.ej. salario, arriendo cobrado) " +
      "en recurring_events. No se permite category='deuda' para ingresos.",
    {
      name: z.string().describe("Nombre del recurrente, p.ej. 'Salario'"),
      category: zCategory,
      dayOfMonth: z.number().int().min(1).max(31).describe("Día del mes en que se recibe"),
      defaultAmount: z.number().positive().describe("Monto mensual por defecto"),
      userId: zUserId,
      isActive: z.boolean().optional().describe("Activo (por defecto true)"),
      startDate: zDate
        .optional()
        .describe(
          "Fecha de inicio del recurrente YYYY-MM-DD (opcional; si se omite se asume el mes actual)"
        ),
      endDate: zDate
        .optional()
        .describe(
          "Fecha de fin del recurrente YYYY-MM-DD (opcional; si se omite es indefinido)"
        ),
    },
    async ({
      name,
      category,
      dayOfMonth,
      defaultAmount,
      userId,
      isActive,
      startDate,
      endDate,
    }) => {
      return guard(async () => {
        if (category === "deuda") {
          return fail(
            "Un ingreso recurrente no puede tener category='deuda'. Usa otra categoría."
          );
        }
        if (startDate && endDate && endDate < startDate) {
          return fail(
            "La fecha de fin no puede ser anterior a la fecha de inicio."
          );
        }
        const event = await insertRecurringEvent({
          name,
          type: "ingreso",
          category,
          dayOfMonth,
          defaultAmount,
          userId,
          isActive: isActive ?? true,
          startDate,
          endDate,
        });
        return ok(event);
      });
    }
  );

  server.tool(
    "listar_recurrentes",
    "Lista los eventos recurrentes (recurring_events). Cada evento incluye su " +
      "campo `type` ('gasto' o 'ingreso').",
    {
      soloActivos: z.boolean().optional().describe("Filtrar solo los activos"),
    },
    async ({ soloActivos }) => {
      return guard(async () => {
        let events = await fetchRecurringEvents();
        if (soloActivos) events = events.filter((e) => e.isActive);
        return ok({ count: events.length, events });
      });
    }
  );

  server.tool(
    "estado_recurrentes_mes",
    "Clasifica los recurrentes ACTIVOS por su estado de pago en el mes en curso, " +
      "en tres grupos: `vencidos` (la fecha ya pasó y no hay pago registrado este " +
      "mes; prioritario), `proximos` (la fecha aún no llega y no están pagados) y " +
      "`pagados` (ya tienen pago registrado este mes). Cada grupo viene ordenado " +
      "por fecha de vencimiento ascendente. Útil para saber qué pagos urgen.",
    {},
    async () => {
      return guard(async () => {
        const [events, configs] = await Promise.all([
          fetchRecurringEvents(),
          fetchMonthConfigs(),
        ]);
        const { overdue, upcoming, paid } = classifyRecurringEvents(
          events,
          configs
        );
        const toItem = (it: {
          event: { id: string; name: string; category: string };
          dueDate: Date;
          amount: number;
        }) => ({
          id: it.event.id,
          name: it.event.name,
          category: it.event.category,
          dueDate: it.dueDate.toISOString().slice(0, 10),
          amount: it.amount,
        });
        return ok({
          vencidos: overdue.map(toItem),
          proximos: upcoming.map(toItem),
          pagados: paid.map(toItem),
          counts: {
            vencidos: overdue.length,
            proximos: upcoming.length,
            pagados: paid.length,
          },
        });
      });
    }
  );

  server.tool(
    "actualizar_recurrente",
    "Actualiza campos de un evento recurrente existente (recurring_events) por su id. " +
      "Solo se modifican los campos enviados; el resto se conserva. Permite editar " +
      "las fechas de inicio/fin del recurrente. Para deudas (category='deuda') admite " +
      "los campos totalAmount/principalAmount/interestRate/installmentsCount; si se " +
      "cambia startDate o installmentsCount se recalcula automáticamente la end_date " +
      "(inicio + (cuotas − 1) meses en el día del mes). También permite cambiar el " +
      "tipo (type) entre 'gasto' e 'ingreso'; un ingreso no puede tener category='deuda'.",
    {
      id: z.string().uuid().describe("ID (uuid) del evento recurrente a actualizar"),
      name: z.string().optional().describe("Nuevo nombre"),
      type: zRecordType
        .optional()
        .describe(
          "Nuevo tipo del recurrente: 'gasto' o 'ingreso'. Un ingreso no puede tener category='deuda'."
        ),
      category: zCategory.optional().describe("Nueva categoría"),
      dayOfMonth: z
        .number()
        .int()
        .min(1)
        .max(31)
        .optional()
        .describe("Nuevo día del mes de cobro"),
      defaultAmount: z
        .number()
        .positive()
        .optional()
        .describe("Nuevo monto mensual por defecto (para deudas, la cuota mensual)"),
      isActive: z.boolean().optional().describe("Activar/desactivar el recurrente"),
      userId: zUserId.optional().describe("Nuevo responsable"),
      startDate: zDateOrEmpty
        .optional()
        .describe(
          "Fecha de inicio YYYY-MM-DD (cadena vacía para limpiarla; si no hay inicio se asume el mes actual)"
        ),
      endDate: zDateOrEmpty
        .optional()
        .describe(
          "Fecha de fin YYYY-MM-DD (cadena vacía para limpiarla; si no hay fin es indefinido). " +
            "En deudas se recalcula automáticamente al cambiar startDate o installmentsCount."
        ),
      totalAmount: z
        .number()
        .positive()
        .optional()
        .describe("Deuda: total a pagar (capital + intereses)"),
      principalAmount: z
        .number()
        .positive()
        .optional()
        .describe("Deuda: capital prestado (sin intereses)"),
      interestRate: z
        .number()
        .optional()
        .describe("Deuda: % de interés"),
      installmentsCount: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Deuda: número de cuotas"),
      tarjetaId: z
        .string()
        .uuid()
        .nullable()
        .optional()
        .describe(
          "Tarjeta a la que se asocia (F4); null para desvincular. Su cuota del mes entra en la liquidación de la tarjeta."
        ),
    },
    async ({
      id,
      name,
      type,
      category,
      dayOfMonth,
      defaultAmount,
      isActive,
      userId,
      startDate,
      endDate,
      totalAmount,
      principalAmount,
      interestRate,
      installmentsCount,
      tarjetaId,
    }) => {
      return guard(async () => {
        if (startDate && endDate && endDate < startDate) {
          return fail(
            "La fecha de fin no puede ser anterior a la fecha de inicio."
          );
        }

        const existing = (await fetchRecurringEvents()).find((e) => e.id === id);
        if (!existing) return fail(`No existe un recurrente con id ${id}.`);

        // Validamos con los valores efectivos (los del update o, si no vienen,
        // los actuales del recurrente). El CHECK de la BD es el respaldo final.
        const effType = type ?? existing.type;
        const effCategory = category ?? existing.category;
        if (effType === "ingreso" && effCategory === "deuda") {
          return fail(
            "Un recurrente de tipo 'ingreso' no puede tener category='deuda'. " +
              "Cambia la categoría o el tipo."
          );
        }

        const isDebt = effCategory === "deuda";

        // En deudas, si cambia startDate o installmentsCount recalculamos end_date.
        let resolvedEndDate = endDate;
        if (
          isDebt &&
          endDate === undefined &&
          (startDate !== undefined || installmentsCount !== undefined)
        ) {
          const effDay = dayOfMonth ?? existing.dayOfMonth;
          const effInstallments =
            installmentsCount ?? existing.installmentsCount ?? 0;
          const effStart =
            startDate === undefined
              ? existing.startDate
              : startDate || undefined;
          const computed = computeDebtEndDate(
            effDay,
            effInstallments,
            effStart
          );
          if (computed) resolvedEndDate = computed;
        }

        const event = await updateRecurringEvent(id, {
          ...(name !== undefined && { name }),
          ...(type !== undefined && { type }),
          ...(category !== undefined && { category }),
          ...(dayOfMonth !== undefined && { dayOfMonth }),
          ...(defaultAmount !== undefined && { defaultAmount }),
          ...(isActive !== undefined && { isActive }),
          ...(userId !== undefined && { userId }),
          ...(startDate !== undefined && { startDate }),
          ...(resolvedEndDate !== undefined && { endDate: resolvedEndDate }),
          ...(totalAmount !== undefined && { totalAmount }),
          ...(principalAmount !== undefined && { principalAmount }),
          ...(interestRate !== undefined && { interestRate }),
          ...(installmentsCount !== undefined && { installmentsCount }),
          ...(tarjetaId !== undefined && { tarjetaId: tarjetaId ?? undefined }),
        });
        return ok(event);
      });
    }
  );

  server.tool(
    "registrar_pago_mes",
    "Registra/actualiza el pago de un recurrente para un mes concreto (month_payment_configs, " +
      "upsert por evento+mes+año). Si NO se pasa recordId y la cuota queda pagada (isPaid=true), " +
      "crea automáticamente el finance_record de esa cuota (heredando nombre/categoría/tipo/" +
      "responsable del recurrente, igual que crear_gasto/crear_ingreso) y lo vincula. " +
      "Opcionalmente vincula la cuota a un finance_record EXISTENTE vía recordId (en ese caso no " +
      "se crea uno nuevo y tarjetaId/cuentaId se ignoran). Al crear el registro se puede asignar " +
      "el medio de pago: tarjetaId para gastos pagados con tarjeta, o cuentaId para la cuenta " +
      "bancaria (débito/efectivo en gastos, o cuenta destino en ingresos).",
    {
      recurringEventId: z.string().uuid().describe("ID del evento recurrente"),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
      amount: z.number().positive().describe("Monto del mes"),
      isPaid: z.boolean().optional().describe("¿Pagado? (por defecto false)"),
      paidDate: zDate
        .optional()
        .describe("Fecha de pago YYYY-MM-DD (por defecto hoy si isPaid)"),
      recordId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "ID (uuid) de un finance_record existente al que se vincula esta cuota. Si se pasa, " +
            "no se crea un registro nuevo y tarjetaId/cuentaId se ignoran (opcional)."
        ),
      tarjetaId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "Solo GASTOS: tarjeta (medio de pago) con la que se pagó la cuota. Se aplica al " +
            "finance_record creado automáticamente. Se ignora en ingresos y si se pasa recordId. " +
            "Si se envía, se limpia cuentaId (un gasto con tarjeta no mueve la cuenta hasta liquidar)."
        ),
      cuentaId: z
        .string()
        .uuid()
        .optional()
        .describe(
          "Cuenta bancaria: en GASTOS de débito/efectivo (sin tarjeta) la cuenta de la que sale el " +
            "dinero; en INGRESOS la cuenta destino a la que entra. Se aplica al finance_record creado " +
            "automáticamente. Se ignora si se pasa recordId o si se envía tarjetaId en un gasto."
        ),
      note: z.string().optional(),
    },
    async ({
      recurringEventId,
      month,
      year,
      amount,
      isPaid,
      paidDate,
      recordId,
      tarjetaId,
      cuentaId,
      note,
    }) => {
      return guard(async () => {
        const paid = isPaid ?? false;
        const effPaidDate = paid ? paidDate ?? today() : undefined;

        // Validamos las referencias de medio de pago/cuenta antes de usarlas.
        if (tarjetaId) {
          const tarjetas = await fetchTarjetas();
          if (!tarjetas.some((t) => t.id === tarjetaId))
            return fail(`No existe una tarjeta con id ${tarjetaId}`);
        }
        if (cuentaId) {
          const cuentas = await fetchCuentas();
          if (!cuentas.some((c) => c.id === cuentaId))
            return fail(`No existe una cuenta con id ${cuentaId}`);
        }

        let linkedRecordId = recordId;

        // Si la cuota queda pagada y no se vincula a un registro existente,
        // creamos el finance_record de la cuota (igual que hace la UI), heredando
        // los datos del recurrente y propagando el medio de pago/cuenta.
        if (paid && !recordId) {
          const event = (await fetchRecurringEvents()).find(
            (e) => e.id === recurringEventId
          );
          if (!event)
            return fail(`No existe un recurrente con id ${recurringEventId}`);

          const isIncome = event.type === "ingreso";
          // La tarjeta solo aplica a gastos.
          const effTarjetaId = isIncome ? undefined : tarjetaId;
          // En un gasto con tarjeta no se mueve la cuenta hasta liquidar (coherencia
          // con records.ts): si hay tarjeta, se limpia la cuenta.
          const effCuentaId = effTarjetaId ? undefined : cuentaId;

          const record = await insertRecord({
            name: event.name,
            amount,
            category: event.category,
            userId: event.userId,
            type: event.type,
            date: effPaidDate ?? today(),
            recurringEventId: event.id,
            tarjetaId: effTarjetaId,
            cuentaId: effCuentaId,
          });
          linkedRecordId = record.id;
        }

        const config = await upsertMonthConfig({
          recurringEventId,
          month,
          year,
          amount,
          isPaid: paid,
          paidDate: effPaidDate,
          recordId: linkedRecordId,
          note,
        });
        return ok(config);
      });
    }
  );

  server.tool(
    "borrar_recurrente",
    "Borra de forma definitiva un evento recurrente de recurring_events por su id. " +
      "Sus configuraciones de pago en month_payment_configs se eliminan en cascada " +
      "(lo maneja la base de datos). La acción es irreversible.",
    {
      id: z.string().uuid().describe("ID (uuid) del evento recurrente a borrar"),
    },
    async ({ id }) => {
      return guard(async () => {
        await deleteRecurringEvent(id);
        return ok({ deleted: true, id });
      });
    }
  );
}
