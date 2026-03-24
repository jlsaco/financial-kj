import { FinanceRecord } from "@/types";
import { supabase } from "@/lib/supabase";

function toRecord(row: {
  id: string;
  name: string;
  amount: number;
  type: string;
  category: string;
  user_id: string;
  date: string;
  recurring_event_id: string | null;
  created_at: string;
  updated_at: string;
}): FinanceRecord {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    type: row.type as FinanceRecord["type"],
    category: row.category as FinanceRecord["category"],
    userId: row.user_id as FinanceRecord["userId"],
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recurringEventId: row.recurring_event_id ?? undefined,
  };
}

export async function fetchRecords(): Promise<FinanceRecord[]> {
  const { data, error } = await supabase
    .from("finance_records")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw error;
  return data.map(toRecord);
}

export async function insertRecord(
  record: Omit<FinanceRecord, "id" | "createdAt" | "updatedAt">
): Promise<FinanceRecord> {
  const { data, error } = await supabase
    .from("finance_records")
    .insert({
      name: record.name,
      amount: record.amount,
      type: record.type,
      category: record.category,
      user_id: record.userId,
      date: record.date,
      recurring_event_id: record.recurringEventId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toRecord(data);
}

export async function updateRecord(
  id: string,
  updates: Partial<FinanceRecord>
): Promise<FinanceRecord> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.recurringEventId !== undefined)
    dbUpdates.recurring_event_id = updates.recurringEventId;
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("finance_records")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toRecord(data);
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from("finance_records")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
