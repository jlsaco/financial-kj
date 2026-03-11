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
    <div className="sticky top-0 z-40 border-b border-border/40 bg-card/80 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {action}
        </div>
        {showMonthNav && (
          <div className="mt-1 flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg transition-transform active:scale-95"
              onClick={prevMonth}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            <span className="min-w-[150px] text-center text-[13px] font-medium capitalize text-muted-foreground">
              {formatMonthYear(selectedMonth, selectedYear)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg transition-transform active:scale-95"
              onClick={nextMonth}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
