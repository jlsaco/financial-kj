import { MonthPaymentConfig, RecurringEvent } from "@/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { storage } from "./storage";

export function getRecurringEvents(): RecurringEvent[] {
  return storage.get<RecurringEvent[]>(STORAGE_KEYS.RECURRING_EVENTS) ?? [];
}

export function saveRecurringEvents(events: RecurringEvent[]): void {
  storage.set(STORAGE_KEYS.RECURRING_EVENTS, events);
}

export function getMonthConfigs(): MonthPaymentConfig[] {
  return storage.get<MonthPaymentConfig[]>(STORAGE_KEYS.MONTH_CONFIGS) ?? [];
}

export function saveMonthConfigs(configs: MonthPaymentConfig[]): void {
  storage.set(STORAGE_KEYS.MONTH_CONFIGS, configs);
}
