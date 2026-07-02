"use client";

import { useEffect, useState } from "react";
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
import { CalendarClock, TrendingDown } from "lucide-react";
import { AbonoEffect } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AbonoPreview {
  /** Cuota tras el abono. */
  installment: number;
  /** Nº de cuotas restantes tras el abono. */
  remaining: number;
  /** Saldo de capital tras el abono. */
  outstanding: number;
}

interface AbonoFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetName: string;
  onSubmit: (data: {
    amount: number;
    effect: AbonoEffect;
    date: string;
    note?: string;
  }) => Promise<void>;
  /** Devuelve una vista previa del recálculo para el monto/efecto dados. */
  getPreview?: (amount: number, effect: AbonoEffect) => AbonoPreview | null;
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Drawer para registrar un abono a capital y elegir su efecto en el plan. */
export function AbonoFormDrawer({
  open,
  onOpenChange,
  targetName,
  onSubmit,
  getPreview,
}: AbonoFormDrawerProps) {
  const [amount, setAmount] = useState("");
  const [effect, setEffect] = useState<AbonoEffect>("reducir_plazo");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount("");
      setEffect("reducir_plazo");
      setDate(todayStr());
      setNote("");
    }
  }, [open]);

  const parsed = parseFloat(amount);
  const validAmount = !isNaN(parsed) && parsed > 0;
  const preview =
    validAmount && getPreview ? getPreview(parsed, effect) : null;

  const handleSave = async () => {
    if (!validAmount || !date) {
      toast.error("Ingresa un monto y una fecha válidos");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ amount: parsed, effect, date, note: note.trim() || undefined });
      toast.success("Abono a capital registrado");
      onOpenChange(false);
    } catch {
      toast.error("Error al registrar el abono");
    } finally {
      setSaving(false);
    }
  };

  const effects: {
    id: AbonoEffect;
    title: string;
    desc: string;
    icon: typeof TrendingDown;
  }[] = [
    {
      id: "reducir_plazo",
      title: "Reducir plazo",
      desc: "Misma cuota, terminas antes",
      icon: CalendarClock,
    },
    {
      id: "reducir_cuota",
      title: "Reducir cuota",
      desc: "Mismas cuotas, pagas menos cada mes",
      icon: TrendingDown,
    },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
          <DrawerHeader>
            <DrawerTitle>Abonar a capital</DrawerTitle>
            <p className="text-[13px] text-muted-foreground/70">{targetName}</p>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="abono-amount"
                  className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70"
                >
                  Monto del abono
                </Label>
                <Input
                  id="abono-amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-2xl font-semibold tabular-nums"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                  Efecto del abono
                </Label>
                <div className="grid gap-2">
                  {effects.map((opt) => {
                    const Icon = opt.icon;
                    const active = effect === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEffect(opt.id)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all active:scale-[0.99]",
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border/60 hover:border-border"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.7} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold">{opt.title}</p>
                          <p className="text-[11px] text-muted-foreground/70">
                            {opt.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Vista previa del recálculo */}
              {preview && (
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/40">
                    Tras el abono
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-foreground/40">Cuota</p>
                      <p className="text-[12px] font-semibold tabular-nums font-mono">
                        {formatCurrency(preview.installment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-foreground/40">Cuotas</p>
                      <p className="text-[12px] font-semibold tabular-nums">
                        {preview.remaining}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-foreground/40">Capital</p>
                      <p className="text-[12px] font-semibold tabular-nums font-mono">
                        {formatCurrency(preview.outstanding)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor="abono-date"
                  className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70"
                >
                  Fecha
                </Label>
                <Input
                  id="abono-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="abono-note"
                  className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70"
                >
                  Nota (opcional)
                </Label>
                <Input
                  id="abono-note"
                  placeholder="p.ej. prima de fin de año"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleSave}
              disabled={saving || !validAmount}
              className="h-11 w-full rounded-xl font-semibold tracking-wide transition-all active:translate-y-[1px] active:scale-[0.98]"
            >
              Registrar abono
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 w-full rounded-xl font-medium transition-all active:scale-[0.98]"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
