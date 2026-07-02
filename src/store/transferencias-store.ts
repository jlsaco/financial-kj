import { Transferencia } from "@/types";
import { supabase } from "@/lib/supabase";

/**
 * Store de `transferencias`: movimientos internos entre dos cuentas (p.ej.
 * retiro de cajero banco → efectivo). NO son gasto ni ingreso; solo mueven
 * saldo. Viven en su propia tabla para que ningún reporte de P&L los incluya.
 */
function toTransferencia(row: {
  id: string;
  cuenta_origen_id: string;
  cuenta_destino_id: string;
  amount: number;
  date: string;
  note: string | null;
  created_at: string;
}): Transferencia {
  return {
    id: row.id,
    cuentaOrigenId: row.cuenta_origen_id,
    cuentaDestinoId: row.cuenta_destino_id,
    amount: Number(row.amount),
    date: row.date,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export async function fetchTransferencias(): Promise<Transferencia[]> {
  const { data, error } = await supabase
    .from("transferencias")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data.map(toTransferencia);
}

export async function insertTransferencia(
  t: Omit<Transferencia, "id" | "createdAt">
): Promise<Transferencia> {
  const { data, error } = await supabase
    .from("transferencias")
    .insert({
      cuenta_origen_id: t.cuentaOrigenId,
      cuenta_destino_id: t.cuentaDestinoId,
      amount: t.amount,
      date: t.date,
      note: t.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toTransferencia(data);
}

export async function deleteTransferencia(id: string): Promise<void> {
  const { error } = await supabase.from("transferencias").delete().eq("id", id);
  if (error) throw error;
}
