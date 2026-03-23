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
  const { dispatch } = useFinance();

  const toggleActive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({
      type: "UPDATE_RECURRING",
      payload: { id: event.id, updates: { isActive: !event.isActive } },
    });
  };

  return (
    <Link href={`/recurrentes/${event.id}`}>
      <div className="group flex items-center gap-3 rounded-2xl bg-card px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.08)] transition-all hover:bg-accent/40 active:scale-[0.99]">
        <UserAvatar userId={event.userId} />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{event.name}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <CategoryBadge category={event.category} />
            <span className="text-xs text-foreground/40">
              Dia {event.dayOfMonth}
            </span>
          </div>
        </div>
        <p className="text-sm font-bold tabular-nums font-mono">
          {formatCurrency(event.defaultAmount)}
        </p>
        <div onClick={toggleActive}>
          <Switch checked={event.isActive} />
        </div>
        <ChevronRight className="h-4 w-4 text-foreground/25" strokeWidth={1.5} />
      </div>
    </Link>
  );
}
