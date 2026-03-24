import { CategoryBudget } from "@/types";
import { supabase } from "@/lib/supabase";

function toBudget(row: {
  category: string;
  monthly_budget: number;
  updated_at: string;
}): CategoryBudget {
  return {
    category: row.category as CategoryBudget["category"],
    monthlyBudget: Number(row.monthly_budget),
    updatedAt: row.updated_at,
  };
}

export async function fetchBudgets(): Promise<CategoryBudget[]> {
  const { data, error } = await supabase
    .from("category_budgets")
    .select("*");
  if (error) throw error;
  return data.map(toBudget);
}

export async function updateBudget(
  budget: CategoryBudget
): Promise<CategoryBudget> {
  const { data, error } = await supabase
    .from("category_budgets")
    .update({
      monthly_budget: budget.monthlyBudget,
      updated_at: new Date().toISOString(),
    })
    .eq("category", budget.category)
    .select()
    .single();
  if (error) throw error;
  return toBudget(data);
}
