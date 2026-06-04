import { RecurringEvent, MonthPaymentConfig } from "@/types";
import { supabase } from "@/lib/supabase";

function toEvent(row: {
  id: string;
  name: string;
  category: string;
  day_of_month: number;
  default_amount: number;
  is_active: boolean;
  user_id: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  total_amount: number | null;
  principal_amount: number | null;
  interest_rate: number | null;
  installments_count: number | null;
  tarjeta_id?: string | null;
}): RecurringEvent {
  return {
    id: row.id,
    name: row.name,
    category: row.category as RecurringEvent["category"],
    dayOfMonth: row.day_of_month,
    defaultAmount: Number(row.default_amount),
    isActive: row.is_active,
    userId: row.user_id as RecurringEvent["userId"],
    createdAt: row.created_at,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    totalAmount: row.total_amount != null ? Number(row.total_amount) : undefined,
    principalAmount:
      row.principal_amount != null ? Number(row.principal_amount) : undefined,
    interestRate:
      row.interest_rate != null ? Number(row.interest_rate) : undefined,
    installmentsCount: row.installments_count ?? undefined,
    tarjetaId: row.tarjeta_id ?? undefined,
  };
}

function toConfig(row: {
  id: string;
  recurring_event_id: string;
  month: number;
  year: number;
  amount: number;
  is_paid: boolean;
  paid_date: string | null;
  record_id: string | null;
  note: string | null;
}): MonthPaymentConfig {
  return {
    id: row.id,
    recurringEventId: row.recurring_event_id,
    month: row.month,
    year: row.year,
    amount: Number(row.amount),
    isPaid: row.is_paid,
    paidDate: row.paid_date ?? undefined,
    recordId: row.record_id ?? undefined,
    note: row.note ?? undefined,
  };
}

export async function fetchRecurringEvents(): Promise<RecurringEvent[]> {
  const { data, error } = await supabase
    .from("recurring_events")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toEvent);
}

export async function insertRecurringEvent(
  event: Omit<RecurringEvent, "id" | "createdAt">
): Promise<RecurringEvent> {
  const { data, error } = await supabase
    .from("recurring_events")
    .insert({
      name: event.name,
      category: event.category,
      day_of_month: event.dayOfMonth,
      default_amount: event.defaultAmount,
      is_active: event.isActive,
      user_id: event.userId,
      start_date: event.startDate ?? null,
      end_date: event.endDate ?? null,
      total_amount: event.totalAmount ?? null,
      principal_amount: event.principalAmount ?? null,
      interest_rate: event.interestRate ?? null,
      installments_count: event.installmentsCount ?? null,
      tarjeta_id: event.tarjetaId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return toEvent(data);
}

export async function updateRecurringEvent(
  id: string,
  updates: Partial<RecurringEvent>
): Promise<RecurringEvent> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.dayOfMonth !== undefined) dbUpdates.day_of_month = updates.dayOfMonth;
  if (updates.defaultAmount !== undefined) dbUpdates.default_amount = updates.defaultAmount;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.userId !== undefined) dbUpdates.user_id = updates.userId;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate || null;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate || null;
  if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount ?? null;
  if (updates.principalAmount !== undefined) dbUpdates.principal_amount = updates.principalAmount ?? null;
  if (updates.interestRate !== undefined) dbUpdates.interest_rate = updates.interestRate ?? null;
  if (updates.installmentsCount !== undefined) dbUpdates.installments_count = updates.installmentsCount ?? null;
  if ("tarjetaId" in updates) dbUpdates.tarjeta_id = updates.tarjetaId ?? null;

  const { data, error } = await supabase
    .from("recurring_events")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toEvent(data);
}

export async function deleteRecurringEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from("recurring_events")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function fetchMonthConfigs(): Promise<MonthPaymentConfig[]> {
  const { data, error } = await supabase
    .from("month_payment_configs")
    .select("*");
  if (error) throw error;
  return data.map(toConfig);
}

export async function upsertMonthConfig(
  config: Omit<MonthPaymentConfig, "id">
): Promise<MonthPaymentConfig> {
  const { data, error } = await supabase
    .from("month_payment_configs")
    .upsert(
      {
        recurring_event_id: config.recurringEventId,
        month: config.month,
        year: config.year,
        amount: config.amount,
        is_paid: config.isPaid,
        paid_date: config.paidDate ?? null,
        record_id: config.recordId ?? null,
        note: config.note ?? null,
      },
      { onConflict: "recurring_event_id,month,year" }
    )
    .select()
    .single();
  if (error) throw error;
  return toConfig(data);
}
