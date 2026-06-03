import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchRecords } from "@/store/records-store";
import { fetchBudgets } from "@/store/budgets-store";
import { ok, guard } from "@/lib/mcp/shared";
import { ALL_CATEGORIES } from "@/lib/constants";
import type { Category } from "@/types";

function inMonth(date: string, month: number, year: number): boolean {
  const [y, m] = date.split("-").map(Number);
  return y === year && m === month;
}

/** Tools de lectura/agregación: resumen del mes y estado de presupuestos. */
export function registerSummaryTools(server: McpServer): void {
  server.tool(
    "resumen_mes",
    "Resumen del mes: total de gastos, ingresos, balance y desglose de gastos por categoría.",
    {
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
    },
    async ({ month, year }) => {
      return guard(async () => {
        const records = (await fetchRecords()).filter((r) =>
          inMonth(r.date, month, year)
        );
        const gastos = records.filter((r) => r.type === "gasto");
        const ingresos = records.filter((r) => r.type === "ingreso");
        const totalGastos = gastos.reduce((s, r) => s + r.amount, 0);
        const totalIngresos = ingresos.reduce((s, r) => s + r.amount, 0);

        const porCategoria = {} as Record<Category, number>;
        for (const c of ALL_CATEGORIES) porCategoria[c] = 0;
        for (const r of gastos) porCategoria[r.category] += r.amount;

        return ok({
          month,
          year,
          totalGastos,
          totalIngresos,
          balance: totalIngresos - totalGastos,
          gastosPorCategoria: porCategoria,
          numRegistros: records.length,
        });
      });
    }
  );

  server.tool(
    "estado_presupuestos",
    "Compara el presupuesto mensual de cada categoría contra lo gastado en el mes dado.",
    {
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
    },
    async ({ month, year }) => {
      return guard(async () => {
        const [budgets, records] = await Promise.all([
          fetchBudgets(),
          fetchRecords(),
        ]);
        const gastos = records.filter(
          (r) => r.type === "gasto" && inMonth(r.date, month, year)
        );

        const estado = budgets.map((b) => {
          const gastado = gastos
            .filter((r) => r.category === b.category)
            .reduce((s, r) => s + r.amount, 0);
          return {
            category: b.category,
            presupuesto: b.monthlyBudget,
            gastado,
            restante: b.monthlyBudget - gastado,
            porcentaje:
              b.monthlyBudget > 0
                ? Math.round((gastado / b.monthlyBudget) * 100)
                : null,
          };
        });

        return ok({ month, year, estado });
      });
    }
  );
}
