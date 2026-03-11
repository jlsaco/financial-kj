import {
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

    // If due date already passed, check next month
    if (dueDate < today) {
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

    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDue >= 0 && daysUntilDue <= 5) {
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
      });
    }
  }

  return results.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
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
