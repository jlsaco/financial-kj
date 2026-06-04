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

    const effectiveDay = getEffectiveDayOfMonth(
      event.dayOfMonth,
      currentMonth,
      currentYear
    );
    let dueDate = new Date(currentYear, currentMonth - 1, effectiveDay);
    dueDate.setHours(0, 0, 0, 0);

    // ¿Ya está pagado este mes? Lo usamos para decidir si un recurrente vencido
    // se mantiene resaltado (sin pagar) o se adelanta al próximo mes (ya pagado).
    const currentConfig = configs.find(
      (c) =>
        c.recurringEventId === event.id &&
        c.month === currentMonth &&
        c.year === currentYear
    );
    const paidThisMonth = currentConfig?.isPaid ?? false;

    let isOverdue = false;

    if (dueDate < today) {
      if (paidThisMonth) {
        // Ya pagado: mostramos el vencimiento del próximo mes.
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const nextEffectiveDay = getEffectiveDayOfMonth(
          event.dayOfMonth,
          nextMonth,
          nextYear
        );
        dueDate = new Date(nextYear, nextMonth - 1, nextEffectiveDay);
        dueDate.setHours(0, 0, 0, 0);
      } else {
        // Vencido y sin pagar: lo mantenemos resaltado en su mes.
        isOverdue = true;
      }
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

    const effectiveDay = getEffectiveDayOfMonth(event.dayOfMonth, month, year);
    const dueDate = new Date(year, month - 1, effectiveDay);
    dueDate.setHours(0, 0, 0, 0);

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
