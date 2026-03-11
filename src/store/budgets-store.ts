import { CategoryBudget } from "@/types";
import { DEFAULT_BUDGETS, STORAGE_KEYS } from "@/lib/constants";
import { storage } from "./storage";

export function getBudgets(): CategoryBudget[] {
  return storage.get<CategoryBudget[]>(STORAGE_KEYS.BUDGETS) ?? DEFAULT_BUDGETS;
}

export function saveBudgets(budgets: CategoryBudget[]): void {
  storage.set(STORAGE_KEYS.BUDGETS, budgets);
}
