"use client";

import { useState, useEffect, useMemo } from "react";
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
  Plus,
  Link2,
  Search,
} from "lucide-react";
import { UserSelector } from "@/components/shared/user-selector";
import { useFinance } from "@/contexts/finance-context";
import { Category, RecurringEvent, UserId } from "@/types";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/constants";
import { getEffectiveDayOfMonth } from "@/lib/date-helpers";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORY_ICON_MAP = { Car, HeartPulse, Home, CreditCard, Wifi };

interface MarkPaidDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: RecurringEvent;
  month: number;
  year: number;
  /** Monto de la cuota del mes (config.amount o defaultAmount). */
  monthAmount: number;
}

type Mode = "create" | "link";

/** Fecha YYYY-MM-DD del vencimiento efectivo de la cuota en su mes. */
function dueDateString(event: RecurringEvent, month: number, year: number): string {
  const day = getEffectiveDayOfMonth(event.dayOfMonth, month, year);
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function MarkPaidDrawer({
  open,
  onOpenChange,
  event,
  month,
  year,
  monthAmount,
}: MarkPaidDrawerProps) {
  const { state, addRecord, setMonthConfig, deleteRecord } = useFinance();
  const [mode, setMode] = useState<Mode>("create");
  const [saving, setSaving] = useState(false);

  // --- Camino (a): formulario prellenado desde el recurrente ---
  const [name, setName] = useState(event.name);
  const [amount, setAmount] = useState(monthAmount.toString());
  const [category, setCategory] = useState<Category>(event.category);
  const [userId, setUserId] = useState<UserId>(event.userId);
  const [date, setDate] = useState(dueDateString(event, month, year));

  // --- Camino (b): buscar gasto existente del mismo mes ---
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setMode("create");
      setName(event.name);
      setAmount(monthAmount.toString());
      setCategory(event.category);
      setUserId(event.userId);
      setDate(dueDateString(event, month, year));
      setSearch("");
    }
  }, [open, event, month, year, monthAmount]);

  // Registros del MISMO MES (cualquier categoría) para vincular.
  const monthRecords = useMemo(() => {
    return state.records
      .filter((r) => {
        const d = new Date(r.date + "T12:00:00");
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [state.records, month, year]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return monthRecords;
    return monthRecords.filter((r) => r.name.toLowerCase().includes(q));
  }, [monthRecords, search]);

  const handleCreate = async () => {
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0 || !date) {
      toast.error("Completa todos los campos correctamente");
      return;
    }
    setSaving(true);
    try {
      // 1) Crear el gasto vinculado al recurrente.
      const saved = await addRecord({
        name: name.trim(),
        amount: parsedAmount,
        type: "gasto",
        category,
        userId,
        date,
        recurringEventId: event.id,
      });
      // 2) Marcar la cuota del mes como pagada, apuntando al registro creado.
      //    Si el upsert falla, hacemos rollback del registro recién creado
      //    para no dejar un finance_record huérfano (y evitar duplicados al reintentar).
      try {
        await setMonthConfig({
          recurringEventId: event.id,
          month,
          year,
          amount: parsedAmount,
          isPaid: true,
          paidDate: date,
          recordId: saved.id,
        });
      } catch (err) {
        await deleteRecord(saved.id);
        throw err;
      }
      toast.success("Gasto creado y mes marcado como pagado");
      onOpenChange(false);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleLink = async (recordId: string, recordDate: string) => {
    setSaving(true);
    try {
      await setMonthConfig({
        recurringEventId: event.id,
        month,
        year,
        amount: monthAmount,
        isPaid: true,
        paidDate: recordDate,
        recordId,
      });
      toast.success("Gasto vinculado y mes marcado como pagado");
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
            <DrawerTitle>Marcar como pagado</DrawerTitle>
          </DrawerHeader>

          <div className="px-4">
            {/* Selector de modo */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("create")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold tracking-wide transition-all active:scale-[0.98]",
                  mode === "create"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border/60 text-muted-foreground hover:border-border"
                )}
              >
                <Plus className="h-4 w-4" strokeWidth={1.8} />
                Crear gasto
              </button>
              <button
                type="button"
                onClick={() => setMode("link")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold tracking-wide transition-all active:scale-[0.98]",
                  mode === "link"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border/60 text-muted-foreground hover:border-border"
                )}
              >
                <Link2 className="h-4 w-4" strokeWidth={1.8} />
                Vincular existente
              </button>
            </div>
          </div>

          {mode === "create" ? (
            <div className="mt-5 space-y-5 px-4">
              <div className="space-y-1.5">
                <Label htmlFor="mp-amount" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Valor</Label>
                <Input
                  id="mp-amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-2xl font-semibold tabular-nums"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mp-name" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Nombre</Label>
                <Input
                  id="mp-name"
                  placeholder="Descripcion del registro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
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
                <Label htmlFor="mp-date" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Fecha</Label>
                <Input
                  id="mp-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Registrado por</Label>
                <UserSelector value={userId} onChange={setUserId} />
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3 px-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" strokeWidth={1.8} />
                <Input
                  placeholder="Buscar gasto del mes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-[45vh] space-y-2 overflow-y-auto pb-2">
                {filteredRecords.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-muted-foreground/60">
                    No hay gastos en este mes
                  </p>
                ) : (
                  filteredRecords.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      disabled={saving}
                      onClick={() => handleLink(r.id, r.date)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/40 p-3 text-left transition-colors hover:border-border hover:bg-accent/40 active:scale-[0.99] disabled:opacity-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground/60">
                          {CATEGORIES[r.category].label} · {r.date}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums">
                        {formatCurrency(r.amount)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <DrawerFooter>
            {mode === "create" && (
              <Button
                onClick={handleCreate}
                disabled={saving}
                className="w-full h-11 rounded-xl font-semibold tracking-wide active:scale-[0.98] active:translate-y-[1px] transition-all"
              >
                Crear gasto y marcar pagado
              </Button>
            )}
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
