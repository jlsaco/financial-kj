"use client";

import { useState } from "react";
import { RecurringEvent, MonthPaymentConfig } from "@/types";
import { useFinance } from "@/contexts/finance-context";
import { getEffectiveDayOfMonth } from "@/lib/date-helpers";
import { formatCurrency } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PaymentTimelineProps {
  event: RecurringEvent;
}

export function PaymentTimeline({ event }: PaymentTimelineProps) {
  const { state, dispatch } = useFinance();
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Generate 12 months: 3 past + current + 8 future
  const months: { month: number; year: number }[] = [];
  for (let offset = -3; offset <= 8; offset++) {
    let m = currentMonth + offset;
    let y = currentYear;
    while (m < 1) { m += 12; y--; }
    while (m > 12) { m -= 12; y++; }
    months.push({ month: m, year: y });
  }

  const getConfig = (month: number, year: number): MonthPaymentConfig | undefined => {
    return state.monthConfigs.find(
      (c) =>
        c.recurringEventId === event.id &&
        c.month === month &&
        c.year === year
    );
  };

  const getMonthLabel = (month: number, year: number): string => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("es-CO", { month: "short", year: "numeric" });
  };

  const isCurrentMonth = (month: number, year: number): boolean =>
    month === currentMonth && year === currentYear;

  const isPastMonth = (month: number, year: number): boolean => {
    if (year < currentYear) return true;
    if (year === currentYear && month < currentMonth) return true;
    return false;
  };

  const getDueInfo = (month: number, year: number) => {
    const effectiveDay = getEffectiveDayOfMonth(event.dayOfMonth, month, year);
    const dueDate = new Date(year, month - 1, effectiveDay);
    dueDate.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil(
      (dueDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );
    return { dueDate, diffDays, effectiveDay };
  };

  const startEditing = (month: number, year: number, currentAmount: number) => {
    setEditingMonth(`${month}-${year}`);
    setEditAmount(currentAmount.toString());
  };

  const saveAmount = (month: number, year: number) => {
    const parsed = parseFloat(editAmount);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Monto inválido");
      return;
    }

    const existing = getConfig(month, year);
    const config: MonthPaymentConfig = {
      id: existing?.id ?? crypto.randomUUID(),
      recurringEventId: event.id,
      month,
      year,
      amount: parsed,
      isPaid: existing?.isPaid ?? false,
      paidDate: existing?.paidDate,
      recordId: existing?.recordId,
      note: existing?.note,
    };
    dispatch({ type: "SET_MONTH_CONFIG", payload: config });
    setEditingMonth(null);
    toast.success("Monto actualizado");
  };

  const togglePaid = (month: number, year: number) => {
    const existing = getConfig(month, year);
    const config: MonthPaymentConfig = {
      id: existing?.id ?? crypto.randomUUID(),
      recurringEventId: event.id,
      month,
      year,
      amount: existing?.amount ?? event.defaultAmount,
      isPaid: !existing?.isPaid,
      paidDate: !existing?.isPaid ? new Date().toISOString() : undefined,
      note: existing?.note,
    };
    dispatch({ type: "SET_MONTH_CONFIG", payload: config });
    toast.success(config.isPaid ? "Marcado como pagado" : "Marcado como pendiente");
  };

  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-0 h-full w-0.5 bg-border" />

      {months.map(({ month, year }) => {
        const config = getConfig(month, year);
        const amount = config?.amount ?? event.defaultAmount;
        const isCurrent = isCurrentMonth(month, year);
        const isPast = isPastMonth(month, year);
        const { diffDays, effectiveDay } = getDueInfo(month, year);
        const isEditing = editingMonth === `${month}-${year}`;

        return (
          <div
            key={`${month}-${year}`}
            className={cn(
              "relative mb-4 rounded-lg border p-3",
              isCurrent && "border-primary bg-primary/5",
              config?.isPaid && "border-green-200 bg-green-50"
            )}
          >
            {/* Timeline dot */}
            <div
              className={cn(
                "absolute -left-6 top-4 h-3 w-3 rounded-full border-2 border-background",
                config?.isPaid
                  ? "bg-green-500"
                  : isCurrent
                  ? "bg-primary"
                  : isPast
                  ? "bg-muted-foreground"
                  : "bg-muted"
              )}
            />

            <div className="flex items-center justify-between">
              <div>
                <span
                  className={cn(
                    "text-sm font-medium capitalize",
                    isCurrent && "text-primary"
                  )}
                >
                  {getMonthLabel(month, year)}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  Día {effectiveDay}
                </span>
              </div>

              {/* Status badge */}
              {config?.isPaid ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Check className="mr-1 h-3 w-3" /> Pagado
                </Badge>
              ) : isCurrent ? (
                <Badge variant="secondary" className={
                  diffDays < 0
                    ? "bg-red-100 text-red-700"
                    : diffDays <= 5
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }>
                  {diffDays < 0 ? (
                    <><AlertCircle className="mr-1 h-3 w-3" /> Vencido</>
                  ) : diffDays === 0 ? (
                    <><Clock className="mr-1 h-3 w-3" /> Hoy</>
                  ) : (
                    <><Clock className="mr-1 h-3 w-3" /> En {diffDays} días</>
                  )}
                </Badge>
              ) : isPast && !config?.isPaid ? (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  <AlertCircle className="mr-1 h-3 w-3" /> No pagado
                </Badge>
              ) : null}
            </div>

            {/* Amount row */}
            <div className="mt-2 flex items-center justify-between">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="h-8 w-32"
                    inputMode="numeric"
                    autoFocus
                  />
                  <Button size="sm" className="h-8" onClick={() => saveAmount(month, year)}>
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => setEditingMonth(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{formatCurrency(amount)}</span>
                  {config && config.amount !== event.defaultAmount && (
                    <Badge variant="outline" className="text-[10px]">
                      Personalizado
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => startEditing(month, year, amount)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <Button
                size="sm"
                variant={config?.isPaid ? "outline" : "default"}
                className="h-8"
                onClick={() => togglePaid(month, year)}
              >
                {config?.isPaid ? "Desmarcar" : "Marcar pagado"}
              </Button>
            </div>

            {config?.note && (
              <p className="mt-1 text-xs text-muted-foreground">{config.note}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
