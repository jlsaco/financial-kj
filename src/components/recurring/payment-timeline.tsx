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
  const { state, setMonthConfig } = useFinance();
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

  const saveAmount = async (month: number, year: number) => {
    const parsed = parseFloat(editAmount);
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Monto inválido");
      return;
    }

    const existing = getConfig(month, year);
    try {
      await setMonthConfig({
        recurringEventId: event.id,
        month,
        year,
        amount: parsed,
        isPaid: existing?.isPaid ?? false,
        paidDate: existing?.paidDate,
        recordId: existing?.recordId,
        note: existing?.note,
      });
      setEditingMonth(null);
      toast.success("Monto actualizado");
    } catch {
      toast.error("Error al guardar");
    }
  };

  const togglePaid = async (month: number, year: number) => {
    const existing = getConfig(month, year);
    const newIsPaid = !existing?.isPaid;
    try {
      await setMonthConfig({
        recurringEventId: event.id,
        month,
        year,
        amount: existing?.amount ?? event.defaultAmount,
        isPaid: newIsPaid,
        paidDate: newIsPaid ? new Date().toISOString() : undefined,
        note: existing?.note,
      });
      toast.success(newIsPaid ? "Marcado como pagado" : "Marcado como pendiente");
    } catch {
      toast.error("Error al guardar");
    }
  };

  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-0 h-full w-px bg-border/50" />

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
              "relative mb-3 rounded-xl border p-3.5 transition-colors",
              isCurrent && "border-primary/30 bg-primary/5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
              config?.isPaid && "border-emerald-200/60 bg-emerald-50/50",
              !isCurrent && !config?.isPaid && "border-border/30"
            )}
          >
            {/* Timeline dot */}
            <div
              className={cn(
                "absolute -left-6 top-4 h-2.5 w-2.5 rounded-full border-2 border-background",
                config?.isPaid
                  ? "bg-emerald-500"
                  : isCurrent
                  ? "bg-primary"
                  : isPast
                  ? "bg-muted-foreground/40"
                  : "bg-muted"
              )}
            />

            <div className="flex items-center justify-between">
              <div>
                <span
                  className={cn(
                    "text-[13px] font-medium capitalize",
                    isCurrent && "text-primary"
                  )}
                >
                  {getMonthLabel(month, year)}
                </span>
                <span className="ml-2 text-[11px] text-muted-foreground/60">
                  Dia {effectiveDay}
                </span>
              </div>

              {/* Status badge */}
              {config?.isPaid ? (
                <span className="inline-flex items-center rounded-lg bg-emerald-100/80 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <Check className="mr-1 h-3 w-3" /> Pagado
                </span>
              ) : isCurrent ? (
                <span className={cn(
                  "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium",
                  diffDays < 0
                    ? "bg-rose-100/80 text-rose-700"
                    : diffDays <= 5
                    ? "bg-amber-100/80 text-amber-700"
                    : "bg-blue-100/80 text-blue-700"
                )}>
                  {diffDays < 0 ? (
                    <><AlertCircle className="mr-1 h-3 w-3" /> Vencido</>
                  ) : diffDays === 0 ? (
                    <><Clock className="mr-1 h-3 w-3" /> Hoy</>
                  ) : (
                    <><Clock className="mr-1 h-3 w-3" /> En {diffDays} dias</>
                  )}
                </span>
              ) : isPast && !config?.isPaid ? (
                <span className="inline-flex items-center rounded-lg bg-rose-100/80 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                  <AlertCircle className="mr-1 h-3 w-3" /> No pagado
                </span>
              ) : null}
            </div>

            {/* Amount row */}
            <div className="mt-2.5 flex items-center justify-between">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="h-8 w-28 text-[13px] tabular-nums"
                    inputMode="numeric"
                    autoFocus
                  />
                  <Button size="sm" className="h-7 rounded-lg px-3 text-[12px] active:scale-[0.97]" onClick={() => saveAmount(month, year)}>
                    OK
                  </Button>
                  <button
                    className="h-7 px-2 text-[12px] text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingMonth(null)}
                  >
                    X
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold tabular-nums font-mono">{formatCurrency(amount)}</span>
                  {config && config.amount !== event.defaultAmount && (
                    <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Personalizado
                    </span>
                  )}
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 hover:bg-accent hover:text-foreground transition-colors"
                    onClick={() => startEditing(month, year, amount)}
                  >
                    <Pencil className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
              )}

              <button
                onClick={() => togglePaid(month, year)}
                className={cn(
                  "h-7 rounded-lg px-3 text-[12px] font-medium transition-all active:scale-[0.97]",
                  config?.isPaid
                    ? "border border-border/50 text-muted-foreground hover:bg-accent"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {config?.isPaid ? "Desmarcar" : "Pagado"}
              </button>
            </div>

            {config?.note && (
              <p className="mt-1.5 text-[11px] text-muted-foreground/60">{config.note}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
