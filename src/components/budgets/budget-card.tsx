"use client";

import { Category, CategoryBudget } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { Pencil } from "lucide-react";
import {
  Car,
  HeartPulse,
  Home,
  CreditCard,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP = { Car, HeartPulse, Home, CreditCard, Wifi };

interface BudgetCardProps {
  budget: CategoryBudget;
  spent: number;
  onEdit: (category: Category) => void;
}

export function BudgetCard({ budget, spent, onEdit }: BudgetCardProps) {
  const config = CATEGORIES[budget.category];
  const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP];
  const percentage = budget.monthlyBudget > 0
    ? Math.round((spent / budget.monthlyBudget) * 100)
    : 0;

  const getBarColor = () => {
    if (percentage >= 100) return "bg-rose-500";
    if (percentage >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getTextColor = () => {
    if (percentage >= 100) return "text-rose-600";
    if (percentage >= 80) return "text-amber-600";
    return "text-emerald-600";
  };

  return (
    <div className="rounded-2xl border border-border/30 bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:bg-accent/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", config.bgLight)}>
            {Icon && <Icon className={cn("h-4 w-4", config.color.replace("bg-", "text-"))} strokeWidth={1.5} />}
          </div>
          <div>
            <p className="text-[13px] font-medium">{config.label}</p>
            <p className="text-[11px] font-mono tabular-nums text-muted-foreground/70">
              {formatCurrency(spent)} / {formatCurrency(budget.monthlyBudget)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-[13px] font-semibold font-mono tabular-nums", getTextColor())}>
            {percentage}%
          </span>
          <button
            onClick={() => onEdit(budget.category)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {/* Custom progress bar */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/50">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", getBarColor())}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
