"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, TriangleAlert } from "lucide-react";
import { AmortizationResult } from "@/lib/amortization";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface AmortizationTableProps {
  result: AmortizationResult;
  /** Nº de filas visibles antes de "ver todas" (por defecto todas). */
  collapsedRows?: number;
}

/** % con hasta 3 decimales, sin ceros de más. */
function fmtRate(pct: number | null): string {
  if (pct == null) return "—";
  return `${parseFloat(pct.toFixed(3))}%`;
}

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    month: "short",
    year: "2-digit",
  });
}

/**
 * Tabla de amortización (sistema francés) con el desglose capital/interés por
 * cuota. Optimizada para viewport móvil (375px): resumen arriba, tabla con
 * scroll horizontal y opción de expandir/colapsar el cronograma completo.
 */
export function AmortizationTable({
  result,
  collapsedRows = 6,
}: AmortizationTableProps) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = result.rows.length > collapsedRows;
  const rows =
    expanded || !canCollapse ? result.rows : result.rows.slice(0, collapsedRows);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.08)]">
      {/* Resumen de la amortización */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/35">
            Capital
          </p>
          <p className="text-sm font-semibold tabular-nums font-mono">
            {formatCurrency(result.principal)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/35">
            Interés total
          </p>
          <p className="text-sm font-semibold tabular-nums font-mono">
            {formatCurrency(result.totalInterest)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/35">
            Cuota
          </p>
          <p className="text-sm font-semibold tabular-nums font-mono">
            {formatCurrency(result.installment)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-foreground/35">
            Tasa e.m.
          </p>
          <p className="text-sm font-semibold tabular-nums">
            {fmtRate(result.effectiveRate)}
            <span className="ml-1 text-[10px] font-normal text-foreground/40">
              {result.rateSource === "implied"
                ? "impl."
                : result.rateSource === "declared"
                  ? "decl."
                  : "0%"}
            </span>
          </p>
        </div>
      </div>

      {/* Advertencia de tasa desalineada */}
      {result.misaligned && (
        <div className="mt-3 flex gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-amber-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <p className="text-[11px] leading-snug">
            La tasa declarada ({fmtRate(result.declaredRate)}) no reproduce la
            cuota real. Se usa la tasa implícita ({fmtRate(result.impliedRate)})
            para el cálculo.
          </p>
        </div>
      )}

      {/* Tabla de cuotas con scroll horizontal */}
      <div className="mt-3 -mx-1 overflow-x-auto">
        <table className="w-full min-w-[340px] border-collapse text-right">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-foreground/40">
              <th className="py-1.5 pl-1 text-left font-medium">#</th>
              <th className="py-1.5 px-1 text-left font-medium">Vence</th>
              <th className="py-1.5 px-1 font-medium">Cuota</th>
              <th className="py-1.5 px-1 font-medium">Interés</th>
              <th className="py-1.5 px-1 font-medium">Capital</th>
              <th className="py-1.5 pr-1 font-medium">Saldo</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums text-[11px]">
            {rows.map((r) => (
              <tr
                key={r.index}
                className={cn(
                  "border-t border-border/30",
                  r.abono ? "bg-emerald-500/10" : ""
                )}
              >
                <td className="py-1.5 pl-1 text-left text-foreground/50">
                  {r.index}
                </td>
                <td className="py-1.5 px-1 text-left text-foreground/50">
                  {shortDate(r.dueDate)}
                </td>
                <td className="py-1.5 px-1">{formatCurrency(r.payment)}</td>
                <td className="py-1.5 px-1 text-rose-500/90">
                  {formatCurrency(r.interest)}
                </td>
                <td className="py-1.5 px-1 text-emerald-600/90">
                  {formatCurrency(r.principal)}
                </td>
                <td className="py-1.5 pr-1 font-semibold">
                  {formatCurrency(r.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fila de abono destacada (leyenda) */}
      {result.totalAbonos > 0 && (
        <p className="mt-2 text-[10px] text-foreground/40">
          Las cuotas en verde incluyen un abono a capital.
        </p>
      )}

      {canCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-border/50 py-2 text-[12px] font-medium text-foreground/60 transition-colors hover:bg-accent active:scale-[0.99]"
        >
          {expanded ? (
            <>
              Ver menos <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.8} />
            </>
          ) : (
            <>
              Ver las {result.rows.length} cuotas{" "}
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.8} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
