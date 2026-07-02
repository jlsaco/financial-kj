/**
 * Módulo PURO de amortización (sistema francés / cuota fija) + abonos a capital.
 *
 * Sin dependencias externas ni acceso a BD: es el núcleo compartido que reutilizan
 * los stores, la UI y las tools MCP. Todas las tasas se manejan como PORCENTAJE
 * efectivo MENSUAL (ej. `1.84` = 1.84 % e.m., la convención colombiana); dentro
 * del módulo se convierten a decimal.
 *
 * Escenarios que resuelve `computeAmortization`:
 *  - Deuda con capital y total (total > capital): calcula la TASA IMPLÍCITA que
 *    reproduce la cuota real (total ÷ cuotas) y la usa para la tabla. Si además
 *    hay una tasa declarada y difiere materialmente, marca `misaligned = true`.
 *  - Deuda con capital y tasa declarada (sin total): usa la tasa declarada.
 *  - Compra diferida con total y tasa (sin capital): deriva el capital como valor
 *    presente de la anualidad a la tasa declarada.
 *  - Sin tasa/total útil: amortización a interés 0 (toda la cuota es capital).
 *
 * Redondeos: cada fila se redondea a 2 decimales (centavos) y la ÚLTIMA cuota
 * absorbe el residuo, de modo que el saldo final cierra en 0 y la suma de capital
 * iguala el capital inicial.
 */

export type AmortizationEffect = "reducir_plazo" | "reducir_cuota";
export type RateSource = "declared" | "implied" | "zero";

export interface AmortizationAbono {
  amount: number;
  effect: AmortizationEffect;
  /** Nº de cuota (1-indexed) tras la cual se aplica el abono. 0 = antes de la 1ª. */
  afterInstallment: number;
}

export interface AmortizationRow {
  /** Nº de cuota, 1-indexed. */
  index: number;
  /** Fecha de vencimiento 'YYYY-MM-DD' o null si no hay fecha base. */
  dueDate: string | null;
  /** Cuota del periodo (capital + interés). */
  payment: number;
  /** Parte de interés de la cuota. */
  interest: number;
  /** Parte de capital de la cuota (NO incluye el abono). */
  principal: number;
  /** Saldo de capital restante tras la cuota (y el abono si aplica). */
  balance: number;
  /** Abono extraordinario a capital aplicado tras esta cuota (opcional). */
  abono?: number;
}

export interface AmortizationInput {
  /** Capital prestado (sin intereses). Opcional en compras diferidas. */
  principal?: number | null;
  /** Total a pagar (capital + intereses). Opcional en deudas sin total. */
  totalAmount?: number | null;
  /** Tasa declarada como % efectivo mensual (ej. 1.84). Opcional. */
  interestRate?: number | null;
  /** Número de cuotas pactadas. */
  installmentsCount: number;
  /** Fecha de la primera cuota 'YYYY-MM-DD' (para calcular vencimientos). */
  startDate?: string | null;
  /** Día de vencimiento (1-31). Por defecto, el día de `startDate`. */
  dayOfMonth?: number | null;
  /** Abonos extraordinarios a capital (recalculan el plan). */
  abonos?: AmortizationAbono[];
}

export interface AmortizationResult {
  rows: AmortizationRow[];
  /** Cuota base usada para el plan (antes de abonos). */
  installment: number;
  /** Capital base de la amortización. */
  principal: number;
  /** % efectivo mensual declarado, o null si no se dio. */
  declaredRate: number | null;
  /** % efectivo mensual implícito (derivado de la cuota real), o null. */
  impliedRate: number | null;
  /** % efectivo mensual usado realmente en la tabla. */
  effectiveRate: number;
  /** De dónde salió la tasa efectiva. */
  rateSource: RateSource;
  /** true si la tasa declarada y la implícita difieren materialmente. */
  misaligned: boolean;
  /** Suma de todas las cuotas del plan. */
  totalToPay: number;
  /** Suma de todos los intereses del plan. */
  totalInterest: number;
  /** Suma de los abonos a capital aplicados. */
  totalAbonos: number;
  /** Nº de cuotas efectivas del plan (baja con `reducir_plazo`). */
  installmentsCount: number;
}

