"use client";

import Link from "next/link";
import { RecurringEvent } from "@/types";
import { CategoryBadge } from "@/components/shared/category-badge";
import { UserAvatar } from "@/components/shared/user-selector";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/formatters";
import { ChevronRight } from "lucide-react";
import { useFinance } from "@/contexts/finance-context";

interface RecurringCardProps {
  event: RecurringEvent;
}

export function RecurringCard({ event }: RecurringCardProps) {
  const { updateRecurringEvent } = useFinance();

  const toggleActive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await updateRecurringEvent(event.id, { isActive: !event.isActive });
    } catch {
      // silently fail — toast handled by context if needed
    }
  };

  return (
    <Link href={`/recurrentes/${event.id}`}>
      <div className="group flex items-center gap-3 rounded-2xl bg-card px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.08)] transition-all hover:bg-accent/40 active:scale-[0.99]">
        <UserAvatar userId={event.userId} />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{event.name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
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
            <span className="text-xs text-foreground/40">
              Dia {event.dayOfMonth}
            </span>
          </div>
        </div>
        <p
          className={`shrink-0 text-sm font-bold tabular-nums font-mono ${
            event.type === "ingreso" ? "text-emerald-600" : ""
          }`}
        >
          {event.type === "ingreso" ? "+" : ""}
          {formatCurrency(event.defaultAmount)}
        </p>
        <div
          className="flex size-11 shrink-0 items-center justify-center"
          onClick={toggleActive}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Switch checked={event.isActive} />
        </div>
        <ChevronRight className="h-4 w-4 text-foreground/25" strokeWidth={1.5} />
      </div>
    </Link>
  );
}
