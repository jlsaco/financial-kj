export type RecordType = "gasto" | "ingreso";

export type Category =
  | "movilidad"
  | "alimentacion-salud"
  | "hogar-entretenimiento"
  | "deuda"
  | "servicios"
  | "entretenimiento"
  | "gastos-financieros";

export type UserId = "jose" | "karen" | "bot-correos";

/** Tipo lógico de una cuenta: bancaria o efectivo (bolsa de dinero físico). */
export type CuentaType = "bank" | "cash";

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

/** Un release publicado en GitHub (historial de versiones de la app). */
export interface Release {
  id: number;
  /** Tag de la versión, p. ej. "v1.2.0". */
  tagName: string;
  /** Nombre del release (puede coincidir con el tag). */
  name: string | null;
  /** Notas del release (changelog en Markdown), puede venir vacío. */
  body: string | null;
  /** URL pública del release en GitHub. */
  url: string;
  /** Fecha de publicación (ISO) o null si es borrador. */
  publishedAt: string | null;
  isPrerelease: boolean;
  isDraft: boolean;
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
  /** Cuenta afectada: ingresos (entra) y gastos de débito/efectivo (sale). */
  cuentaId?: string;
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
  /** Tarjeta a la que pertenece (F4): su cuota del mes entra en la liquidación. */
  tarjetaId?: string;
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
  /** Cuenta desde la que se paga el estado de cuenta de esta tarjeta. */
  cuentaPagoId?: string;
}

/** Cuenta bancaria / efectivo. */
export interface Cuenta {
  id: string;
  name: string;
  owner: UserId;
  /** Tipo lógico: bank (bancaria) o cash (efectivo). Por defecto bank. */
  type: CuentaType;
  /** Saldo inicial (punto de partida del cálculo). */
  initialBalance: number;
  isActive: boolean;
  createdAt: string;
}

/** Saldo calculado de una cuenta (UI/MCP). */
export interface CuentaSaldo {
  cuenta: Cuenta;
  /**
   * Saldo actual = inicial + ingresos − gastos débito/efectivo − liquidaciones
   * + transferencias recibidas − transferencias enviadas.
   */
  balance: number;
  totalIngresos: number;
  totalGastos: number;
  totalLiquidaciones: number;
  /** Total recibido por transferencias de otras cuentas. */
  totalTransferenciasEntrada: number;
  /** Total enviado por transferencias a otras cuentas. */
  totalTransferenciasSalida: number;
}

/**
 * Transferencia interna entre dos cuentas (p.ej. retiro de cajero: banco →
 * efectivo). NO es gasto ni ingreso: solo mueve saldo de una cuenta a otra, por
 * lo que no aparece en resumen_mes, presupuestos ni reportes de gastos/ingresos.
 */
export interface Transferencia {
  id: string;
  /** Cuenta de la que sale el dinero (resta de su saldo). */
  cuentaOrigenId: string;
  /** Cuenta a la que entra el dinero (suma a su saldo). */
  cuentaDestinoId: string;
  amount: number;
  /** Fecha del movimiento (YYYY-MM-DD). */
  date: string;
  note?: string;
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
  /** Cuenta desde la que se pagó (resta del saldo). */
  cuentaId?: string;
}

/**
 * Estado de una tarjeta en un mes (computado en la UI/MCP). Separa el gasto
 * REAL ya registrado de la PROYECCIÓN de recurrentes aún sin registrar (#57).
 */
export interface TarjetaMonthStatus {
  tarjeta: Tarjeta;
  month: number;
  year: number;
  /** Gastado real: solo `finance_records` ya registrados con la tarjeta. */
  owed: number;
  /** Nº de gastos reales registrados en el periodo. */
  recordsCount: number;
  /** Proyección: cuotas de recurrentes vinculados aún NO registrados este mes. */
  pendingCuota: number;
  /** Nº de recurrentes pendientes incluidos en la proyección. */
  pendingCount: number;
  /** Total proyectado = `owed + pendingCuota` (si se pagan los pendientes). */
  proyectado: number;
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
  /** true si el recurrente ya venció este mes y no se ha registrado el pago. */
  isOverdue: boolean;
}

/** Estado de pago de un recurrente en el mes en curso. */
export type RecurringPaymentStatus = "overdue" | "upcoming" | "paid";

/** Recurrente clasificado por su estado de pago del mes actual (UI/MCP). */
export interface ClassifiedRecurring {
  event: RecurringEvent;
  status: RecurringPaymentStatus;
  dueDate: Date;
  isPaid: boolean;
  amount: number;
}

/** Recurrentes agrupados por estado de pago del mes en curso. */
export interface ClassifiedRecurringGroups {
  overdue: ClassifiedRecurring[];
  upcoming: ClassifiedRecurring[];
  paid: ClassifiedRecurring[];
}
