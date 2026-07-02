"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Banknote, ArrowRight } from "lucide-react";
import { useFinance } from "@/contexts/finance-context";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

interface TransferenciaFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cuenta preseleccionada como origen (opcional). */
  defaultOrigenId?: string;
}

export function TransferenciaFormDrawer({
  open,
  onOpenChange,
  defaultOrigenId,
}: TransferenciaFormDrawerProps) {
  const { state, addTransferencia } = useFinance();
  const [saving, setSaving] = useState(false);

  const cuentas = state.cuentas.filter((c) => c.isActive);

  const [origenId, setOrigenId] = useState<string | undefined>(undefined);
  const [destinoId, setDestinoId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    setOrigenId(defaultOrigenId);
    setDestinoId(undefined);
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setNote("");
  }, [open, defaultOrigenId]);

  // Al elegir origen, si coincide con el destino, limpia el destino.
  const selectOrigen = (id: string) => {
    setOrigenId(id);
    if (destinoId === id) setDestinoId(undefined);
  };
  const selectDestino = (id: string) => {
    setDestinoId(id);
    if (origenId === id) setOrigenId(undefined);
  };

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!origenId || !destinoId) {
      toast.error("Elige cuenta de origen y destino");
      return;
    }
    if (origenId === destinoId) {
      toast.error("El origen y el destino deben ser distintos");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    setSaving(true);
    try {
      await addTransferencia({
        cuentaOrigenId: origenId,
        cuentaDestinoId: destinoId,
        amount: parsedAmount,
        date,
        note: note.trim() || undefined,
      });
      toast.success("Transferencia registrada");
      onOpenChange(false);
    } catch {
      toast.error("Error al registrar la transferencia");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
          <DrawerHeader>
            <DrawerTitle>Nueva transferencia</DrawerTitle>
            <DrawerDescription>
              Mueve dinero entre cuentas (p.ej. retiro de cajero). No cuenta como
              gasto ni ingreso.
            </DrawerDescription>
          </DrawerHeader>

          {cuentas.length < 2 ? (
            <div className="px-4 pb-4">
              <p className="text-[13px] text-muted-foreground/80">
                Necesitas al menos dos cuentas activas para transferir. Crea una
                cuenta de efectivo y una bancaria.
              </p>
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-2">
              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="transfer-amount" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                  Monto
                </Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-2xl font-semibold tabular-nums"
                  inputMode="numeric"
                />
              </div>

              {/* Origen */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                  Desde (origen)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {cuentas.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectOrigen(c.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                        origenId === c.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      {c.type === "cash" ? (
                        <Banknote className="h-4 w-4" strokeWidth={1.5} />
                      ) : (
                        <Wallet className="h-4 w-4" strokeWidth={1.5} />
                      )}
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destino */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                  Hacia (destino)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {cuentas
                    .filter((c) => c.id !== origenId)
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectDestino(c.id)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                          destinoId === c.id
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "border border-border/60 text-muted-foreground hover:border-border"
                        }`}
                      >
                        {c.type === "cash" ? (
                          <Banknote className="h-4 w-4" strokeWidth={1.5} />
                        ) : (
                          <Wallet className="h-4 w-4" strokeWidth={1.5} />
                        )}
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Preview */}
              {origenId && destinoId && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/50 bg-muted/30 p-3 text-[13px] font-medium">
                  <span className="truncate">
                    {cuentas.find((c) => c.id === origenId)?.name}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.8} />
                  <span className="truncate">
                    {cuentas.find((c) => c.id === destinoId)?.name}
                  </span>
                  {!isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                    <span className="ml-1 shrink-0 font-bold tabular-nums">
                      {formatCurrency(parseFloat(amount))}
                    </span>
                  )}
                </div>
              )}

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="transfer-date" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                  Fecha
                </Label>
                <Input
                  id="transfer-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label htmlFor="transfer-note" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                  Nota (opcional)
                </Label>
                <Input
                  id="transfer-note"
                  placeholder="Ej. Retiro cajero"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <DrawerFooter>
            {cuentas.length >= 2 && (
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full h-11 rounded-xl font-semibold tracking-wide active:scale-[0.98] active:translate-y-[1px] transition-all"
              >
                Registrar transferencia
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
