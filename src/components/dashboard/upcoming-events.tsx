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
      <h2 className="mb-2.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Proximos pagos</h2>
      <ScrollArea className="w-full">
        <div className="flex gap-2.5 pb-2">
          {upcoming.map((item) => (
            <div
              key={item.recurringEvent.id}
              className="min-w-[180px] shrink-0 rounded-xl border border-border/30 bg-card p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium truncate">
                  {item.recurringEvent.name}
                </p>
                {item.daysUntilDue === 0 ? (
                  <span className="ml-2 shrink-0 inline-flex items-center rounded-md bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    <AlertCircle className="mr-0.5 h-2.5 w-2.5" /> Hoy
                  </span>
                ) : (
                  <span className="ml-2 shrink-0 inline-flex items-center rounded-md bg-blue-100/80 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    <Clock className="mr-0.5 h-2.5 w-2.5" /> {item.daysUntilDue}d
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-base font-semibold tabular-nums font-mono">
                {formatCurrency(item.amount)}
              </p>
              <CategoryBadge
                category={item.recurringEvent.category}
                className="mt-1.5 text-[10px] py-0 px-1.5"
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
