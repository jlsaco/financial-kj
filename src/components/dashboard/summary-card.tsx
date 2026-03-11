"use client";

import { useFinance } from "@/contexts/finance-context";
import { useUI } from "@/contexts/ui-context";
import { formatCurrency } from "@/lib/formatters";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function SummaryCard() {
  const { getMonthSummary } = useFinance();
  const { selectedMonth, selectedYear } = useUI();
  const summary = getMonthSummary(selectedMonth, selectedYear);

  return (
    <div className="rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-4px_rgba(0,0,0,0.06)] border border-border/30">
      {/* Balance hero */}
      <div className="mb-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
          Balance del mes
        </p>
        <p
          className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${
            summary.balance >= 0 ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {formatCurrency(summary.balance)}
        </p>
      </div>

      {/* Income / Expense row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50/60 px-3 py-2.5 border border-emerald-100/80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/10">
            <ArrowUpRight className="h-4 w-4 text-emerald-600" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[11px] text-emerald-700/70">Ingresos</p>
            <p className="text-sm font-semibold tabular-nums text-emerald-700">
              {formatCurrency(summary.totalIncome)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl bg-rose-50/60 px-3 py-2.5 border border-rose-100/80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
            <ArrowDownRight className="h-4 w-4 text-rose-500" strokeWidth={2} />
          </div>
          <div>
            <p className="text-[11px] text-rose-600/70">Gastos</p>
            <p className="text-sm font-semibold tabular-nums text-rose-600">
              {formatCurrency(summary.totalExpenses)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
