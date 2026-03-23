"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RecurringCard } from "@/components/recurring/recurring-card";
import { RecurringFormDrawer } from "@/components/recurring/recurring-form-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { useFinance } from "@/contexts/finance-context";
import { RecurringEvent } from "@/types";
import { Plus, Repeat } from "lucide-react";

export default function RecurrentesPage() {
  const { state } = useFinance();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<RecurringEvent | null>(null);

  const activeEvents = state.recurringEvents.filter((e) => e.isActive);
  const inactiveEvents = state.recurringEvents.filter((e) => !e.isActive);

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

      <div className="space-y-4 p-4">
        {activeEvents.length === 0 && inactiveEvents.length === 0 ? (
          <EmptyState
            message="No hay eventos recurrentes"
            icon={<Repeat className="h-12 w-12" strokeWidth={1} />}
          />
        ) : (
          <>
            {activeEvents.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/35">
                  Activos ({activeEvents.length})
                </h2>
                {activeEvents.map((event) => (
                  <RecurringCard key={event.id} event={event} />
                ))}
              </div>
            )}

            {inactiveEvents.length > 0 && (
              <div className="mt-6 space-y-3">
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
