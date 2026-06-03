import {
  FinanceRecord,
  Liquidacion,
  Tarjeta,
  TarjetaMonthStatus,
} from "@/types";

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

/**
 * Estado de liquidación de una tarjeta en un periodo: cuánto se gastó con ella
 * y si ya quedó liquidada (pagada). Pendiente = sin liquidación o is_paid=false.
 */
export function getTarjetaMonthStatus(
  tarjeta: Tarjeta,
  records: FinanceRecord[],
  liquidaciones: Liquidacion[],
  month: number,
  year: number
): TarjetaMonthStatus {
  const { owed, count } = tarjetaOwedForMonth(tarjeta.id, records, month, year);
  const liquidacion =
    liquidaciones.find(
      (l) => l.tarjetaId === tarjeta.id && l.month === month && l.year === year
    ) ?? null;
  return {
    tarjeta,
    month,
    year,
    owed,
    recordsCount: count,
    liquidacion,
    isPaid: liquidacion?.isPaid ?? false,
  };
}

/** Estado de todas las tarjetas para un periodo dado. */
export function getTarjetasMonthStatus(
  tarjetas: Tarjeta[],
  records: FinanceRecord[],
  liquidaciones: Liquidacion[],
  month: number,
  year: number
): TarjetaMonthStatus[] {
  return tarjetas.map((t) =>
    getTarjetaMonthStatus(t, records, liquidaciones, month, year)
  );
}
