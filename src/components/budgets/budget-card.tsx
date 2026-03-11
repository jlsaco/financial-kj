"use client";

import { Category, CategoryBudget } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Car,
  Apple,
  Home,
  CreditCard,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP = { Car, Apple, Home, CreditCard, Zap };

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

  const getStatusColor = () => {
    if (percentage >= 100) return "text-red-600";
    if (percentage >= 80) return "text-amber-600";
    return "text-green-600";
  };

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white", config.color)}>
              {Icon && <Icon className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(spent)} / {formatCurrency(budget.monthlyBudget)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-bold", getStatusColor())}>
              {percentage}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(budget.category)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress
          value={Math.min(percentage, 100)}
          className="mt-3 h-2"
        />
      </CardContent>
    </Card>
  );
}
