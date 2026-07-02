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
  Popcorn,
  Landmark,
  Trash2,
  Wallet,
} from "lucide-react";
import { UserSelector } from "@/components/shared/user-selector";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useFinance } from "@/contexts/finance-context";
import { Category, RecordType, UserId, FinanceRecord } from "@/types";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";

const CATEGORY_ICON_MAP = { Car, HeartPulse, Home, CreditCard, Wifi, Popcorn, Landmark };

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
  const { addRecord, updateRecord, deleteRecord, addCompraDiferida, state } =
    useFinance();
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<RecordType>("gasto");
  const [category, setCategory] = useState<Category>("alimentacion-salud");
  const [userId, setUserId] = useState<UserId>("jose");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [tarjetaId, setTarjetaId] = useState<string | undefined>(undefined);
  const [cuentaId, setCuentaId] = useState<string | undefined>(undefined);
  // Compra diferida en cuotas (solo al crear un gasto nuevo).
  const [deferred, setDeferred] = useState(false);
  const [installments, setInstallments] = useState("");
  const [interest, setInterest] = useState("");

  const tarjetas = state.tarjetas.filter((t) => t.isActive);
  const cuentas = state.cuentas.filter((c) => c.isActive);
  const canDefer = type === "gasto" && !editRecord;
  // La cuenta aplica a ingresos y a gastos de débito/efectivo (sin tarjeta).
  const showCuenta =
    !deferred && (type === "ingreso" || (type === "gasto" && !tarjetaId));

  useEffect(() => {
    if (editRecord) {
      setName(editRecord.name);
      setAmount(editRecord.amount.toString());
      setType(editRecord.type);
      setCategory(editRecord.category);
      setUserId(editRecord.userId);
      setDate(editRecord.date);
      setTarjetaId(editRecord.tarjetaId);
      setCuentaId(editRecord.cuentaId);
    } else {
      setName("");
      setAmount("");
      setType("gasto");
      setCategory("alimentacion-salud");
      setUserId("jose");
      setDate(new Date().toISOString().split("T")[0]);
      setTarjetaId(undefined);
      setCuentaId(undefined);
    }
    setDeferred(false);
    setInstallments("");
    setInterest("");
  }, [editRecord, open]);

  const parsedInstallments = parseInt(installments, 10);
  const suggestedCuota =
    deferred &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) > 0 &&
    !isNaN(parsedInstallments) &&
    parsedInstallments > 0
      ? parseFloat(amount) / parsedInstallments
      : null;

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Completa todos los campos correctamente");
      return;
    }

    // Compra diferida en cuotas.
    if (canDefer && deferred) {
      if (isNaN(parsedInstallments) || parsedInstallments < 2) {
        toast.error("Indica al menos 2 cuotas para diferir");
        return;
      }
      setSaving(true);
      try {
        const parsedInterest = interest.trim() ? parseFloat(interest) : undefined;
        await addCompraDiferida({
          name: name.trim(),
          category,
          userId,
          tarjetaId,
          totalAmount: parsedAmount,
          installmentsCount: parsedInstallments,
          interestRate:
            parsedInterest !== undefined && !isNaN(parsedInterest)
              ? parsedInterest
              : undefined,
          startDate: date,
        });
        toast.success(`Compra diferida en ${parsedInstallments} cuotas`);
        onOpenChange(false);
      } catch {
        toast.error("Error al guardar");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      // La tarjeta (medio de pago) solo aplica a gastos.
      const effTarjetaId = type === "gasto" ? tarjetaId : undefined;
      // La cuenta aplica a ingresos y gastos de débito/efectivo (sin tarjeta).
      const effCuentaId = showCuenta ? cuentaId : undefined;
      if (editRecord) {
        await updateRecord(editRecord.id, {
          name: name.trim(),
          amount: parsedAmount,
          type,
          category,
          userId,
          date,
          tarjetaId: effTarjetaId,
          cuentaId: effCuentaId,
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
          tarjetaId: effTarjetaId,
          cuentaId: effCuentaId,
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

  const handleDelete = async () => {
    if (!editRecord) return;
    try {
      await deleteRecord(editRecord.id);
      toast.success("Registro eliminado");
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
              {editRecord ? "Editar registro" : "Nuevo registro"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-2">
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
              <Label htmlFor="amount" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                {deferred ? "Total de la compra" : "Valor"}
              </Label>
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
              <Label htmlFor="name" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">Nombre</Label>
              <Input
                id="name"
                placeholder="Descripcion del registro"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">Categoria</Label>
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
              <Label htmlFor="date" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Tarjeta (medio de pago) — solo para gastos */}
            {type === "gasto" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                  Pagado con
                </Label>
                {tarjetas.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground/70">
                    Sin tarjetas. Créalas en la pestaña Tarjetas para agruparlas
                    en la liquidación mensual.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTarjetaId(undefined)}
                      className={`rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                        tarjetaId === undefined
                          ? "bg-foreground text-background shadow-sm"
                          : "border border-border/60 text-muted-foreground hover:border-border"
                      }`}
                    >
                      Débito / efectivo
                    </button>
                    {tarjetas.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTarjetaId(t.id)}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                          tarjetaId === t.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "border border-border/60 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <CreditCard className="h-4 w-4" strokeWidth={1.5} />
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cuenta — ingresos y gastos de débito/efectivo */}
            {showCuenta && cuentas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                  {type === "ingreso" ? "Entra a la cuenta" : "Sale de la cuenta"}
                </Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCuentaId(undefined)}
                    className={`rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                      cuentaId === undefined
                        ? "bg-foreground text-background shadow-sm"
                        : "border border-border/60 text-muted-foreground hover:border-border"
                    }`}
                  >
                    Sin cuenta
                  </button>
                  {cuentas.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCuentaId(c.id)}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all active:scale-[0.98] ${
                        cuentaId === c.id
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

            {/* Diferir en cuotas — solo al crear un gasto */}
            {canDefer && (
              <div className="space-y-2.5 rounded-2xl border border-border/50 bg-muted/30 p-3">
                <button
                  type="button"
                  onClick={() => setDeferred((v) => !v)}
                  className="flex w-full items-center justify-between"
                >
                  <span className="text-[13px] font-semibold">
                    Diferir en cuotas
                  </span>
                  <span
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      deferred ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        deferred ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>

                {deferred && (
                  <div className="space-y-2.5 pt-1">
                    <p className="text-xs text-muted-foreground/80">
                      El total se reparte en N gastos mensuales (uno por mes desde
                      la fecha), cada uno con esta tarjeta. Ideal para casa o viajes.
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="installments" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                          Nº de cuotas
                        </Label>
                        <Input
                          id="installments"
                          type="number"
                          placeholder="12"
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          inputMode="numeric"
                          min={2}
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="interest" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                          % interés (opc.)
                        </Label>
                        <Input
                          id="interest"
                          type="number"
                          placeholder="0"
                          value={interest}
                          onChange={(e) => setInterest(e.target.value)}
                          inputMode="decimal"
                        />
                      </div>
                    </div>
                    {suggestedCuota !== null && (
                      <p className="text-[13px] font-medium text-foreground/80">
                        Cuota mensual:{" "}
                        <span className="font-bold tabular-nums">
                          {formatCurrency(suggestedCuota)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* User */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">Registrado por</Label>
              <UserSelector value={userId} onChange={setUserId} />
            </div>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={saving} className="w-full h-11 rounded-xl font-semibold tracking-wide active:scale-[0.98] active:translate-y-[1px] transition-all">
              {editRecord
                ? "Guardar cambios"
                : deferred
                ? "Crear compra diferida"
                : "Agregar registro"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-xl font-medium active:scale-[0.98] transition-all"
            >
              Cancelar
            </Button>
            {editRecord && (
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

      {editRecord && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar registro"
          description={`¿Estás seguro de eliminar "${editRecord.name}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
        />
      )}
    </Drawer>
  );
}
