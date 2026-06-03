"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Car,
  HeartPulse,
  Home,
  CreditCard,
  Wifi,
} from "lucide-react";
import { UserSelector } from "@/components/shared/user-selector";
import { useFinance } from "@/contexts/finance-context";
import { Category, RecurringEvent, UserId } from "@/types";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/constants";
import { computeDebtEndDate } from "@/lib/debt-helpers";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

const CATEGORY_ICON_MAP = { Car, HeartPulse, Home, CreditCard, Wifi };

interface RecurringFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEvent?: RecurringEvent | null;
}

export function RecurringFormDrawer({
  open,
  onOpenChange,
  editEvent,
}: RecurringFormDrawerProps) {
  const { addRecurringEvent, updateRecurringEvent } = useFinance();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [category, setCategory] = useState<Category>("servicios");
  const [userId, setUserId] = useState<UserId>("jose");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Campos de deuda (solo se usan cuando category === 'deuda').
  const [totalAmount, setTotalAmount] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState("");
  const [interestRate, setInterestRate] = useState("");

  useEffect(() => {
    if (editEvent) {
      setName(editEvent.name);
      setDefaultAmount(editEvent.defaultAmount.toString());
      setDayOfMonth(editEvent.dayOfMonth.toString());
      setCategory(editEvent.category);
      setUserId(editEvent.userId);
      setStartDate(editEvent.startDate ?? "");
      setEndDate(editEvent.endDate ?? "");
      setTotalAmount(editEvent.totalAmount?.toString() ?? "");
      setPrincipalAmount(editEvent.principalAmount?.toString() ?? "");
      setInstallmentsCount(editEvent.installmentsCount?.toString() ?? "");
      setInterestRate(editEvent.interestRate?.toString() ?? "");
    } else {
      setName("");
      setDefaultAmount("");
      setDayOfMonth("1");
      setCategory("servicios");
      setUserId("jose");
      setStartDate("");
      setEndDate("");
      setTotalAmount("");
      setPrincipalAmount("");
      setInstallmentsCount("");
      setInterestRate("");
    }
  }, [editEvent, open]);

  const isDebt = category === "deuda";

  // Cuota mensual sugerida = total ÷ nº cuotas (para deudas).
  const parsedTotal = parseFloat(totalAmount);
  const parsedInstallments = parseInt(installmentsCount);
  const suggestedInstallment =
    isDebt &&
    !isNaN(parsedTotal) &&
    parsedTotal > 0 &&
    !isNaN(parsedInstallments) &&
    parsedInstallments > 0
      ? parsedTotal / parsedInstallments
      : null;

  const handleSubmit = async () => {
    const parsedDay = parseInt(dayOfMonth);

    if (!name.trim() || isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      toast.error("Completa todos los campos correctamente");
      return;
    }

    // Para deudas el monto de la cuota se deriva de total ÷ cuotas; para el
    // resto se toma del campo "Monto por defecto".
    let parsedAmount: number;
    if (isDebt) {
      if (isNaN(parsedTotal) || parsedTotal <= 0) {
        toast.error("El total a pagar debe ser mayor a 0");
        return;
      }
      if (isNaN(parsedInstallments) || parsedInstallments < 1) {
        toast.error("El número de cuotas debe ser un entero mayor a 0");
        return;
      }
      parsedAmount = parsedTotal / parsedInstallments;
    } else {
      parsedAmount = parseFloat(defaultAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error("Completa todos los campos correctamente");
        return;
      }
    }

    // Ambas fechas son opcionales; si ambas existen, fin no puede ser anterior a inicio.
    if (startDate && endDate && endDate < startDate) {
      toast.error("La fecha de fin no puede ser anterior a la de inicio");
      return;
    }

    // Para deudas calculamos end_date = inicio (o mes actual) + (cuotas − 1)
    // meses en el día del mes; el resto de recurrentes conserva su endDate manual.
    const parsedPrincipal = parseFloat(principalAmount);
    const parsedRate = parseFloat(interestRate);
    const debtFields = isDebt
      ? {
          totalAmount: parsedTotal,
          principalAmount: isNaN(parsedPrincipal) ? undefined : parsedPrincipal,
          interestRate: isNaN(parsedRate) ? undefined : parsedRate,
          installmentsCount: parsedInstallments,
        }
      : {};
    const computedEndDate = isDebt
      ? computeDebtEndDate(parsedDay, parsedInstallments, startDate || undefined) ??
        undefined
      : endDate || undefined;

    setSaving(true);
    try {
      if (editEvent) {
        await updateRecurringEvent(editEvent.id, {
          name: name.trim(),
          defaultAmount: parsedAmount,
          dayOfMonth: parsedDay,
          category,
          userId,
          startDate: startDate || undefined,
          endDate: computedEndDate,
          ...debtFields,
        });
        toast.success("Evento actualizado");
      } else {
        await addRecurringEvent({
          name: name.trim(),
          defaultAmount: parsedAmount,
          dayOfMonth: parsedDay,
          category,
          userId,
          isActive: true,
          startDate: startDate || undefined,
          endDate: computedEndDate,
          ...debtFields,
        });
        toast.success(isDebt ? "Deuda creada" : "Evento recurrente creado");
      }
      onOpenChange(false);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
          <DrawerHeader>
            <DrawerTitle>
              {editEvent
                ? "Editar evento"
                : isDebt
                ? "Nueva deuda"
                : "Nuevo evento recurrente"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-2">
            <div className="space-y-1.5">
              <Label htmlFor="event-name" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Nombre</Label>
              <Input
                id="event-name"
                placeholder="Ej: Netflix, Renta, Tarjeta"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {!isDebt && (
              <div className="space-y-1.5">
                <Label htmlFor="event-amount" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Monto por defecto</Label>
                <Input
                  id="event-amount"
                  type="number"
                  placeholder="0"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                  className="h-12 text-xl font-semibold tabular-nums"
                  inputMode="numeric"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="event-day" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Dia del mes</Label>
              <Input
                id="event-day"
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
              />
            </div>

            <div className={isDebt ? "space-y-1.5" : "grid grid-cols-2 gap-3"}>
              <div className="space-y-1.5">
                <Label htmlFor="event-start-date" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Fecha de inicio</Label>
                <Input
                  id="event-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              {!isDebt && (
                <div className="space-y-1.5">
                  <Label htmlFor="event-end-date" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Fecha de fin</Label>
                  <Input
                    id="event-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Categoria</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_CATEGORIES.map((cat) => {
                  const config = CATEGORIES[cat];
                  const Icon = CATEGORY_ICON_MAP[config.icon as keyof typeof CATEGORY_ICON_MAP];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                        category === cat
                          ? `${config.color} text-white shadow-sm`
                          : "border border-border/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4" strokeWidth={1.5} />}
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isDebt && (
              <div className="space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Detalles de la deuda
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="debt-total" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Total a pagar</Label>
                    <Input
                      id="debt-total"
                      type="number"
                      placeholder="0"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="tabular-nums"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="debt-installments" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Nº de cuotas</Label>
                    <Input
                      id="debt-installments"
                      type="number"
                      min={1}
                      placeholder="0"
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(e.target.value)}
                      className="tabular-nums"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="debt-principal" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Capital prestado</Label>
                    <Input
                      id="debt-principal"
                      type="number"
                      placeholder="Opcional"
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(e.target.value)}
                      className="tabular-nums"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="debt-rate" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">% de interés</Label>
                    <Input
                      id="debt-rate"
                      type="number"
                      placeholder="Opcional"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="tabular-nums"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {suggestedInstallment !== null && (
                  <div className="flex items-center justify-between rounded-xl bg-background px-3 py-2.5">
                    <span className="text-[12px] text-muted-foreground">Cuota mensual</span>
                    <span className="text-base font-semibold tabular-nums font-mono">
                      {formatCurrency(suggestedInstallment)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Responsable</Label>
              <UserSelector value={userId} onChange={setUserId} />
            </div>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-semibold tracking-wide active:scale-[0.98] active:translate-y-[1px] transition-all">
              {editEvent ? "Guardar cambios" : isDebt ? "Crear deuda" : "Crear evento"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-xl font-medium active:scale-[0.98] transition-all"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
