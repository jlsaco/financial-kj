"use client";

import { useState } from "react";
import { Trash2, CalendarClock, TrendingDown } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AbonoCapital } from "@/types";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface AbonosHistoryProps {
  abonos: AbonoCapital[];
  onDelete: (id: string) => void;
}

/** Historial persistente de abonos a capital de una deuda/compra. */
export function AbonosHistory({ abonos, onDelete }: AbonosHistoryProps) {
  const [toDelete, setToDelete] = useState<AbonoCapital | null>(null);

  if (abonos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/50 px-3 py-4 text-center text-[12px] text-muted-foreground/60">
        Sin abonos a capital todavía.
      </p>
    );
  }

  const ordered = [...abonos].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-2">
      {ordered.map((abono) => {
        const isPlazo = abono.effect === "reducir_plazo";
        const Icon = isPlazo ? CalendarClock : TrendingDown;
        return (
          <div
            key={abono.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Icon className="h-4 w-4" strokeWidth={1.7} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tabular-nums font-mono">
                  {formatCurrency(abono.amount)}
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  {formatDate(abono.date)} ·{" "}
                  {isPlazo ? "Redujo plazo" : "Redujo cuota"}
                  {abono.note ? ` · ${abono.note}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToDelete(abono)}
              aria-label="Eliminar abono"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/50 transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.7} />
            </button>
          </div>
        );
      })}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Eliminar abono a capital"
        description={
          toDelete
            ? `¿Eliminar el abono de ${formatCurrency(toDelete.amount)}? El plan se recalculará sin él.`
            : ""
        }
        onConfirm={() => {
          if (toDelete) onDelete(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}
