"use client";

import { useState } from "react";
import { CreditCard, Pencil, Check, Clock } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-selector";
import { useFinance } from "@/contexts/finance-context";
import { TarjetaMonthStatus } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

interface TarjetaCardProps {
  status: TarjetaMonthStatus;
  onEdit: (tarjetaId: string) => void;
}

export function TarjetaCard({ status, onEdit }: TarjetaCardProps) {
  const { setLiquidacion, clearLiquidacion } = useFinance();
  const [busy, setBusy] = useState(false);
  const { tarjeta, owed, recordsCount, isPaid, month, year } = status;

  const today = new Date().toISOString().split("T")[0];

  const handleToggle = async () => {
    setBusy(true);
    try {
      if (isPaid) {
        await clearLiquidacion(tarjeta.id, month, year);
        toast.success("Marcada como pendiente");
      } else {
        await setLiquidacion({
          tarjetaId: tarjeta.id,
          month,
          year,
          amount: owed,
          isPaid: true,
          paidDate: today,
        });
        toast.success("Liquidación registrada");
      }
    } catch {
      toast.error("Error al actualizar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-[15px] font-semibold">{tarjeta.name}</p>
              <UserAvatar userId={tarjeta.owner} className="h-5 w-5" />
            </div>
            {tarjeta.closingDay && (
              <p className="text-xs text-muted-foreground/70">
                Corte día {tarjeta.closingDay}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEdit(tarjeta.id)}
          aria-label="Editar tarjeta"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60 transition-all hover:bg-accent/50 hover:text-foreground active:scale-95"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>

      {/* Categorías asociadas */}
      {tarjeta.categories && tarjeta.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tarjeta.categories.map((cat) => (
            <span
              key={cat}
              className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${CATEGORIES[cat].bgLight}`}
            >
              {CATEGORIES[cat].label}
            </span>
          ))}
        </div>
      )}

      {/* Liquidación del mes */}
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border/40 pt-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
            Gastado este mes
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">
            {formatCurrency(owed)}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {recordsCount} {recordsCount === 1 ? "gasto" : "gastos"}
          </p>
        </div>

        {owed === 0 && !isPaid ? (
          <span className="rounded-xl bg-muted px-3 py-2 text-[13px] font-medium text-muted-foreground">
            Sin gastos
          </span>
        ) : (
          <button
            type="button"
            onClick={handleToggle}
            disabled={busy}
            className={`flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-60 ${
              isPaid
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                : "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            }`}
          >
            {isPaid ? (
              <>
                <Check className="h-4 w-4" strokeWidth={2.2} />
                Pagada
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" strokeWidth={2} />
                Marcar pagada
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
