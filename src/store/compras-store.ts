import { CompraDiferida, FinanceRecord } from "@/types";
import { supabase } from "@/lib/supabase";
import { computeInstallmentSchedule } from "@/lib/compra-helpers";

function toCompra(row: {
  id: string;
  name: string;
  category: string;
  user_id: string;
  tarjeta_id: string | null;
  total_amount: number;
  installments_count: number;
  interest_rate: number | null;
  start_date: string;
  created_at: string;
}): CompraDiferida {
  return {
    id: row.id,
    name: row.name,
    category: row.category as CompraDiferida["category"],
    userId: row.user_id as CompraDiferida["userId"],
    tarjetaId: row.tarjeta_id ?? undefined,
    totalAmount: Number(row.total_amount),
    installmentsCount: row.installments_count,
    interestRate: row.interest_rate ?? undefined,
    startDate: row.start_date,
    createdAt: row.created_at,
  };
}

export async function fetchComprasDiferidas(): Promise<CompraDiferida[]> {
  const { data, error } = await supabase
    .from("compras_diferidas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toCompra);
}

/**
 * Crea una compra diferida (padre) y genera sus N cuotas como `finance_records`
 * hijos (uno por mes). Cada cuota hereda categoría, usuario y tarjeta del padre.
 * Devuelve el padre creado.
 */
export async function insertCompraDiferida(
  compra: Omit<CompraDiferida, "id" | "createdAt">
): Promise<CompraDiferida> {
  const { data: parent, error: parentError } = await supabase
    .from("compras_diferidas")
    .insert({
      name: compra.name,
      category: compra.category,
      user_id: compra.userId,
      tarjeta_id: compra.tarjetaId ?? null,
      total_amount: compra.totalAmount,
      installments_count: compra.installmentsCount,
      interest_rate: compra.interestRate ?? null,
      start_date: compra.startDate,
    })
    .select()
    .single();
  if (parentError) throw parentError;

  const schedule = computeInstallmentSchedule(
    compra.startDate,
    compra.installmentsCount,
    compra.totalAmount
  );

  const children = schedule.map((inst) => ({
    name: `${compra.name} (cuota ${inst.index}/${compra.installmentsCount})`,
    amount: inst.amount,
    type: "gasto" as const,
    category: compra.category,
    user_id: compra.userId,
    date: inst.date,
    tarjeta_id: compra.tarjetaId ?? null,
    compra_diferida_id: parent.id,
    installment_no: inst.index,
  }));

  const { error: childError } = await supabase
    .from("finance_records")
    .insert(children);
  if (childError) {
    // Compensación: si fallan las cuotas, no dejamos el padre huérfano.
    await supabase.from("compras_diferidas").delete().eq("id", parent.id);
    throw childError;
  }

  return toCompra(parent);
}

/** Borra una compra diferida y, en cascada, todas sus cuotas (finance_records). */
export async function deleteCompraDiferida(id: string): Promise<void> {
  const { error } = await supabase
    .from("compras_diferidas")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
