import { AbonoCapital, MonthPaymentConfig, RecurringEvent } from "@/types";
import { getCurrentMonthYear, getEffectiveDayOfMonth } from "@/lib/date-helpers";
import {
  computeAmortization,
  abonoAfterInstallment,
  outstandingPrincipalByCount,
  type AmortizationInput,
  type AmortizationResult,
  type AmortizationAbono,
  type RateSource,
} from "@/lib/amortization";

export interface NextInstallment {
  month: number;
  year: number;
  /** Fecha efectiva de vencimiento 'YYYY-MM-DD'. */
  dueDate: string;
  /** Monto real de esa cuota (config personalizada o el por defecto). */
  amount: number;
}

/**
 * Próxima cuota PENDIENTE (no pagada) de cualquier recurrente, desde el mes en
 * curso hacia adelante. Es el valor que debe destacarse en la lista/card y no
 * el `defaultAmount` (que en deudas es solo un promedio inicial).
 *
 * - Deudas (category==='deuda'): se apoya en el cronograma de cuotas
 *   (`getDebtSummary`), respetando montos personalizados por mes.
 * - Otros recurrentes: primer mes no pagado desde el mes actual (o desde la
 *   primera cuota si `startDate` es futura), acotado por `endDate` si existe.
 *
 * El monto es el de la `MonthPaymentConfig` del mes si está personalizado, o el
 * `defaultAmount` del recurrente en su defecto. Devuelve null si no hay ninguna
 * cuota pendiente (p.ej. deuda saldada o recurrente ya vencido sin más meses).
 */
export function getNextInstallment(
  event: RecurringEvent,
  configs: MonthPaymentConfig[]
): NextInstallment | null {
  if (event.category === "deuda") {
    const ni = getDebtSummary(event, configs).nextInstallment;
    if (!ni) return null;
    return {
      month: ni.month,
      year: ni.year,
      dueDate: ni.dueDate,
      amount: ni.amount,
    };
  }

  const eventConfigs = configs.filter((c) => c.recurringEventId === event.id);
  const configFor = (month: number, year: number) =>
    eventConfigs.find((c) => c.month === month && c.year === year);

  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const curIdx = curYear * 12 + (curMonth - 1);

  // Punto de partida: el mes actual o la primera cuota si `startDate` es futura.
  let startIdx = curIdx;
  if (event.startDate) {
    const [y, m] = event.startDate.split("-").map(Number);
    if (y && m) startIdx = Math.max(curIdx, y * 12 + (m - 1));
  }

  // Tope: `endDate` si existe; si no, una ventana amplia (50 años) para no
  // iterar indefinidamente en recurrentes sin fin.
  let endIdx = startIdx + 600;
  if (event.endDate) {
    const [y, m] = event.endDate.split("-").map(Number);
    if (y && m) endIdx = y * 12 + (m - 1);
  }

  for (let idx = startIdx; idx <= endIdx; idx++) {
    const year = Math.floor(idx / 12);
    const month = (idx % 12) + 1;
    const config = configFor(month, year);
    if (config?.isPaid) continue;
    const day = getEffectiveDayOfMonth(event.dayOfMonth, month, year);
    return {
      month,
      year,
      dueDate: toDateString(year, month, day),
      amount: config?.amount ?? event.defaultAmount,
    };
  }

  return null;
}

/**
 * Helpers puros (sin acceso a BD) para deudas con cuotas.
 *
 * Una deuda es un `recurring_events` con `category='deuda'` y los campos extra
 * `totalAmount`, `principalAmount`, `interestRate`, `installmentsCount`. El
 * cronograma de cuotas se deriva de `startDate` (o el mes actual si no hay) y
 * el nº de cuotas; cada cuota cae en el `dayOfMonth` (recortado al último día
 * del mes cuando aplica).
 *
 * Todas las fechas se construyen como cadenas 'YYYY-MM-DD' por partes para
 * evitar desfases de zona horaria (no se usa `toISOString()`).
 */

/** Suma `offset` meses a (month, year) normalizando el desbordamiento. */
export function addMonths(
  month: number,
  year: number,
  offset: number
): { month: number; year: number } {
  let m = month + offset;
  let y = year;
  while (m < 1) {
    m += 12;
    y--;
  }
  while (m > 12) {
    m -= 12;
    y++;
  }
  return { month: m, year: y };
}

