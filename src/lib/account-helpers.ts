import { Cuenta, CuentaSaldo, FinanceRecord, Liquidacion } from "@/types";

/**
 * Saldo real de una cuenta (caja):
 *   saldo = saldo inicial
 *         + ingresos a la cuenta
 *         − gastos de débito/efectivo (sin tarjeta) cargados a la cuenta
 *         − liquidaciones de tarjeta pagadas desde la cuenta
 *
 * Los gastos pagados con tarjeta NO restan aquí: mueven la cuenta solo cuando
 * la tarjeta se liquida (su importe entra como liquidación).
 */
export function computeCuentaSaldo(
  cuenta: Cuenta,
  records: FinanceRecord[],
  liquidaciones: Liquidacion[]
): CuentaSaldo {
  let totalIngresos = 0;
  let totalGastos = 0;
  for (const r of records) {
    if (r.cuentaId !== cuenta.id) continue;
    if (r.type === "ingreso") {
      totalIngresos += r.amount;
    } else if (!r.tarjetaId) {
      // Gasto de débito/efectivo (los gastos con tarjeta no tocan la cuenta).
      totalGastos += r.amount;
    }
  }

  let totalLiquidaciones = 0;
  for (const l of liquidaciones) {
    if (l.cuentaId === cuenta.id && l.isPaid) totalLiquidaciones += l.amount;
  }

  return {
    cuenta,
    balance:
      cuenta.initialBalance + totalIngresos - totalGastos - totalLiquidaciones,
    totalIngresos,
    totalGastos,
    totalLiquidaciones,
  };
}

export function computeCuentasSaldos(
  cuentas: Cuenta[],
  records: FinanceRecord[],
  liquidaciones: Liquidacion[]
): CuentaSaldo[] {
  return cuentas.map((c) => computeCuentaSaldo(c, records, liquidaciones));
}
