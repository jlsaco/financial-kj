import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchRecords, insertRecord } from "@/store/records-store";
import { insertRecurringEvent } from "@/store/recurring-store";
import { ok, guard, today, zUserId } from "@/lib/mcp/shared";

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
    "Crea una deuda con cuota mensual (recurring_events con category='deuda').",
    {
      name: z.string().describe("Nombre, p.ej. 'Cuota carro'"),
      dayOfMonth: z.number().int().min(1).max(31).describe("Día de cobro de la cuota"),
      defaultAmount: z.number().positive().describe("Valor de la cuota mensual"),
      userId: zUserId,
    },
    async ({ name, dayOfMonth, defaultAmount, userId }) => {
      return guard(async () => {
        const event = await insertRecurringEvent({
          name,
          category: "deuda",
          dayOfMonth,
          defaultAmount,
          userId,
          isActive: true,
        });
        return ok(event);
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
