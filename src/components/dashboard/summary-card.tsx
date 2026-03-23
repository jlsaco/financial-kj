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
    <div className="rounded-2xl bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.08)]">
      {/* Balance hero */}
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-foreground/40">
          Balance del mes
        </p>
        <p
          className={`mt-1.5 text-4xl font-bold tracking-tight tabular-nums font-mono ${
            summary.balance >= 0 ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          {formatCurrency(summary.balance)}
        </p>
      </div>

      {/* Income / Expense row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50/80 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15">
            <ArrowUpRight className="h-5 w-5 text-emerald-600" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-xs font-medium text-emerald-700/60">Ingresos</p>
            <p className="text-base font-bold tabular-nums font-mono text-emerald-700">
              {formatCurrency(summary.totalIncome)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-rose-50/80 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15">
            <ArrowDownRight className="h-5 w-5 text-rose-500" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-xs font-medium text-rose-600/60">Gastos</p>
            <p className="text-base font-bold tabular-nums font-mono text-rose-600">
              {formatCurrency(summary.totalExpenses)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
