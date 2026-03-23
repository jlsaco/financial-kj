"use client";

import { useFinance } from "@/contexts/finance-context";
import { CategoryBadge } from "@/components/shared/category-badge";
import { formatCurrency } from "@/lib/formatters";
import { Clock, AlertCircle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function UpcomingEvents() {
  const { getUpcomingEvents } = useFinance();
  const upcoming = getUpcomingEvents();

  if (upcoming.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/35">Proximos pagos</h2>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {upcoming.map((item) => (
            <div
              key={item.recurringEvent.id}
              className="min-w-[190px] shrink-0 rounded-2xl bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.08)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold truncate">
                  {item.recurringEvent.name}
                </p>
                {item.daysUntilDue === 0 ? (
                  <span className="ml-2 shrink-0 inline-flex items-center rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    <AlertCircle className="mr-1 h-3 w-3" /> Hoy
                  </span>
                ) : (
                  <span className="ml-2 shrink-0 inline-flex items-center rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    <Clock className="mr-1 h-3 w-3" /> {item.daysUntilDue}d
                  </span>
                )}
              </div>
              <p className="mt-2 text-lg font-bold tabular-nums font-mono">
                {formatCurrency(item.amount)}
              </p>
              <CategoryBadge
                category={item.recurringEvent.category}
                className="mt-2"
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
