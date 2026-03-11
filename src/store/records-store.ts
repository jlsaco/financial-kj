import { FinanceRecord } from "@/types";
import { STORAGE_KEYS } from "@/lib/constants";
import { storage } from "./storage";

export function getRecords(): FinanceRecord[] {
  return storage.get<FinanceRecord[]>(STORAGE_KEYS.RECORDS) ?? [];
}

export function saveRecords(records: FinanceRecord[]): void {
  storage.set(STORAGE_KEYS.RECORDS, records);
}
