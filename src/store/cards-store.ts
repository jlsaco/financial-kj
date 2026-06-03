import { Tarjeta, Liquidacion } from "@/types";
import { supabase } from "@/lib/supabase";

function toTarjeta(row: {
  id: string;
  name: string;
  owner: string;
  closing_day: number | null;
  categories: string[] | null;
  is_active: boolean;
  created_at: string;
}): Tarjeta {
  return {
    id: row.id,
    name: row.name,
    owner: row.owner as Tarjeta["owner"],
    closingDay: row.closing_day ?? undefined,
    categories: (row.categories as Tarjeta["categories"]) ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function toLiquidacion(row: {
  id: string;
  tarjeta_id: string;
  month: number;
  year: number;
  amount: number;
  is_paid: boolean;
  paid_date: string | null;
  note: string | null;
  created_at: string;
}): Liquidacion {
  return {
    id: row.id,
    tarjetaId: row.tarjeta_id,
    month: row.month,
    year: row.year,
    amount: Number(row.amount),
    isPaid: row.is_paid,
    paidDate: row.paid_date ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

/* ---------------------------- Tarjetas ---------------------------- */

export async function fetchTarjetas(): Promise<Tarjeta[]> {
  const { data, error } = await supabase
    .from("tarjetas")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(toTarjeta);
}

export async function insertTarjeta(
  tarjeta: Omit<Tarjeta, "id" | "createdAt" | "isActive"> & {
    isActive?: boolean;
  }
): Promise<Tarjeta> {
  const { data, error } = await supabase
    .from("tarjetas")
    .insert({
      name: tarjeta.name,
      owner: tarjeta.owner,
      closing_day: tarjeta.closingDay ?? null,
      categories: tarjeta.categories ?? null,
      is_active: tarjeta.isActive ?? true,
    })
    .select()
    .single();
  if (error) throw error;
  return toTarjeta(data);
}

export async function updateTarjeta(
  id: string,
  updates: Partial<Tarjeta>
): Promise<Tarjeta> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.owner !== undefined) dbUpdates.owner = updates.owner;
  if (updates.closingDay !== undefined)
    dbUpdates.closing_day = updates.closingDay ?? null;
  if (updates.categories !== undefined)
    dbUpdates.categories = updates.categories ?? null;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("tarjetas")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toTarjeta(data);
}

export async function deleteTarjeta(id: string): Promise<void> {
  const { error } = await supabase.from("tarjetas").delete().eq("id", id);
  if (error) throw error;
}

/* -------------------------- Liquidaciones ------------------------- */

export async function fetchLiquidaciones(): Promise<Liquidacion[]> {
  const { data, error } = await supabase
    .from("liquidaciones")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return data.map(toLiquidacion);
}

/**
 * Inserta o actualiza la liquidación de una tarjeta para un periodo
 * (mes/año). Clave única (tarjeta_id, month, year).
 */
export async function upsertLiquidacion(
  liq: Omit<Liquidacion, "id" | "createdAt">
): Promise<Liquidacion> {
  const { data, error } = await supabase
    .from("liquidaciones")
    .upsert(
      {
        tarjeta_id: liq.tarjetaId,
        month: liq.month,
        year: liq.year,
        amount: liq.amount,
        is_paid: liq.isPaid,
        paid_date: liq.paidDate ?? null,
        note: liq.note ?? null,
      },
      { onConflict: "tarjeta_id,month,year" }
    )
    .select()
    .single();
  if (error) throw error;
  return toLiquidacion(data);
}

/** Borra la liquidación de un periodo (deja la tarjeta como "pendiente"). */
export async function deleteLiquidacion(
  tarjetaId: string,
  month: number,
  year: number
): Promise<void> {
  const { error } = await supabase
    .from("liquidaciones")
    .delete()
    .eq("tarjeta_id", tarjetaId)
    .eq("month", month)
    .eq("year", year);
  if (error) throw error;
}
