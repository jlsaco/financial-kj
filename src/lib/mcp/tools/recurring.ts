import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchRecurringEvents,
  insertRecurringEvent,
  upsertMonthConfig,
} from "@/store/recurring-store";
import { ok, guard, today, zCategory, zUserId } from "@/lib/mcp/shared";

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
    },
    async ({ name, category, dayOfMonth, defaultAmount, userId, isActive }) => {
      return guard(async () => {
        const event = await insertRecurringEvent({
          name,
          category,
          dayOfMonth,
          defaultAmount,
          userId,
          isActive: isActive ?? true,
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
    "registrar_pago_mes",
    "Registra/actualiza el pago de un recurrente para un mes concreto (month_payment_configs, upsert por evento+mes+año).",
    {
      recurringEventId: z.string().uuid().describe("ID del evento recurrente"),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
      amount: z.number().positive().describe("Monto del mes"),
      isPaid: z.boolean().optional().describe("¿Pagado? (por defecto false)"),
      paidDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha de pago YYYY-MM-DD (por defecto hoy si isPaid)"),
      note: z.string().optional(),
    },
    async ({ recurringEventId, month, year, amount, isPaid, paidDate, note }) => {
      return guard(async () => {
        const paid = isPaid ?? false;
        const config = await upsertMonthConfig({
          recurringEventId,
          month,
          year,
          amount,
          isPaid: paid,
          paidDate: paid ? paidDate ?? today() : undefined,
          note,
        });
        return ok(config);
      });
    }
  );
}
