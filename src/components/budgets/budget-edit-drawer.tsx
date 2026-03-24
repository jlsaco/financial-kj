"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFinance } from "@/contexts/finance-context";
import { Category, CategoryBudget } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

interface BudgetEditDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}

export function BudgetEditDrawer({
  open,
  onOpenChange,
  category,
}: BudgetEditDrawerProps) {
  const { state, updateBudget } = useFinance();
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (category) {
      const budget = state.budgets.find((b) => b.category === category);
      setAmount(budget?.monthlyBudget.toString() ?? "");
    }
  }, [category, state.budgets]);

  const handleSubmit = async () => {
    if (!category) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    try {
      await updateBudget({
        category,
        monthlyBudget: parsed,
        updatedAt: new Date().toISOString(),
      });
      toast.success("Presupuesto actualizado");
      onOpenChange(false);
    } catch {
      toast.error("Error al guardar");
    }
  };

  if (!category) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>
              Editar presupuesto - {CATEGORIES[category].label}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-5 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget-amount" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Presupuesto mensual</Label>
              <Input
                id="budget-amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-2xl font-semibold tabular-nums"
                inputMode="numeric"
              />
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-semibold tracking-wide active:scale-[0.98] active:translate-y-[1px] transition-all">
              Guardar
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-xl font-medium active:scale-[0.98] transition-all"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
