"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RecurringCard } from "@/components/recurring/recurring-card";
import { RecurringFormDrawer } from "@/components/recurring/recurring-form-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { useFinance } from "@/contexts/finance-context";
import { RecurringEvent } from "@/types";
import { AlertTriangle, ChevronDown, CheckCircle2, Clock, Plus, Repeat } from "lucide-react";

export default function RecurrentesPage() {
  const { state, getClassifiedRecurring } = useFinance();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<RecurringEvent | null>(null);
  const [showPaid, setShowPaid] = useState(false);

  const { overdue, upcoming, paid } = getClassifiedRecurring();
  const inactiveEvents = state.recurringEvents.filter((e) => !e.isActive);
  const hasAny =
    overdue.length + upcoming.length + paid.length + inactiveEvents.length > 0;

  const handleAdd = () => {
    setEditEvent(null);
    setDrawerOpen(true);
  };

  if (!state.isLoaded) {
    return (
      <div>
        <PageHeader title="Recurrentes" />
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Recurrentes"
        action={
          <button
            onClick={handleAdd}
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
          >
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={2.2} /> Nuevo
          </button>
        }
      />

      <div className="space-y-6 p-4">
        {!hasAny ? (
          <EmptyState
            message="No hay eventos recurrentes"
            icon={<Repeat className="h-12 w-12" strokeWidth={1} />}
          />
        ) : (
          <>
            {overdue.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-600">
                  <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Vencidos sin pagar ({overdue.length})
                </h2>
                {overdue.map((item) => (
                  <RecurringCard
                    key={item.event.id}
                    event={item.event}
                    status="overdue"
                  />
                ))}
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="space-y-3">
                <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/35">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Próximos sin pagar ({upcoming.length})
                </h2>
                {upcoming.map((item) => (
                  <RecurringCard
                    key={item.event.id}
                    event={item.event}
                    status="upcoming"
                  />
                ))}
              </div>
            )}

            {paid.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowPaid((v) => !v)}
                  className="flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/35 transition-colors hover:text-foreground/55"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Pagados este mes ({paid.length})
                  <ChevronDown
                    className={`ml-auto h-4 w-4 transition-transform ${
                      showPaid ? "rotate-180" : ""
                    }`}
                    strokeWidth={2}
                  />
                </button>
                {showPaid &&
                  paid.map((item) => (
                    <RecurringCard
                      key={item.event.id}
                      event={item.event}
                      status="paid"
                    />
                  ))}
              </div>
            )}

            {inactiveEvents.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/35">
                  Inactivos ({inactiveEvents.length})
                </h2>
                {inactiveEvents.map((event) => (
                  <RecurringCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <RecurringFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editEvent={editEvent}
      />
    </div>
  );
}
