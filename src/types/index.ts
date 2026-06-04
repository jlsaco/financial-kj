export type RecordType = "gasto" | "ingreso";

export type Category =
  | "movilidad"
  | "alimentacion-salud"
  | "hogar-entretenimiento"
  | "deuda"
  | "servicios";

export type UserId = "jose" | "karen" | "bot-correos";

export type IssueKind = "bug" | "mejora";

export type IssueState = "open" | "closed";

export interface Issue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: IssueState;
  /** "completed" | "not_planned" for closed issues, null when open */
  stateReason: string | null;
  labels: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
}

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
  /** Tarjeta (medio de pago) con la que se pagó. undefined = débito/efectivo. */
  tarjetaId?: string;
  /** Si es una cuota de una compra diferida, apunta a su padre. */
  compraDiferidaId?: string;
  /** Número de cuota (1..N) dentro de la compra diferida. */
  installmentNo?: number;
}

export interface RecurringEvent {
  id: string;
  name: string;
  /** Tipo del recurrente. Las deudas (category === 'deuda') siempre son 'gasto'. */
  type: RecordType;
  category: Category;
  dayOfMonth: number;
  defaultAmount: number;
  isActive: boolean;
  userId: UserId;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  /** Campos de deuda (solo cuando category === 'deuda'). */
  totalAmount?: number;
  principalAmount?: number;
  interestRate?: number;
  installmentsCount?: number;
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

/**
 * Compra grande diferida en cuotas (casa, viajes…). Genera N gastos hijos
 * (uno por mes), cada uno con su tarjeta y fecha, de modo que cada cuota pesa
 * solo en su mes (rubro + liquidación de la tarjeta).
 */
export interface CompraDiferida {
  id: string;
  name: string;
  category: Category;
  userId: UserId;
  /** Tarjeta con la que se difiere. undefined = sin tarjeta. */
  tarjetaId?: string;
  /** Total a pagar (capital + intereses). La cuota = total ÷ cuotas. */
  totalAmount: number;
  installmentsCount: number;
  /** % de interés (opcional, informativo). */
  interestRate?: number;
  /** Fecha de la primera cuota (YYYY-MM-DD). */
  startDate: string;
  createdAt: string;
}

/** Resumen de una compra diferida calculado a partir de sus cuotas (hijos). */
export interface CompraDiferidaSummary {
  compra: CompraDiferida;
  installmentAmount: number;
  paidCount: number;
  remainingCount: number;
  paidAmount: number;
  pendingAmount: number;
  /** Próxima cuota no liquidada (fecha) o null si está todo pagado. */
  nextDueDate: string | null;
  endDate: string;
}

/** Tarjeta de crédito usada como medio de pago. */
export interface Tarjeta {
  id: string;
  name: string;
  /** Dueño de la tarjeta. */
  owner: UserId;
  /** Día de corte/pago del mes (1-31), opcional. */
  closingDay?: number;
  /** Rubros asociados (informativo): ej. ["alimentacion-salud"]. */
  categories?: Category[];
  isActive: boolean;
  createdAt: string;
}

/**
 * Liquidación (pago) del estado de cuenta de una tarjeta para un periodo
 * (mes/año). NO es un gasto: solo registra que ese periodo quedó pagado.
 */
export interface Liquidacion {
  id: string;
  tarjetaId: string;
  month: number;
  year: number;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  note?: string;
  createdAt: string;
}

/**
 * Estado de liquidación de una tarjeta en un mes (computado en la UI/MCP):
 * cuánto se gastó con la tarjeta ese mes y si ya se liquidó.
 */
export interface TarjetaMonthStatus {
  tarjeta: Tarjeta;
  month: number;
  year: number;
  /** Suma de gastos pagados con esta tarjeta en el periodo. */
  owed: number;
  /** Nº de gastos del periodo. */
  recordsCount: number;
  /** Liquidación registrada para el periodo (si existe). */
  liquidacion: Liquidacion | null;
  /** true si hay liquidación con isPaid. */
  isPaid: boolean;
}

export interface UpcomingEvent {
  recurringEvent: RecurringEvent;
  monthConfig: MonthPaymentConfig | null;
  dueDate: Date;
  daysUntilDue: number;
  amount: number;
}
