"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Trash2, CreditCard } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CompraDiferidaSummary } from "@/types";
import { CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface CompraDiferidaCardProps {
  summary: CompraDiferidaSummary;
  tarjetaName?: string;
  onDelete: (id: string) => void;
}

export function CompraDiferidaCard({
  summary,
  tarjetaName,
  onDelete,
}: CompraDiferidaCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const { compra, installmentAmount, paidCount, remainingCount, pendingAmount, nextDueDate } =
    summary;

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/compras/${compra.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/compras/${compra.id}`);
      }}
      className="w-full cursor-pointer rounded-2xl border border-border/50 bg-card p-4 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-border active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Layers className="h-5 w-5" strokeWidth={1.7} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{compra.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${CATEGORIES[compra.category].bgLight}`}
              >
                {CATEGORIES[compra.category].label}
              </span>
              {tarjetaName && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <CreditCard className="h-3 w-3" strokeWidth={1.7} />
                  {tarjetaName}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteOpen(true);
          }}
          aria-label="Eliminar compra diferida"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/50 transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/40 pt-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">Cuota</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums">
            {formatCurrency(installmentAmount)}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">Cuotas</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums">
            {paidCount}/{compra.installmentsCount}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">Pendiente</p>
          <p className="mt-0.5 text-sm font-bold tabular-nums">
            {formatCurrency(pendingAmount)}
          </p>
        </div>
      </div>

      {nextDueDate && remainingCount > 0 && (
        <p className="mt-2 text-center text-xs text-muted-foreground/70">
          Próxima cuota: {formatDate(nextDueDate)}
        </p>
      )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar compra diferida"
        description={`¿Eliminar "${compra.name}"? Se borrarán también sus ${compra.installmentsCount} cuotas. Esta acción no se puede deshacer.`}
        onConfirm={() => onDelete(compra.id)}
      />
    </>
  );
}
