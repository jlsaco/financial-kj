"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useFinance } from "@/contexts/finance-context";
import { useUI } from "@/contexts/ui-context";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

export function SummaryCard() {
  const { getMonthSummary } = useFinance();
  const { selectedMonth, selectedYear } = useUI();
  const summary = getMonthSummary(selectedMonth, selectedYear);

  return (
    <Card>
      <CardContent className="grid grid-cols-3 gap-4 py-4">
        <div className="text-center">
          <TrendingUp className="mx-auto mb-1 h-5 w-5 text-green-600" />
          <p className="text-xs text-muted-foreground">Ingresos</p>
          <p className="text-sm font-bold text-green-600">
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>
        <div className="text-center">
          <TrendingDown className="mx-auto mb-1 h-5 w-5 text-red-600" />
          <p className="text-xs text-muted-foreground">Gastos</p>
          <p className="text-sm font-bold text-red-600">
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>
        <div className="text-center">
          <Wallet className="mx-auto mb-1 h-5 w-5 text-primary" />
          <p className="text-xs text-muted-foreground">Balance</p>
          <p
            className={`text-sm font-bold ${
              summary.balance >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(summary.balance)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
