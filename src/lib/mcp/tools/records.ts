import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchRecords, insertRecord, deleteRecord } from "@/store/records-store";
import { ok, guard, today, zCategory, zUserId, zRecordType } from "@/lib/mcp/shared";

/** Tools over `finance_records` (gastos e ingresos). */
export function registerRecordTools(server: McpServer): void {
  server.tool(
    "crear_gasto",
    "Registra un gasto en finance_records.",
    {
      name: z.string().describe("Descripción del gasto, p.ej. 'Mercado Éxito'"),
      amount: z.number().positive().describe("Monto en pesos (positivo)"),
      category: zCategory,
      userId: zUserId.describe("Quién hizo el gasto"),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha YYYY-MM-DD (por defecto hoy)"),
    },
    async ({ name, amount, category, userId, date }) => {
      return guard(async () => {
        const record = await insertRecord({
          name,
          amount,
          category,
          userId,
          type: "gasto",
          date: date ?? today(),
        });
        return ok(record);
      });
    }
  );

  server.tool(
    "crear_ingreso",
    "Registra un ingreso en finance_records.",
    {
      name: z.string().describe("Descripción del ingreso, p.ej. 'Salario'"),
      amount: z.number().positive().describe("Monto en pesos (positivo)"),
      category: zCategory,
      userId: zUserId.describe("A quién corresponde el ingreso"),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha YYYY-MM-DD (por defecto hoy)"),
    },
    async ({ name, amount, category, userId, date }) => {
      return guard(async () => {
        const record = await insertRecord({
          name,
          amount,
          category,
          userId,
          type: "ingreso",
          date: date ?? today(),
        });
        return ok(record);
      });
    }
  );

  server.tool(
    "listar_gastos",
    "Lista registros de finance_records con filtros opcionales por mes, año, categoría, usuario y tipo.",
    {
      month: z.number().int().min(1).max(12).optional().describe("Mes 1-12"),
      year: z.number().int().min(2000).max(2100).optional(),
      category: zCategory.optional(),
      userId: zUserId.optional(),
      type: zRecordType.optional(),
    },
    async ({ month, year, category, userId, type }) => {
      return guard(async () => {
        let records = await fetchRecords();
        records = records.filter((r) => {
          const [ry, rm] = r.date.split("-").map(Number);
          if (year !== undefined && ry !== year) return false;
          if (month !== undefined && rm !== month) return false;
          if (category !== undefined && r.category !== category) return false;
          if (userId !== undefined && r.userId !== userId) return false;
          if (type !== undefined && r.type !== type) return false;
          return true;
        });
        const total = records.reduce(
          (sum, r) => sum + (r.type === "gasto" ? r.amount : 0),
          0
        );
        return ok({ count: records.length, totalGastos: total, records });
      });
    }
  );

  server.tool(
    "borrar_registro",
    "Borra de forma definitiva un registro de finance_records por su id. " +
      "Como las deudas son registros con category='deuda', esta tool también " +
      "sirve para borrar deudas. La acción es irreversible.",
    {
      id: z.string().uuid().describe("ID (uuid) del registro a borrar"),
    },
    async ({ id }) => {
      return guard(async () => {
        await deleteRecord(id);
        return ok({ deleted: true, id });
      });
    }
  );
}
