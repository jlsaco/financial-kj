"use client";

import { useFinance } from "@/contexts/finance-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <h2 className="mb-2 text-sm font-semibold">Próximos pagos</h2>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {upcoming.map((item) => (
            <Card key={item.recurringEvent.id} className="min-w-[200px] shrink-0">
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">
                    {item.recurringEvent.name}
                  </p>
                  {item.daysUntilDue === 0 ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 ml-2 shrink-0">
                      <AlertCircle className="mr-1 h-3 w-3" /> Hoy
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 ml-2 shrink-0">
                      <Clock className="mr-1 h-3 w-3" /> {item.daysUntilDue}d
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-lg font-bold">
                  {formatCurrency(item.amount)}
                </p>
                <CategoryBadge
                  category={item.recurringEvent.category}
                  className="mt-1 text-[10px]"
                />
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
