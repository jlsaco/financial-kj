import {
  Cuenta,
  CuentaSaldo,
  FinanceRecord,
  Liquidacion,
  Transferencia,
} from "@/types";

/**
 * Saldo real de una cuenta (caja):
 *   saldo = saldo inicial
 *         + ingresos a la cuenta
 *         − gastos de débito/efectivo (sin tarjeta) cargados a la cuenta
 *         − liquidaciones de tarjeta pagadas desde la cuenta
 *         + transferencias recibidas de otras cuentas
 *         − transferencias enviadas a otras cuentas
 *
 * Los gastos pagados con tarjeta NO restan aquí: mueven la cuenta solo cuando
 * la tarjeta se liquida (su importe entra como liquidación).
 *
 * Las transferencias NO son gasto ni ingreso: solo mueven saldo entre cuentas,
 * por lo que no aparecen en ningún reporte de P&L (resumen_mes, presupuestos).
 */
export function computeCuentaSaldo(
  cuenta: Cuenta,
  records: FinanceRecord[],
  liquidaciones: Liquidacion[],
  transferencias: Transferencia[] = []
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

  let totalTransferenciasEntrada = 0;
  let totalTransferenciasSalida = 0;
  for (const t of transferencias) {
    if (t.cuentaDestinoId === cuenta.id) totalTransferenciasEntrada += t.amount;
    if (t.cuentaOrigenId === cuenta.id) totalTransferenciasSalida += t.amount;
  }

  return {
    cuenta,
    balance:
      cuenta.initialBalance +
      totalIngresos -
      totalGastos -
      totalLiquidaciones +
      totalTransferenciasEntrada -
      totalTransferenciasSalida,
    totalIngresos,
    totalGastos,
    totalLiquidaciones,
    totalTransferenciasEntrada,
    totalTransferenciasSalida,
  };
}

export function computeCuentasSaldos(
  cuentas: Cuenta[],
  records: FinanceRecord[],
  liquidaciones: Liquidacion[],
  transferencias: Transferencia[] = []
): CuentaSaldo[] {
  return cuentas.map((c) =>
    computeCuentaSaldo(c, records, liquidaciones, transferencias)
  );
}
