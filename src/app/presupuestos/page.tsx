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
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total gastado</p>
                <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Presupuesto total</p>
                <p className="text-xl font-bold">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span
                className={`text-sm font-medium ${
                  totalBudget - totalSpent >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {totalBudget - totalSpent >= 0 ? "Disponible: " : "Excedido: "}
                {formatCurrency(Math.abs(totalBudget - totalSpent))}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Budget cards */}
        {state.budgets.map((budget) => (
          <BudgetCard
            key={budget.category}
            budget={budget}
            spent={summary.byCategory[budget.category] ?? 0}
            onEdit={handleEdit}
          />
        ))}
      </div>

      <BudgetEditDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        category={editCategory}
      />
    </div>
  );
}
