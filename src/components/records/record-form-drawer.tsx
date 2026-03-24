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
import { Category, RecordType, UserId, FinanceRecord } from "@/types";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

const CATEGORY_ICON_MAP = { Car, HeartPulse, Home, CreditCard, Wifi };

interface RecordFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRecord?: FinanceRecord | null;
}

export function RecordFormDrawer({
  open,
  onOpenChange,
  editRecord,
}: RecordFormDrawerProps) {
  const { addRecord, updateRecord } = useFinance();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<RecordType>("gasto");
  const [category, setCategory] = useState<Category>("alimentacion-salud");
  const [userId, setUserId] = useState<UserId>("jose");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (editRecord) {
      setName(editRecord.name);
      setAmount(editRecord.amount.toString());
      setType(editRecord.type);
      setCategory(editRecord.category);
      setUserId(editRecord.userId);
      setDate(editRecord.date);
    } else {
      setName("");
      setAmount("");
      setType("gasto");
      setCategory("alimentacion-salud");
      setUserId("jose");
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [editRecord, open]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Completa todos los campos correctamente");
      return;
    }

    setSaving(true);
    try {
      if (editRecord) {
        await updateRecord(editRecord.id, {
          name: name.trim(),
          amount: parsedAmount,
          type,
          category,
          userId,
          date,
        });
        toast.success("Registro actualizado");
      } else {
        await addRecord({
          name: name.trim(),
          amount: parsedAmount,
          type,
          category,
          userId,
          date,
        });
        toast.success("Registro creado");
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
              {editRecord ? "Editar registro" : "Nuevo registro"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="space-y-5 px-4">
            {/* Type selector */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("gasto")}
                className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold tracking-wide transition-all active:scale-[0.98] ${
                  type === "gasto"
                    ? "bg-rose-500 text-white shadow-[0_2px_8px_rgba(244,63,94,0.3)]"
                    : "border border-border/60 text-muted-foreground hover:border-rose-200 hover:text-rose-600"
                }`}
              >
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setType("ingreso")}
                className={`flex-1 rounded-xl py-2.5 text-[13px] font-semibold tracking-wide transition-all active:scale-[0.98] ${
                  type === "ingreso"
                    ? "bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                    : "border border-border/60 text-muted-foreground hover:border-emerald-200 hover:text-emerald-600"
                }`}
              >
                Ingreso
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Valor</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-12 text-2xl font-semibold tabular-nums"
                inputMode="numeric"
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Nombre</Label>
              <Input
                id="name"
                placeholder="Descripcion del registro"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Category */}
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

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* User */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Registrado por</Label>
              <UserSelector value={userId} onChange={setUserId} />
            </div>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} className="w-full h-11 rounded-xl font-semibold tracking-wide active:scale-[0.98] active:translate-y-[1px] transition-all">
              {editRecord ? "Guardar cambios" : "Agregar registro"}
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
