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
    <div className="sticky top-0 z-40 border-b bg-background px-4 py-3">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{title}</h1>
          {action}
        </div>
        {showMonthNav && (
          <div className="mt-1 flex items-center justify-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium capitalize">
              {formatMonthYear(selectedMonth, selectedYear)}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
