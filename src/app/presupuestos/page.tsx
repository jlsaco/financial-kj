"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BudgetCard } from "@/components/budgets/budget-card";
import { BudgetEditDrawer } from "@/components/budgets/budget-edit-drawer";
import { useFinance } from "@/contexts/finance-context";
import { useUI } from "@/contexts/ui-context";
import { Category } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";

export default function PresupuestosPage() {
  const { state, getMonthSummary } = useFinance();
  const { selectedMonth, selectedYear } = useUI();
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const summary = getMonthSummary(selectedMonth, selectedYear);

  const totalBudget = state.budgets.reduce((s, b) => s + b.monthlyBudget, 0);
  const totalSpent = Object.values(summary.byCategory).reduce((s, v) => s + v, 0);

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    setDrawerOpen(true);
  };

  if (!state.isLoaded) {
    return (
      <div>
        <PageHeader title="Presupuestos" showMonthNav />
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Presupuestos" showMonthNav />

      <div className="space-y-4 p-4">
        {/* Total summary */}
        <div className="rounded-2xl bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-4px_rgba(0,0,0,0.06)] border border-border/30">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Total gastado</p>
              <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums font-mono">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Presupuesto</p>
              <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums font-mono">{formatCurrency(totalBudget)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border/30 text-center">
            <span
              className={`text-[13px] font-semibold tabular-nums ${
                totalBudget - totalSpent >= 0 ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {totalBudget - totalSpent >= 0 ? "Disponible: " : "Excedido: "}
              {formatCurrency(Math.abs(totalBudget - totalSpent))}
            </span>
          </div>
        </div>

        {/* Budget cards */}
        <div className="space-y-3">
          {state.budgets.map((budget) => (
            <BudgetCard
              key={budget.category}
              budget={budget}
              spent={summary.byCategory[budget.category] ?? 0}
              onEdit={handleEdit}
            />
          ))}
        </div>
      </div>

      <BudgetEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        category={editCategory}
      />
    </div>
  );
}
