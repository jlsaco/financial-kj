"use client";

import { useFinance } from "@/contexts/finance-context";
import { useUI } from "@/contexts/ui-context";
import { CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { Category } from "@/types";

export function BudgetOverview() {
  const { state, getMonthSummary } = useFinance();
  const { selectedMonth, selectedYear } = useUI();
  const summary = getMonthSummary(selectedMonth, selectedYear);

  return (
    <div className="space-y-3">
      {state.budgets.map((budget) => {
        const spent = summary.byCategory[budget.category as Category] ?? 0;
        const pct = budget.monthlyBudget > 0
          ? Math.round((spent / budget.monthlyBudget) * 100)
          : 0;
        const config = CATEGORIES[budget.category as Category];

        const barColor =
          pct >= 100
            ? "bg-rose-500"
            : pct >= 80
            ? "bg-amber-500"
            : "bg-emerald-500";

        return (
          <div key={budget.category} className="flex items-center gap-3">
            <div className="w-20 text-sm font-medium text-foreground/70 truncate">
              {config?.label}
            </div>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/80">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="w-20 text-right font-mono text-xs font-medium text-foreground/50">
              {formatCurrency(spent)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
