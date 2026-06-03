"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFinance } from "@/contexts/finance-context";
import { PaymentTimeline } from "@/components/recurring/payment-timeline";
import { RecurringFormDrawer } from "@/components/recurring/recurring-form-drawer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CategoryBadge } from "@/components/shared/category-badge";
import { UserAvatar } from "@/components/shared/user-selector";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { USERS } from "@/lib/constants";
import { getDebtSummary } from "@/lib/debt-helpers";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function RecurringDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { state, deleteRecurringEvent } = useFinance();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const event = state.recurringEvents.find((e) => e.id === params.id);

  if (!state.isLoaded) {
    return (
      <div className="p-4">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Evento no encontrado</p>
        <Button variant="link" onClick={() => router.push("/recurrentes")}>
          Volver a la lista
        </Button>
      </div>
    );
  }

  const debtSummary =
    event.category === "deuda"
      ? getDebtSummary(event, state.monthConfigs)
      : null;

  const formatDateLabel = (iso: string): string => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleDelete = async () => {
    try {
      await deleteRecurringEvent(event.id);
      toast.success("Evento eliminado");
      router.push("/recurrentes");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background px-4 pb-2 pt-4">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/recurrentes")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground/50 transition-colors hover:bg-accent active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <h1 className="flex-1 truncate text-lg font-bold tracking-tight">{event.name}</h1>
            <button
              onClick={() => setEditOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground/50 transition-colors hover:bg-accent active:scale-95"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-destructive/70 transition-colors hover:bg-destructive/10 active:scale-95"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* Event info card */}
        <div className="rounded-2xl bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={event.category} />
                {event.category !== "deuda" && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      event.type === "ingreso"
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-rose-500/15 text-rose-600"
                    }`}
                  >
                    {event.type === "ingreso" ? "Ingreso" : "Gasto"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <UserAvatar userId={event.userId} />
                <span className="text-sm text-foreground/50">
                  {USERS[event.userId].name}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`text-3xl font-bold tracking-tight tabular-nums font-mono ${
                  event.type === "ingreso" ? "text-emerald-600" : ""
                }`}
              >
                {event.type === "ingreso" ? "+" : ""}
                {formatCurrency(event.defaultAmount)}
              </p>
              <p className="text-xs text-foreground/40">
                Dia {event.dayOfMonth} de cada mes
              </p>
            </div>
          </div>
        </div>

        {/* Debt summary card */}
        {debtSummary && (
          <div className="rounded-2xl bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.08)]">
            {/* Saldo pendiente destacado */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-foreground/35">
                  Saldo pendiente
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums font-mono">
                  {formatCurrency(debtSummary.pendingAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {debtSummary.paidCount} de {debtSummary.installmentsCount}
                </p>
                <p className="text-[11px] text-foreground/40">cuotas pagadas</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${debtSummary.progressPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-foreground/40">
                {Math.round(debtSummary.progressPct)}% pagado ·{" "}
                {formatCurrency(debtSummary.paidAmount)} de{" "}
                {formatCurrency(debtSummary.total)}
              </p>
            </div>

            {/* Próxima cuota */}
            {debtSummary.nextInstallment && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2.5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                    Próxima cuota
                  </p>
                  <p className="text-[13px] font-medium">
                    {formatDateLabel(debtSummary.nextInstallment.dueDate)}
                  </p>
                </div>
                <span className="text-base font-semibold tabular-nums font-mono">
                  {formatCurrency(debtSummary.nextInstallment.amount)}
                </span>
              </div>
            )}

            {/* Detalle de magnitudes */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                  Total a pagar
                </p>
                <p className="text-sm font-semibold tabular-nums font-mono">
                  {formatCurrency(debtSummary.total)}
                </p>
              </div>
              {debtSummary.principal != null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                    Capital
                  </p>
                  <p className="text-sm font-semibold tabular-nums font-mono">
                    {formatCurrency(debtSummary.principal)}
                  </p>
                </div>
              )}
              {debtSummary.interestRate != null && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                    Interés
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {debtSummary.interestRate}%
                  </p>
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                  Cuotas restantes
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {debtSummary.remainingCount}
                </p>
              </div>
              {debtSummary.endDate && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                    Fin estimado
                  </p>
                  <p className="text-sm font-semibold">
                    {formatDateLabel(debtSummary.endDate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment timeline */}
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/35">
            {debtSummary ? "Cuotas" : "Pagos por mes"}
          </h2>
          <PaymentTimeline event={event} />
        </div>
      </div>

      <RecurringFormDrawer
        open={editOpen}
        onOpenChange={setEditOpen}
        editEvent={event}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar evento recurrente"
        description={`¿Estás seguro de eliminar "${event.name}"? Se perderán todas las configuraciones de pago.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
