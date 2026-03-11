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
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { USERS } from "@/lib/constants";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function RecurringDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { state, dispatch } = useFinance();
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

  const handleDelete = () => {
    dispatch({ type: "DELETE_RECURRING", payload: event.id });
    toast.success("Evento eliminado");
    router.push("/recurrentes");
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-card/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] backdrop-blur-xl px-4 py-3">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/recurrentes")}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <h1 className="flex-1 truncate text-base font-semibold tracking-tight">{event.name}</h1>
            <button
              onClick={() => setEditOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent active:scale-95"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-destructive/70 transition-colors hover:bg-destructive/10 active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Event info card */}
        <div className="rounded-2xl border border-border/30 bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <div className="space-y-2.5">
              <CategoryBadge category={event.category} />
              <div className="flex items-center gap-2">
                <UserAvatar userId={event.userId} />
                <span className="text-[13px] text-muted-foreground/70">
                  {USERS[event.userId].name}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold tracking-tight tabular-nums font-mono">
                {formatCurrency(event.defaultAmount)}
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Dia {event.dayOfMonth} de cada mes
              </p>
            </div>
          </div>
        </div>

        {/* Payment timeline */}
        <div>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Pagos por mes</h2>
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
