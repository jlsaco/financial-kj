import {
  FinanceRecord,
  Liquidacion,
  MonthPaymentConfig,
  RecurringEvent,
  Tarjeta,
  TarjetaMonthStatus,
} from "@/types";
import { getDebtSchedule } from "@/lib/debt-helpers";

/** ¿El gasto pertenece al periodo (mes/año) indicado? */
function recordInPeriod(
  record: FinanceRecord,
  month: number,
  year: number
): boolean {
  const [ry, rm] = record.date.split("-").map(Number);
  return ry === year && rm === month;
}

/**
 * Suma de gastos pagados con una tarjeta en un periodo (mes/año).
 * Solo cuentan los registros de tipo 'gasto'.
 */
export function tarjetaOwedForMonth(
  tarjetaId: string,
  records: FinanceRecord[],
  month: number,
  year: number
): { owed: number; count: number } {
  let owed = 0;
  let count = 0;
  for (const r of records) {
    if (r.type !== "gasto") continue;
    if (r.tarjetaId !== tarjetaId) continue;
    if (!recordInPeriod(r, month, year)) continue;
    owed += r.amount;
    count += 1;
  }
  return { owed, count };
}

/** Índice month/year comparable. */
function ymIndex(month: number, year: number): number {
  return year * 12 + (month - 1);
}

/**
 * Proyección del periodo: cuotas de los recurrentes/deudas vinculados a una
 * tarjeta que AÚN NO se han registrado como pago del mes (F4).
 *
 * Solo cuentan los recurrentes pendientes: cuando una cuota se registra como
 * pagada (`MonthPaymentConfig.isPaid`) deja de ser proyección y pasa a ser un
 * `finance_record` real (sumado en `tarjetaOwedForMonth`). Así no se mezcla el
 * gasto real con la proyección ni se cuenta dos veces.
 * - Deudas con cuotas (installmentsCount): usa el cronograma; la cuota es el
 *   monto configurado del mes o, en su defecto, total ÷ cuotas.
 * - Recurrentes simples: su monto del mes si está activo dentro del rango.
 */
export function tarjetaPendingCuotaForMonth(
  tarjetaId: string,
  recurringEvents: RecurringEvent[],
  monthConfigs: MonthPaymentConfig[],
  month: number,
  year: number
): { amount: number; count: number } {
  const target = ymIndex(month, year);
  let amount = 0;
  let count = 0;

  for (const ev of recurringEvents) {
    if (ev.tarjetaId !== tarjetaId || !ev.isActive) continue;
    const configFor = monthConfigs.find(
      (c) => c.recurringEventId === ev.id && c.month === month && c.year === year
    );
    // Ya registrado este mes: salió de la proyección y es un gasto real.
    if (configFor?.isPaid) continue;

    if (ev.installmentsCount && ev.installmentsCount > 0) {
      // Deuda con cuotas: ¿el periodo cae dentro del cronograma?
      const inst = getDebtSchedule(ev).find(
        (i) => i.month === month && i.year === year
      );
      if (!inst) continue;
      amount += configFor?.amount ?? inst.defaultAmount;
      count += 1;
    } else {
      // Recurrente simple: activo si el periodo está dentro de [inicio, fin].
      if (ev.startDate) {
        const [sy, sm] = ev.startDate.split("-").map(Number);
        if (target < ymIndex(sm, sy)) continue;
      }
      if (ev.endDate) {
        const [ey, em] = ev.endDate.split("-").map(Number);
        if (target > ymIndex(em, ey)) continue;
      }
      amount += configFor?.amount ?? ev.defaultAmount;
      count += 1;
    }
  }
  return { amount, count };
}

/**
 * Estado de una tarjeta en un periodo. Separa el gasto REAL de la PROYECCIÓN:
 * - `owed`: solo lo ya registrado en `finance_records` con esa tarjeta (gastado).
 * - `pendingCuota`: cuotas de recurrentes vinculados aún sin registrar.
 * - `proyectado`: `owed + pendingCuota` (lo que se espera liquidar si se pagan
 *   todos los recurrentes pendientes del mes).
 * Pendiente de liquidar = sin liquidación o is_paid=false.
 */
export function getTarjetaMonthStatus(
  tarjeta: Tarjeta,
  records: FinanceRecord[],
  liquidaciones: Liquidacion[],
  recurringEvents: RecurringEvent[],
  monthConfigs: MonthPaymentConfig[],
  month: number,
  year: number
): TarjetaMonthStatus {
  const { owed: recordsOwed, count } = tarjetaOwedForMonth(
    tarjeta.id,
    records,
    month,
    year
  );
  const { amount: pendingCuota, count: pendingCount } =
    tarjetaPendingCuotaForMonth(
      tarjeta.id,
      recurringEvents,
      monthConfigs,
      month,
      year
    );
  const liquidacion =
    liquidaciones.find(
      (l) => l.tarjetaId === tarjeta.id && l.month === month && l.year === year
    ) ?? null;
  return {
    tarjeta,
    month,
    year,
    owed: recordsOwed,
    recordsCount: count,
    pendingCuota,
    pendingCount,
    proyectado: recordsOwed + pendingCuota,
    liquidacion,
    isPaid: liquidacion?.isPaid ?? false,
  };
}

/** Estado de todas las tarjetas para un periodo dado. */
export function getTarjetasMonthStatus(
  tarjetas: Tarjeta[],
  records: FinanceRecord[],
  liquidaciones: Liquidacion[],
  recurringEvents: RecurringEvent[],
  monthConfigs: MonthPaymentConfig[],
  month: number,
  year: number
): TarjetaMonthStatus[] {
  return tarjetas.map((t) =>
    getTarjetaMonthStatus(
      t,
      records,
      liquidaciones,
      recurringEvents,
      monthConfigs,
      month,
      year
    )
  );
}
