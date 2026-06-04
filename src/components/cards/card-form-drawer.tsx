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
import { Car, HeartPulse, Home, CreditCard, Wifi, Trash2, Archive, RotateCcw, Wallet } from "lucide-react";
import { UserSelector } from "@/components/shared/user-selector";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useFinance } from "@/contexts/finance-context";
import { Category, UserId, Tarjeta } from "@/types";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

const CATEGORY_ICON_MAP = { Car, HeartPulse, Home, CreditCard, Wifi };

interface CardFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarjeta?: Tarjeta | null;
}

export function CardFormDrawer({
  open,
  onOpenChange,
  editTarjeta,
}: CardFormDrawerProps) {
  const { addTarjeta, updateTarjeta, deleteTarjeta, state } = useFinance();
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState("");
  const [owner, setOwner] = useState<UserId>("jose");
  const [closingDay, setClosingDay] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [cuentaPagoId, setCuentaPagoId] = useState<string | undefined>(undefined);

  const cuentas = state.cuentas.filter((c) => c.isActive);

  useEffect(() => {
    if (editTarjeta) {
      setName(editTarjeta.name);
      setOwner(editTarjeta.owner);
      setClosingDay(editTarjeta.closingDay?.toString() ?? "");
      setCategories(editTarjeta.categories ?? []);
      setCuentaPagoId(editTarjeta.cuentaPagoId);
    } else {
      setName("");
      setOwner("jose");
      setClosingDay("");
      setCategories([]);
      setCuentaPagoId(undefined);
    }
  }, [editTarjeta, open]);

  const toggleCategory = (cat: Category) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Ponle un nombre a la tarjeta");
      return;
    }
    const parsedDay = closingDay.trim() ? parseInt(closingDay, 10) : undefined;
    if (
      parsedDay !== undefined &&
      (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31)
    ) {
      toast.error("El día de corte debe estar entre 1 y 31");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        owner,
        closingDay: parsedDay,
        categories: categories.length > 0 ? categories : undefined,
        cuentaPagoId,
      };
      if (editTarjeta) {
        await updateTarjeta(editTarjeta.id, payload);
        toast.success("Tarjeta actualizada");
      } else {
        await addTarjeta(payload);
        toast.success("Tarjeta creada");
      }
      onOpenChange(false);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!editTarjeta) return;
    try {
      await updateTarjeta(editTarjeta.id, { isActive: !editTarjeta.isActive });
      toast.success(editTarjeta.isActive ? "Tarjeta archivada" : "Tarjeta reactivada");
      onOpenChange(false);
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async () => {
    if (!editTarjeta) return;
    try {
      await deleteTarjeta(editTarjeta.id);
      toast.success("Tarjeta eliminada");
      onOpenChange(false);
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-hidden">
          <DrawerHeader>
            <DrawerTitle>
              {editTarjeta ? "Editar tarjeta" : "Nueva tarjeta"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="card-name" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                Nombre
              </Label>
              <Input
                id="card-name"
                placeholder="Ej. Visa Alimentación"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Owner */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                Dueño
              </Label>
              <UserSelector value={owner} onChange={setOwner} />
            </div>

            {/* Closing day */}
            <div className="space-y-1.5">
              <Label htmlFor="card-closing" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                Día de corte (opcional)
              </Label>
              <Input
                id="card-closing"
                type="number"
                placeholder="Ej. 15"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                inputMode="numeric"
                min={1}
                max={31}
              />
            </div>

            {/* Categories (informative) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                Rubros asociados (opcional)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_CATEGORIES.map((cat) => {
                  const config = CATEGORIES[cat];
                  const Icon =
                    CATEGORY_ICON_MAP[config.icon as keyof typeof CATEGORY_ICON_MAP];
                  const selected = categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                        selected
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

            {/* Cuenta de pago */}
            {cuentas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                  Se paga desde (opcional)
                </Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCuentaPagoId(undefined)}
                    className={`rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                      cuentaPagoId === undefined
                        ? "bg-foreground text-background shadow-sm"
                        : "border border-border/60 text-muted-foreground hover:border-border"
                    }`}
                  >
                    Sin definir
                  </button>
                  {cuentas.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCuentaPagoId(c.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                        cuentaPagoId === c.id
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "border border-border/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <Wallet className="h-4 w-4" strokeWidth={1.5} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DrawerFooter>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full h-11 rounded-xl font-semibold tracking-wide active:scale-[0.98] active:translate-y-[1px] transition-all"
            >
              {editTarjeta ? "Guardar cambios" : "Crear tarjeta"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-xl font-medium active:scale-[0.98] transition-all"
            >
              Cancelar
            </Button>
            {editTarjeta && (
              <Button
                variant="ghost"
                onClick={handleArchiveToggle}
                className="w-full h-11 rounded-xl font-medium active:scale-[0.98] transition-all"
              >
                {editTarjeta.isActive ? (
                  <>
                    <Archive className="h-4 w-4" strokeWidth={1.8} />
                    Archivar
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" strokeWidth={1.8} />
                    Reactivar
                  </>
                )}
              </Button>
            )}
            {editTarjeta && (
              <Button
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                className="w-full h-11 rounded-xl font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-[0.98] transition-all"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                Eliminar
              </Button>
            )}
          </DrawerFooter>
        </div>
      </DrawerContent>

      {editTarjeta && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar tarjeta"
          description={`¿Eliminar "${editTarjeta.name}"? Los gastos que la usaban quedarán sin tarjeta y se borrarán sus liquidaciones. Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
        />
      )}
    </Drawer>
  );
}
