import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchRecurringEvents,
  insertRecurringEvent,
  updateRecurringEvent,
  upsertMonthConfig,
  deleteRecurringEvent,
} from "@/store/recurring-store";
import { computeDebtEndDate } from "@/lib/debt-helpers";
import { ok, fail, guard, today, zCategory, zUserId } from "@/lib/mcp/shared";

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
    "Crea un evento recurrente (p.ej. arriendo, suscripción) en recurring_events.",
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
    "Lista los eventos recurrentes (recurring_events).",
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
    "actualizar_recurrente",
    "Actualiza campos de un evento recurrente existente (recurring_events) por su id. " +
      "Solo se modifican los campos enviados; el resto se conserva. Permite editar " +
      "las fechas de inicio/fin del recurrente. Para deudas (category='deuda') admite " +
      "los campos totalAmount/principalAmount/interestRate/installmentsCount; si se " +
      "cambia startDate o installmentsCount se recalcula automáticamente la end_date " +
      "(inicio + (cuotas − 1) meses en el día del mes).",
    {
      id: z.string().uuid().describe("ID (uuid) del evento recurrente a actualizar"),
      name: z.string().optional().describe("Nuevo nombre"),
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

        const isDebt = (category ?? existing.category) === "deuda";

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
      "upsert por evento+mes+año). Opcionalmente vincula la cuota a un finance_record " +
      "existente vía recordId.",
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
          "ID (uuid) de un finance_record existente al que se vincula esta cuota (opcional)"
        ),
      note: z.string().optional(),
    },
    async ({ recurringEventId, month, year, amount, isPaid, paidDate, recordId, note }) => {
      return guard(async () => {
        const paid = isPaid ?? false;
        const config = await upsertMonthConfig({
          recurringEventId,
          month,
          year,
          amount,
          isPaid: paid,
          paidDate: paid ? paidDate ?? today() : undefined,
          recordId,
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
