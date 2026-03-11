export type RecordType = "gasto" | "ingreso";

export type Category =
  | "movilidad"
  | "alimentacion-salud"
  | "hogar-entretenimiento"
  | "deuda"
  | "servicios";

export type UserId = "jose" | "karen" | "bot-correos";

export interface User {
  id: UserId;
  name: string;
  avatar: string;
  color: string;
}

export interface FinanceRecord {
  id: string;
  name: string;
  amount: number;
  type: RecordType;
  category: Category;
  userId: UserId;
  date: string;
  createdAt: string;
  updatedAt: string;
  recurringEventId?: string;
}

export interface RecurringEvent {
  id: string;
  name: string;
  category: Category;
  dayOfMonth: number;
  defaultAmount: number;
  isActive: boolean;
  userId: UserId;
  createdAt: string;
}

export interface MonthPaymentConfig {
  id: string;
  recurringEventId: string;
  month: number;
  year: number;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  recordId?: string;
  note?: string;
}

export interface CategoryBudget {
  category: Category;
  monthlyBudget: number;
  updatedAt: string;
}

export interface UpcomingEvent {
  recurringEvent: RecurringEvent;
  monthConfig: MonthPaymentConfig | null;
  dueDate: Date;
  daysUntilDue: number;
  amount: number;
}
