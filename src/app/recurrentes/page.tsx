"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RecurringCard } from "@/components/recurring/recurring-card";
import { RecurringFormDrawer } from "@/components/recurring/recurring-form-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { useFinance } from "@/contexts/finance-context";
import { RecurringEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, CalendarClock } from "lucide-react";

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
          <Button size="sm" onClick={handleAdd}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo
          </Button>
        }
      />

      <div className="space-y-3 p-4">
        {activeEvents.length === 0 && inactiveEvents.length === 0 ? (
          <EmptyState
            message="No hay eventos recurrentes"
            icon={<CalendarClock className="h-10 w-10" />}
          />
        ) : (
          <>
            {activeEvents.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Activos ({activeEvents.length})
                </h2>
                {activeEvents.map((event) => (
                  <RecurringCard key={event.id} event={event} />
                ))}
              </div>
            )}

            {inactiveEvents.length > 0 && (
              <div className="mt-6 space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
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
