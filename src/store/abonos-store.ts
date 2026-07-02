import { AbonoCapital } from "@/types";
import { supabase } from "@/lib/supabase";

function toAbono(row: {
  id: string;
  recurring_event_id: string | null;
  compra_diferida_id: string | null;
  amount: number;
  date: string;
  effect: string;
  note: string | null;
  created_at: string;
}): AbonoCapital {
  return {
    id: row.id,
    recurringEventId: row.recurring_event_id ?? undefined,
    compraDiferidaId: row.compra_diferida_id ?? undefined,
    amount: Number(row.amount),
    date: row.date,
    effect: row.effect as AbonoCapital["effect"],
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchAbonos(): Promise<AbonoCapital[]> {
  const { data, error } = await supabase
    .from("abonos_capital")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data.map(toAbono);
}

export async function insertAbono(
  abono: Omit<AbonoCapital, "id" | "createdAt">
): Promise<AbonoCapital> {
  const { data, error } = await supabase
    .from("abonos_capital")
    .insert({
      recurring_event_id: abono.recurringEventId ?? null,
      compra_diferida_id: abono.compraDiferidaId ?? null,
      amount: abono.amount,
      date: abono.date,
      effect: abono.effect,
      note: abono.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toAbono(data);
}

export async function deleteAbono(id: string): Promise<void> {
  const { error } = await supabase.from("abonos_capital").delete().eq("id", id);
  if (error) throw error;
}
