"use client";

import { useFinance } from "@/contexts/finance-context";
import { useUI } from "@/contexts/ui-context";
import { CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { Progress } from "@/components/ui/progress";
import { Category } from "@/types";

export function BudgetOverview() {
  const { state, getMonthSummary } = useFinance();
  const { selectedMonth, selectedYear } = useUI();
  const summary = getMonthSummary(selectedMonth, selectedYear);

  return (
    <div className="space-y-2.5">
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
            <div className="w-16 text-[11px] font-medium text-muted-foreground truncate">
              {config?.label}
            </div>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className="w-16 text-right font-mono text-[11px] text-muted-foreground">
              {formatCurrency(spent)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