/** Construye 'YYYY-MM-DD' por partes (sin Date/UTC) para evitar desfases TZ. */
export function toDateString(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Mes/año de inicio del cronograma: `startDate` o el mes actual si no hay. */
export function getDebtStartMonthYear(event: RecurringEvent): {
  month: number;
  year: number;
} {
  if (event.startDate) {
    const [y, m] = event.startDate.split("-").map(Number);
    return { month: m, year: y };
  }
  return getCurrentMonthYear();
}

/**
 * Calcula la `end_date` (YYYY-MM-DD) de una deuda: inicio + (cuotas − 1) meses,
 * en el día del mes (recortado). Si no hay `start`, usa el mes actual.
 * Devuelve null si no hay cuotas válidas.
 */
export function computeDebtEndDate(
  dayOfMonth: number,
  installmentsCount: number,
  startDate?: string
): string | null {
  if (!installmentsCount || installmentsCount < 1) return null;
  const start = startDate
    ? (() => {
        const [y, m] = startDate.split("-").map(Number);
        return { month: m, year: y };
      })()
    : getCurrentMonthYear();
  const { month, year } = addMonths(
    start.month,
    start.year,
    installmentsCount - 1
  );
  const day = getEffectiveDayOfMonth(dayOfMonth, month, year);
  return toDateString(year, month, day);
}

export interface DebtInstallment {
  /** Nº de cuota, 1-indexed. */
  index: number;
  month: number;
  year: number;
  /** Fecha efectiva de vencimiento 'YYYY-MM-DD'. */
  dueDate: string;
  /** Monto por defecto sugerido (total ÷ nº cuotas). */
  defaultAmount: number;
}

/**
 * Lista de cuotas planeadas desde el inicio hasta `installmentsCount`, con su
 * fecha efectiva y el monto por defecto (total ÷ cuotas).
 */
export function getDebtSchedule(event: RecurringEvent): DebtInstallment[] {
  const installments = event.installmentsCount ?? 0;
  if (installments < 1) return [];
  const total = event.totalAmount ?? 0;
  const perInstallment = total / installments;
  const start = getDebtStartMonthYear(event);

  const schedule: DebtInstallment[] = [];
  for (let i = 0; i < installments; i++) {
    const { month, year } = addMonths(start.month, start.year, i);
    const day = getEffectiveDayOfMonth(event.dayOfMonth, month, year);
    schedule.push({
      index: i + 1,
      month,
      year,
      dueDate: toDateString(year, month, day),
      defaultAmount: perInstallment,
    });
  }
  return schedule;
}

export interface DebtNextInstallment {
  index: number;
  month: number;
  year: number;
  dueDate: string;
  amount: number;
}

export interface DebtSummary {
  total: number;
  principal: number | null;
  interestRate: number | null;
  installmentsCount: number;
  paidCount: number;
  remainingCount: number;
  paidAmount: number;
  pendingAmount: number;
  /** Progreso 0–100. */
  progressPct: number;
  nextInstallment: DebtNextInstallment | null;
  /** Fecha de la última cuota 'YYYY-MM-DD' o null. */
  endDate: string | null;
  /** Saldo de CAPITAL pendiente (refleja los abonos), o null si no aplica. */
  outstandingPrincipal: number | null;
  /** Suma de los abonos a capital realizados sobre la deuda. */
  totalAbonos: number;
  /** Interés total estimado del plan (según la amortización), o null. */
  totalInterest: number | null;
  /** Tasa % e.m. declarada (informativa), o null. */
  declaredRate: number | null;
  /** Tasa % e.m. implícita que reproduce la cuota real, o null. */
  impliedRate: number | null;
  /** Tasa % e.m. usada en la amortización, o null. */
  effectiveRate: number | null;
  /** De dónde salió la tasa efectiva, o null si no hay amortización. */
  rateSource: RateSource | null;
  /** true si la tasa declarada y la implícita difieren materialmente. */
  misaligned: boolean;
}

/**
 * Fecha de inicio del cronograma como 'YYYY-MM-DD' (día efectivo del mes).
 * Es el `startDate` que se pasa al módulo de amortización.
 */
export function getDebtStartDateString(event: RecurringEvent): string {
  const start = getDebtStartMonthYear(event);
  const day = getEffectiveDayOfMonth(event.dayOfMonth, start.month, start.year);
  return toDateString(start.year, start.month, day);
}

/**
 * Tabla de amortización real de una deuda recurrente (sistema francés), con los
 * abonos a capital ya aplicados. Devuelve null si la deuda no tiene datos
 * suficientes (sin cuotas o sin total/capital). Reutiliza el módulo puro
 * `src/lib/amortization.ts`.
 */
export function getDebtAmortization(
  event: RecurringEvent,
  abonos: AbonoCapital[] = []
): AmortizationResult | null {
  const installments = event.installmentsCount ?? 0;
  if (installments < 1) return null;
  const input: AmortizationInput = {
    principal: event.principalAmount ?? null,
    totalAmount: event.totalAmount ?? null,
    interestRate: event.interestRate ?? null,
    installmentsCount: installments,
    startDate: getDebtStartDateString(event),
    dayOfMonth: event.dayOfMonth,
  };
  const base = computeAmortization(input);
  if (!base) return null;
  const mapped = mapAbonos(event.id, "recurring", abonos, base);
  if (mapped.length === 0) return base;
  return computeAmortization({ ...input, abonos: mapped }) ?? base;
}

/**
 * Mapea los abonos de una deuda/compra a `AmortizationAbono` (con su
 * `afterInstallment` derivado de la fecha), sobre el cronograma base.
 */
export function mapAbonos(
  parentId: string,
  kind: "recurring" | "compra",
  abonos: AbonoCapital[],
  base: AmortizationResult
): AmortizationAbono[] {
  return abonos
    .filter((a) =>
      kind === "recurring"
        ? a.recurringEventId === parentId
        : a.compraDiferidaId === parentId
    )
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((a) => ({
      amount: a.amount,
      effect: a.effect,
      afterInstallment: abonoAfterInstallment(base.rows, a.date),
    }));
}

/**
 * Resumen de una deuda a partir de su `RecurringEvent` y las
 * `MonthPaymentConfig[]` de ese evento.
 */
export function getDebtSummary(
  event: RecurringEvent,
  configs: MonthPaymentConfig[],
  abonos: AbonoCapital[] = []
): DebtSummary {
  const schedule = getDebtSchedule(event);
  const total = event.totalAmount ?? 0;
  const installmentsCount = event.installmentsCount ?? 0;

  const eventConfigs = configs.filter((c) => c.recurringEventId === event.id);
  const configFor = (month: number, year: number) =>
    eventConfigs.find((c) => c.month === month && c.year === year);

  let paidAmount = 0;
  let paidCount = 0;
  for (const inst of schedule) {
    const config = configFor(inst.month, inst.year);
    if (config?.isPaid) {
      paidAmount += config.amount;
      paidCount += 1;
    }
  }

  // Amortización real (con abonos) para el saldo de capital y el desglose.
  const eventAbonos = abonos.filter((a) => a.recurringEventId === event.id);
  const amort = getDebtAmortization(event, eventAbonos);
  const totalAbonos = eventAbonos.reduce((s, a) => s + a.amount, 0);

  let outstandingPrincipal: number | null = null;
  if (amort) {
    const mapped = mapAbonos(event.id, "recurring", eventAbonos, amort);
    outstandingPrincipal = outstandingPrincipalByCount(amort, mapped, paidCount);
  }

  // El saldo pendiente (base total) descuenta también los abonos: un abono se
  // refleja de inmediato bajando el pendiente.
  const pendingAmount = Math.max(0, total - paidAmount - totalAbonos);
  const remainingCount = Math.max(0, installmentsCount - paidCount);
  const progressPct =
    total > 0
      ? Math.min(100, Math.max(0, ((paidAmount + totalAbonos) / total) * 100))
      : 0;

  // Próxima cuota NO pagada desde el mes actual hacia adelante.
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const curIdx = curYear * 12 + (curMonth - 1);
  let nextInstallment: DebtNextInstallment | null = null;
  for (const inst of schedule) {
    const instIdx = inst.year * 12 + (inst.month - 1);
    if (instIdx < curIdx) continue;
    const config = configFor(inst.month, inst.year);
    if (config?.isPaid) continue;
    nextInstallment = {
      index: inst.index,
      month: inst.month,
      year: inst.year,
      dueDate: inst.dueDate,
      amount: config?.amount ?? inst.defaultAmount,
    };
    break;
  }

  const endDate =
    schedule.length > 0 ? schedule[schedule.length - 1].dueDate : null;

  return {
    total,
    principal: event.principalAmount ?? null,
    interestRate: event.interestRate ?? null,
    installmentsCount,
    paidCount,
    remainingCount,
    paidAmount,
    pendingAmount,
    progressPct,
    nextInstallment,
    endDate,
    outstandingPrincipal,
    totalAbonos,
    totalInterest: amort?.totalInterest ?? null,
    declaredRate: amort?.declaredRate ?? null,
    impliedRate: amort?.impliedRate ?? null,
    effectiveRate: amort?.effectiveRate ?? null,
    rateSource: amort?.rateSource ?? null,
    misaligned: amort?.misaligned ?? false,
  };
}
