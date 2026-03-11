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
      <div className="sticky top-0 z-40 border-b bg-background px-4 py-3">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push("/recurrentes")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="flex-1 truncate text-lg font-bold">{event.name}</h1>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Event info card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <CategoryBadge category={event.category} />
                <div className="flex items-center gap-2">
                  <UserAvatar userId={event.userId} />
                  <span className="text-sm text-muted-foreground">
                    {USERS[event.userId].name}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatCurrency(event.defaultAmount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Día {event.dayOfMonth} de cada mes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment timeline */}
        <div>
          <h2 className="mb-3 text-sm font-semibold">Pagos por mes</h2>
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
