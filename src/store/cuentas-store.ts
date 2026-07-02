import { Cuenta } from "@/types";
import { supabase } from "@/lib/supabase";

function toCuenta(row: {
  id: string;
  name: string;
  owner: string;
  type: string;
  initial_balance: number;
  is_active: boolean;
  created_at: string;
}): Cuenta {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner as Cuenta["owner"],
    type: row.type as Cuenta["type"],
    initialBalance: Number(row.initial_balance),
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function fetchCuentas(): Promise<Cuenta[]> {
  const { data, error } = await supabase
    .from("cuentas")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(toCuenta);
}

export async function insertCuenta(
  cuenta: Omit<Cuenta, "id" | "createdAt" | "isActive" | "type"> & {
    isActive?: boolean;
    type?: Cuenta["type"];
  }
): Promise<Cuenta> {
  const { data, error } = await supabase
    .from("cuentas")
    .insert({
      name: cuenta.name,
      owner: cuenta.owner,
      type: cuenta.type ?? "bank",
      initial_balance: cuenta.initialBalance,
      is_active: cuenta.isActive ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return toCuenta(data);
}

export async function updateCuenta(
  id: string,
  updates: Partial<Cuenta>
): Promise<Cuenta> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.owner !== undefined) dbUpdates.owner = updates.owner;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.initialBalance !== undefined)
    dbUpdates.initial_balance = updates.initialBalance;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("cuentas")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toCuenta(data);
}

export async function deleteCuenta(id: string): Promise<void> {
  const { error } = await supabase.from("cuentas").delete().eq("id", id);
  if (error) throw error;
}
