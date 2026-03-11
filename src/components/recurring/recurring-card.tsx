"use client";

import Link from "next/link";
import { RecurringEvent } from "@/types";
import { CategoryBadge } from "@/components/shared/category-badge";
import { UserAvatar } from "@/components/shared/user-selector";
import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-3 py-4">
          <UserAvatar userId={event.userId} />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{event.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <CategoryBadge category={event.category} className="text-[10px]" />
              <span className="text-xs text-muted-foreground">
                Día {event.dayOfMonth}
              </span>
            </div>
          </div>
          <p className="text-sm font-semibold">
            {formatCurrency(event.defaultAmount)}
          </p>
          <div onClick={toggleActive}>
            <Switch checked={event.isActive} />
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
