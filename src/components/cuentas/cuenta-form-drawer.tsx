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
import { Trash2, Archive, RotateCcw } from "lucide-react";
import { UserSelector } from "@/components/shared/user-selector";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useFinance } from "@/contexts/finance-context";
import { UserId, Cuenta } from "@/types";
import { toast } from "sonner";

interface CuentaFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCuenta?: Cuenta | null;
}

export function CuentaFormDrawer({
  open,
  onOpenChange,
  editCuenta,
}: CuentaFormDrawerProps) {
  const { addCuenta, updateCuenta, deleteCuenta } = useFinance();
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [name, setName] = useState("");
  const [owner, setOwner] = useState<UserId>("jose");
  const [initialBalance, setInitialBalance] = useState("");

  useEffect(() => {
    if (editCuenta) {
      setName(editCuenta.name);
      setOwner(editCuenta.owner);
      setInitialBalance(editCuenta.initialBalance.toString());
    } else {
      setName("");
      setOwner("jose");
      setInitialBalance("");
    }
  }, [editCuenta, open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Ponle un nombre a la cuenta");
      return;
    }
    const parsedBalance = initialBalance.trim()
      ? parseFloat(initialBalance)
      : 0;
    if (isNaN(parsedBalance)) {
      toast.error("Saldo inicial inválido");
      return;
    }

    setSaving(true);
    try {
      const payload = { name: name.trim(), owner, initialBalance: parsedBalance };
      if (editCuenta) {
        await updateCuenta(editCuenta.id, payload);
        toast.success("Cuenta actualizada");
      } else {
        await addCuenta(payload);
        toast.success("Cuenta creada");
      }
      onOpenChange(false);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!editCuenta) return;
    try {
      await updateCuenta(editCuenta.id, { isActive: !editCuenta.isActive });
      toast.success(editCuenta.isActive ? "Cuenta archivada" : "Cuenta reactivada");
      onOpenChange(false);
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async () => {
    if (!editCuenta) return;
    try {
      await deleteCuenta(editCuenta.id);
      toast.success("Cuenta eliminada");
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
              {editCuenta ? "Editar cuenta" : "Nueva cuenta"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-2">
            <div className="space-y-1.5">
              <Label htmlFor="cuenta-name" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                Nombre
              </Label>
              <Input
                id="cuenta-name"
                placeholder="Ej. Bancolombia Jose"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cuenta-balance" className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                Saldo inicial
              </Label>
              <Input
                id="cuenta-balance"
                type="number"
                placeholder="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="h-12 text-2xl font-semibold tabular-nums"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                Dueño
              </Label>
              <UserSelector value={owner} onChange={setOwner} />
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full h-11 rounded-xl font-semibold tracking-wide active:scale-[0.98] active:translate-y-[1px] transition-all"
            >
              {editCuenta ? "Guardar cambios" : "Crear cuenta"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-xl font-medium active:scale-[0.98] transition-all"
            >
              Cancelar
            </Button>
            {editCuenta && (
              <Button
                variant="ghost"
                onClick={handleArchiveToggle}
                className="w-full h-11 rounded-xl font-medium active:scale-[0.98] transition-all"
              >
                {editCuenta.isActive ? (
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
            {editCuenta && (
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

      {editCuenta && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar cuenta"
          description={`¿Eliminar "${editCuenta.name}"? Los registros y liquidaciones que la usaban quedarán sin cuenta. Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
        />
      )}
    </Drawer>
  );
}
