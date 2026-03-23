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
    <div className="rounded-2xl bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.08)] transition-colors hover:bg-accent/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", config.bgLight)}>
            {Icon && <Icon className={cn("h-5 w-5", config.color.replace("bg-", "text-"))} strokeWidth={1.6} />}
          </div>
          <div>
            <p className="text-sm font-semibold">{config.label}</p>
            <p className="text-xs font-mono tabular-nums text-foreground/40">
              {formatCurrency(spent)} / {formatCurrency(budget.monthlyBudget)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-sm font-bold font-mono tabular-nums", getTextColor())}>
            {percentage}%
          </span>
          <button
            onClick={() => onEdit(budget.category)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-foreground/30 transition-colors hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {/* Custom progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", getBarColor())}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
