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

  useEffect(() => {
    if (editEvent) {
      setName(editEvent.name);
      setDefaultAmount(editEvent.defaultAmount.toString());
      setDayOfMonth(editEvent.dayOfMonth.toString());
      setCategory(editEvent.category);
      setUserId(editEvent.userId);
    } else {
      setName("");
      setDefaultAmount("");
      setDayOfMonth("1");
      setCategory("servicios");
      setUserId("jose");
    }
  }, [editEvent, open]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(defaultAmount);
    const parsedDay = parseInt(dayOfMonth);
    if (
      !name.trim() ||
      isNaN(parsedAmount) ||
      parsedAmount <= 0 ||
      isNaN(parsedDay) ||
      parsedDay < 1 ||
      parsedDay > 31
    ) {
      toast.error("Completa todos los campos correctamente");
      return;
    }

    setSaving(true);
    try {
      if (editEvent) {
        await updateRecurringEvent(editEvent.id, {
          name: name.trim(),
          defaultAmount: parsedAmount,
          dayOfMonth: parsedDay,
          category,
          userId,
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
        });
        toast.success("Evento recurrente creado");
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
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>
              {editEvent ? "Editar evento" : "Nuevo evento recurrente"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="space-y-5 px-4">
            <div className="space-y-1.5">
              <Label htmlFor="event-name" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Nombre</Label>
              <Input
                id="event-name"
                placeholder="Ej: Netflix, Renta, Tarjeta"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Responsable</Label>
              <UserSelector value={userId} onChange={setUserId} />
            </div>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-semibold tracking-wide active:scale-[0.98] active:translate-y-[1px] transition-all">
              {editEvent ? "Guardar cambios" : "Crear evento"}
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
