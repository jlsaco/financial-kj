import {
  CompraDiferida,
  CompraDiferidaSummary,
  FinanceRecord,
} from "@/types";
import { getEffectiveDayOfMonth, getCurrentMonthYear } from "@/lib/date-helpers";
import { addMonths, toDateString, computeDebtEndDate } from "@/lib/debt-helpers";

export interface PlannedInstallment {
  /** Nº de cuota, 1-indexed. */
  index: number;
  month: number;
  year: number;
  /** Fecha de la cuota 'YYYY-MM-DD'. */
  date: string;
  amount: number;
}

/**
 * Cronograma de cuotas de una compra diferida: N cuotas mensuales desde
 * `startDate`, cada una en el mismo día del mes (recortado). La cuota es
 * total ÷ N; la última cuota absorbe el redondeo para cuadrar el total exacto.
 *
 * Reutiliza las primitivas de cuotas de `debt-helpers` (addMonths, toDateString).
 */
export function computeInstallmentSchedule(
  startDate: string,
  installmentsCount: number,
  totalAmount: number
): PlannedInstallment[] {
  if (installmentsCount < 1) return [];
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);

  // Cuota redondeada a peso; la última absorbe la diferencia para cuadrar.
  const base = Math.round(totalAmount / installmentsCount);
  const schedule: PlannedInstallment[] = [];
  let accumulated = 0;
  for (let i = 0; i < installmentsCount; i++) {
    const { month, year } = addMonths(startMonth, startYear, i);
    const day = getEffectiveDayOfMonth(startDay, month, year);
    const isLast = i === installmentsCount - 1;
    const amount = isLast ? totalAmount - accumulated : base;
    accumulated += amount;
    schedule.push({ index: i + 1, month, year, date: toDateString(year, month, day), amount });
  }
  return schedule;
}

/**
 * Resumen de una compra diferida a partir de sus cuotas (finance_records hijos).
 * Una cuota se considera "pagada" si su mes ya pasó respecto al mes actual
 * (la liquidación efectiva por tarjeta vive en F1; aquí el progreso se mide por
 * el avance del cronograma).
 */
export function getCompraDiferidaSummary(
  compra: CompraDiferida,
  children: FinanceRecord[]
): CompraDiferidaSummary {
  const cuotas = children
    .filter((r) => r.compraDiferidaId === compra.id)
    .sort((a, b) => (a.installmentNo ?? 0) - (b.installmentNo ?? 0));

  const installmentAmount =
    compra.installmentsCount > 0
      ? compra.totalAmount / compra.installmentsCount
      : 0;

  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const curIdx = curYear * 12 + (curMonth - 1);

  let paidCount = 0;
  let paidAmount = 0;
  let nextDueDate: string | null = null;
  for (const r of cuotas) {
    const [ry, rm] = r.date.split("-").map(Number);
    const idx = ry * 12 + (rm - 1);
    if (idx < curIdx) {
      paidCount += 1;
      paidAmount += r.amount;
    } else if (nextDueDate === null) {
      nextDueDate = r.date;
    }
  }

  const remainingCount = Math.max(0, compra.installmentsCount - paidCount);
  const pendingAmount = Math.max(0, compra.totalAmount - paidAmount);
  const endDate =
    computeInstallmentSchedule(
      compra.startDate,
      compra.installmentsCount,
      compra.totalAmount
    ).slice(-1)[0]?.date ??
    computeDebtEndDate(
      Number(compra.startDate.split("-")[2]),
      compra.installmentsCount,
      compra.startDate
    ) ??
    compra.startDate;

  return {
    compra,
    installmentAmount,
    paidCount,
    remainingCount,
    paidAmount,
    pendingAmount,
    nextDueDate,
    endDate,
  };
}
