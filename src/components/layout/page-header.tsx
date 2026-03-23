"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUI } from "@/contexts/ui-context";
import { formatMonthYear } from "@/lib/formatters";

interface PageHeaderProps {
  title: string;
  showMonthNav?: boolean;
  action?: React.ReactNode;
}

export function PageHeader({ title, showMonthNav, action }: PageHeaderProps) {
  const { selectedMonth, selectedYear, prevMonth, nextMonth } = useUI();

  return (
    <div className="sticky top-0 z-40 bg-background px-4 pb-2 pt-4">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          {action}
        </div>
        {showMonthNav && (
          <div className="mt-2 flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl transition-transform active:scale-95"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </Button>
            <span className="min-w-[160px] text-center text-sm font-medium capitalize text-foreground/70">
              {formatMonthYear(selectedMonth, selectedYear)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl transition-transform active:scale-95"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