/** Umbral (en decimal) para considerar dos tasas "materialmente distintas": 0.05 p.p. */
const MISALIGN_THRESHOLD = 0.0005;
/** Tolerancia de comparación de saldos (centavos). */
const EPS = 0.005;

/** Redondeo a 2 decimales (centavos), estable ante ruido de coma flotante. */
export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

/** Redondeo a 4 decimales (para exponer tasas en %). */
function round4(x: number): number {
  return Math.round((x + Number.EPSILON) * 10000) / 10000;
}

/** Cuota fija del sistema francés: P·r / (1 − (1+r)⁻ⁿ). */
export function frenchInstallment(
  principal: number,
  monthlyRate: number,
  n: number
): number {
  if (n <= 0) return 0;
  if (monthlyRate <= 0) return principal / n;
  const f = Math.pow(1 + monthlyRate, -n);
  return (principal * monthlyRate) / (1 - f);
}

/** Valor presente de una anualidad de `installment` durante `n` a tasa `r`. */
export function presentValue(
  installment: number,
  monthlyRate: number,
  n: number
): number {
  if (n <= 0) return 0;
  if (monthlyRate <= 0) return installment * n;
  const f = Math.pow(1 + monthlyRate, -n);
  return (installment * (1 - f)) / monthlyRate;
}

/**
 * Resuelve numéricamente (bisección) la tasa mensual efectiva (decimal) tal que
 * la cuota francesa de (principal, r, n) iguale `targetInstallment`. Devuelve 0
 * si la cuota objetivo no supera capital/n (no hay interés positivo posible) y
 * null si los datos son inválidos.
 */
