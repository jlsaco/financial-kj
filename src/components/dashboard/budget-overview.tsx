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
    <div className="space-y-3">
      {state.budgets.map((budget) => {
        const spent = summary.byCategory[budget.category as Category] ?? 0;
        const pct = budget.monthlyBudget > 0
          ? Math.round((spent / budget.monthlyBudget) * 100)
          : 0;
        const config = CATEGORIES[budget.category as Category];

        return (
          <div key={budget.category} className="flex items-center gap-3">
            <div className="w-20 text-xs font-medium truncate">
              {config?.label}
            </div>
            <Progress value={Math.min(pct, 100)} className="h-2 flex-1" />
            <div className="w-20 text-right text-xs text-muted-foreground">
              {formatCurrency(spent)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
