import {
  ClassifiedRecurring,
  ClassifiedRecurringGroups,
  MonthPaymentConfig,
  RecurringEvent,
  UpcomingEvent,
} from "@/types";

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function getEffectiveDayOfMonth(
  dayOfMonth: number,
  month: number,
  year: number
): number {
  return Math.min(dayOfMonth, getDaysInMonth(month, year));
}

/** Índice mensual comparable (año*12 + mes-1) para ordenar/comparar meses. */
function monthIndex(month: number, year: number): number {
  return year * 12 + (month - 1);
}

/**
 * Mes/año de la PRIMERA cuota de un recurrente a partir de su `startDate`
 * (YYYY-MM-DD). Si no hay `startDate`, devuelve null: se considera vigente
 * desde siempre (no acota meses anteriores).
 */
function getStartMonthYear(
  startDate: string | undefined
): { month: number; year: number } | null {
  if (!startDate) return null;
  const [y, m] = startDate.split("-").map(Number);
  if (!y || !m) return null;
  return { month: m, year: y };
}

/**
 * Resuelve la fecha de vencimiento efectiva de un recurrente para el mes de
 * referencia, teniendo en cuenta su `startDate` (mes de la primera cuota):
 * - Si el mes de referencia es ANTERIOR al mes de inicio, NO hay cuota ese mes;
 *   se devuelve la fecha de la primera cuota (en el mes de inicio) para que el
 *   recurrente se trate como "próximo" y nunca como "vencido".
 * - En caso contrario, se usa el vencimiento del propio mes de referencia.
 */
function resolveDueDate(
  event: RecurringEvent,
  refMonth: number,
  refYear: number
): Date {
  const start = getStartMonthYear(event.startDate);
  let month = refMonth;
  let year = refYear;
  if (start && monthIndex(start.month, start.year) > monthIndex(refMonth, refYear)) {
    month = start.month;
    year = start.year;
  }
  const day = getEffectiveDayOfMonth(event.dayOfMonth, month, year);
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);
  return due;
}

export function getUpcomingRecurringEvents(
  events: RecurringEvent[],
  configs: MonthPaymentConfig[],
  referenceDate: Date = new Date()
): UpcomingEvent[] {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const results: UpcomingEvent[] = [];

  for (const event of events) {
    if (!event.isActive) continue;

    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Vencimiento del mes en curso, salvo que la primera cuota (startDate) sea
    // posterior: en ese caso apunta a la primera cuota y nunca cuenta vencido.
    let dueDate = resolveDueDate(event, currentMonth, currentYear);

    // ¿Ya está pagado este mes? Si lo está, la cuota del mes en curso ya no es
    // un próximo pago y adelantamos el vencimiento al próximo mes.
    const currentConfig = configs.find(
      (c) =>
        c.recurringEventId === event.id &&
        c.month === currentMonth &&
        c.year === currentYear
    );
    const paidThisMonth = currentConfig?.isPaid ?? false;

    // Si ya está pagado este mes, la cuota del mes en curso está saldada y no
    // debe aparecer en "próximos pagos" (ni vencida ni próxima). Mostramos en su
    // lugar el vencimiento del próximo mes, que aún está pendiente.
    if (paidThisMonth) {
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
      const nextEffectiveDay = getEffectiveDayOfMonth(
        event.dayOfMonth,
        nextMonth,
        nextYear
      );
      dueDate = new Date(nextYear, nextMonth - 1, nextEffectiveDay);
      dueDate.setHours(0, 0, 0, 0);
    }

    let isOverdue = false;

    // Vencido y sin pagar: lo mantenemos resaltado en su mes.
    if (dueDate < today) {
      isOverdue = true;
    }

    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (isOverdue || (daysUntilDue >= 0 && daysUntilDue <= 5)) {
      const config = configs.find(
        (c) =>
          c.recurringEventId === event.id &&
          c.month === dueDate.getMonth() + 1 &&
          c.year === dueDate.getFullYear()
      );

      results.push({
        recurringEvent: event,
        monthConfig: config ?? null,
        dueDate,
        daysUntilDue,
        amount: config?.amount ?? event.defaultAmount,
        isOverdue,
      });
    }
  }

  // Vencidos (daysUntilDue negativo) primero, luego por cercanía del vencimiento.
  return results.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/**
 * Clasifica los recurrentes ACTIVOS por su estado de pago en el mes en curso:
 * - `overdue`: la fecha ya pasó y no hay pago registrado este mes (prioritario).
 * - `upcoming`: la fecha aún no llega este mes y no está pagado.
 * - `paid`: ya tiene pago registrado en el mes actual.
 * Cada grupo viene ordenado por fecha de vencimiento ascendente.
 */
export function classifyRecurringEvents(
  events: RecurringEvent[],
  configs: MonthPaymentConfig[],
  referenceDate: Date = new Date()
): ClassifiedRecurringGroups {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const overdue: ClassifiedRecurring[] = [];
  const upcoming: ClassifiedRecurring[] = [];
  const paid: ClassifiedRecurring[] = [];

  for (const event of events) {
    if (!event.isActive) continue;

    // Si la primera cuota (startDate) aún no llega, el vencimiento apunta a ese
    // mes futuro; así el recurrente cae en "próximos" y nunca en "vencidos"
    // (no había cuota que pagar este mes).
    const dueDate = resolveDueDate(event, month, year);

    const config = configs.find(
      (c) =>
        c.recurringEventId === event.id &&
        c.month === month &&
        c.year === year
    );
    const isPaid = config?.isPaid ?? false;
    const amount = config?.amount ?? event.defaultAmount;

    if (isPaid) {
      paid.push({ event, status: "paid", dueDate, isPaid, amount });
    } else if (dueDate < today) {
      overdue.push({ event, status: "overdue", dueDate, isPaid, amount });
    } else {
      upcoming.push({ event, status: "upcoming", dueDate, isPaid, amount });
    }
  }

  const byDate = (a: ClassifiedRecurring, b: ClassifiedRecurring) =>
    a.dueDate.getTime() - b.dueDate.getTime();
  overdue.sort(byDate);
  upcoming.sort(byDate);
  paid.sort(byDate);

  return { overdue, upcoming, paid };
}

export function groupByDate<T extends { date: string }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  const sorted = [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const item of sorted) {
    const key = item.date;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return map;
}

export function getCurrentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}