export function solveMonthlyRate(
  principal: number,
  targetInstallment: number,
  n: number
): number | null {
  if (principal <= 0 || n <= 0 || targetInstallment <= 0) return null;
  if (targetInstallment <= principal / n + 1e-9) return 0;
  let lo = 0;
  let hi = 1;
  let guard = 0;
  while (frenchInstallment(principal, hi, n) < targetInstallment && guard < 500) {
    hi *= 2;
    guard++;
  }
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    const val = frenchInstallment(principal, mid, n);
    if (Math.abs(val - targetInstallment) < 1e-7) return mid;
    if (val < targetInstallment) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Nº de cuotas de `payment` para saldar `balance` a tasa `r` (para reducir_plazo). */
function installmentsToClear(
  balance: number,
  monthlyRate: number,
  payment: number
): number {
  if (balance <= EPS) return 0;
  if (payment <= 0) return Infinity;
  if (monthlyRate <= 0) return Math.ceil(round2(balance) / payment);
  const ratio = 1 - (balance * monthlyRate) / payment;
  if (ratio <= 0) return Infinity; // la cuota no cubre ni el interés
  return Math.ceil(-Math.log(ratio) / Math.log(1 + monthlyRate));
}

// --- Primitivas de fecha (locales para mantener el módulo autocontenido) ---

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function effectiveDay(day: number, month: number, year: number): number {
  return Math.min(day, daysInMonth(month, year));
}

function addMonths(
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

function dateStr(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

interface ResolvedInputs {
  principal: number;
  rateDecimal: number;
  installment: number;
  declaredRate: number | null;
  impliedRate: number | null;
  rateSource: RateSource;
  misaligned: boolean;
}

/** Resuelve capital/tasa/cuota efectivos según los datos disponibles. */
function resolveInputs(input: AmortizationInput): ResolvedInputs | null {
  const n = input.installmentsCount;
  if (!n || n < 1) return null;

  const declaredDec =
    input.interestRate != null && !Number.isNaN(input.interestRate)
      ? input.interestRate / 100
      : null;
  const declaredPct = declaredDec != null ? round4(declaredDec * 100) : null;

  const hasPrincipal = input.principal != null && input.principal > 0;
  const hasTotal = input.totalAmount != null && input.totalAmount > 0;

  // Deuda con capital y total (con interés): tasa implícita desde la cuota real.
  if (hasPrincipal && hasTotal && input.totalAmount! > input.principal! + EPS) {
    const P = input.principal!;
    const targetCuota = input.totalAmount! / n;
    const impliedDec = solveMonthlyRate(P, targetCuota, n) ?? 0;
    const misaligned =
      declaredDec != null &&
      Math.abs(declaredDec - impliedDec) > MISALIGN_THRESHOLD;
    return {
      principal: P,
      rateDecimal: impliedDec,
      installment: targetCuota,
      declaredRate: declaredPct,
      impliedRate: round4(impliedDec * 100),
      rateSource: "implied",
      misaligned,
    };
  }

  // Capital conocido (sin total con interés).
  if (hasPrincipal) {
    const P = input.principal!;
    if (declaredDec != null && declaredDec > 0) {
      return {
        principal: P,
        rateDecimal: declaredDec,
        installment: frenchInstallment(P, declaredDec, n),
        declaredRate: declaredPct,
        impliedRate: declaredPct,
        rateSource: "declared",
        misaligned: false,
      };
    }
    const base = hasTotal ? input.totalAmount! : P;
    return {
      principal: base,
      rateDecimal: 0,
      installment: base / n,
      declaredRate: declaredPct,
      impliedRate: null,
      rateSource: "zero",
      misaligned: false,
    };
  }

  // Solo total (compras diferidas): deriva el capital como valor presente.
  if (hasTotal) {
    const cuota = input.totalAmount! / n;
    if (declaredDec != null && declaredDec > 0) {
      return {
        principal: presentValue(cuota, declaredDec, n),
        rateDecimal: declaredDec,
        installment: cuota,
        declaredRate: declaredPct,
        impliedRate: declaredPct,
        rateSource: "declared",
        misaligned: false,
      };
    }
    return {
      principal: input.totalAmount!,
      rateDecimal: 0,
      installment: cuota,
      declaredRate: declaredPct,
      impliedRate: null,
      rateSource: "zero",
      misaligned: false,
    };
  }

  return null;
}

/** Construye las filas de la tabla, aplicando los abonos como eventos. */
function buildRows(
  principal: number,
  rateDec: number,
  n: number,
  installment: number,
  startDate: string | null | undefined,
  dayOfMonth: number | null | undefined,
  abonos: AmortizationAbono[]
): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  let balance = principal;
  let currentInstallment = installment;
  let plannedTotal = n;

  // Fechas de vencimiento (opcionales).
  let startMonth: number | null = null;
  let startYear: number | null = null;
  let baseDay: number | null = null;
  if (startDate) {
    const [y, m, d] = startDate.split("-").map(Number);
    if (y && m) {
      startYear = y;
      startMonth = m;
      baseDay = dayOfMonth ?? d ?? 1;
    }
  }
  const dateFor = (k: number): string | null => {
    if (startYear == null || startMonth == null || baseDay == null) return null;
    const { month, year } = addMonths(startMonth, startYear, k - 1);
    return dateStr(year, month, effectiveDay(baseDay, month, year));
  };

  const sorted = [...abonos].sort(
    (a, b) => a.afterInstallment - b.afterInstallment
  );
  let abonoPtr = 0;

  const applyAbonosAfter = (k: number): number => {
    let applied = 0;
    while (abonoPtr < sorted.length && sorted[abonoPtr].afterInstallment === k) {
      const ab = sorted[abonoPtr];
      abonoPtr++;
      if (ab.amount > 0 && balance > EPS) {
        balance = round2(Math.max(0, balance - ab.amount));
        applied += ab.amount;
        if (balance > EPS) {
          if (ab.effect === "reducir_cuota") {
            const remaining = Math.max(1, plannedTotal - k);
            currentInstallment = frenchInstallment(balance, rateDec, remaining);
          } else {
            const m = installmentsToClear(balance, rateDec, currentInstallment);
            plannedTotal = k + (Number.isFinite(m) ? m : plannedTotal - k);
          }
        } else {
          plannedTotal = k;
        }
      }
    }
    return applied;
  };

  // Abonos anteriores a la primera cuota.
  applyAbonosAfter(0);

  const maxIter = plannedTotal + 600;
  let k = 0;
  while (balance > EPS && k < maxIter) {
    k++;
    const interest = round2(balance * rateDec);
    let principalPart: number;
    let payment: number;
    // Última cuota: la del plazo previsto o cuando la cuota ya salda el capital.
    // Absorbe el residuo de redondeo para que el saldo cierre exactamente en 0.
    if (k >= plannedTotal || currentInstallment >= balance + interest - EPS) {
      principalPart = round2(balance);
      payment = round2(principalPart + interest);
    } else {
      payment = round2(currentInstallment);
      principalPart = round2(payment - interest);
    }
    balance = round2(balance - principalPart);
    if (balance < EPS) balance = 0;

    const row: AmortizationRow = {
      index: k,
      dueDate: dateFor(k),
      payment,
      interest,
      principal: principalPart,
      balance,
    };

    const abonoAmt = applyAbonosAfter(k);
    if (abonoAmt > 0) {
      row.abono = round2(abonoAmt);
      row.balance = balance < EPS ? 0 : balance;
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Calcula la tabla de amortización completa (con abonos, si los hay).
 * Devuelve null si no hay datos suficientes (p.ej. sin cuotas).
 */
export function computeAmortization(
  input: AmortizationInput
): AmortizationResult | null {
  const resolved = resolveInputs(input);
  if (!resolved) return null;
  const abonos = input.abonos ?? [];
  const rows = buildRows(
    resolved.principal,
    resolved.rateDecimal,
    input.installmentsCount,
    resolved.installment,
    input.startDate,
    input.dayOfMonth,
    abonos
  );
  const totalToPay = round2(rows.reduce((s, r) => s + r.payment, 0));
  const totalInterest = round2(rows.reduce((s, r) => s + r.interest, 0));
  const totalAbonos = round2(rows.reduce((s, r) => s + (r.abono ?? 0), 0));
  return {
    rows,
    installment: round2(resolved.installment),
    principal: round2(resolved.principal),
    declaredRate: resolved.declaredRate,
    impliedRate: resolved.impliedRate,
    effectiveRate: round4(resolved.rateDecimal * 100),
    rateSource: resolved.rateSource,
    misaligned: resolved.misaligned,
    totalToPay,
    totalInterest,
    totalAbonos,
    installmentsCount: rows.length,
  };
}

/**
 * Saldo de CAPITAL pendiente tras `paidCount` cuotas pagadas, restando TODOS los
 * abonos realizados. Un abono es un pago real de capital, así que reduce el saldo
 * de inmediato con independencia de cuántas cuotas regulares estén marcadas como
 * pagadas. La suma de capital de todas las filas más los abonos iguala el capital
 * inicial, por lo que restar el capital de las `paidCount` primeras filas y el
 * total de abonos deja exactamente el capital aún por amortizar (sin doble conteo:
 * `row.principal` nunca incluye el abono, que va en `row.abono`).
 */
export function outstandingPrincipalByCount(
  result: AmortizationResult,
  abonos: AmortizationAbono[],
  paidCount: number
): number {
  let paidPrincipal = 0;
  const upto = Math.min(Math.max(0, paidCount), result.rows.length);
  for (let i = 0; i < upto; i++) paidPrincipal += result.rows[i].principal;
  const abonosApplied = abonos.reduce((sum, ab) => sum + ab.amount, 0);
  return round2(Math.max(0, result.principal - paidPrincipal - abonosApplied));
}

/**
 * Mapea la fecha de un abono al índice de cuota tras la cual se aplica:
 * nº de cuotas cuyo vencimiento es <= la fecha del abono. 0 = antes de la 1ª.
 */
export function abonoAfterInstallment(
  rows: Pick<AmortizationRow, "dueDate">[],
  abonoDate: string
): number {
  let count = 0;
  for (const row of rows) {
    if (row.dueDate && row.dueDate <= abonoDate) count++;
    else break;
  }
  return count;
}
