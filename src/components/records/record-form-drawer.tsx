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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSelector } from "@/components/shared/user-selector";
import { useFinance } from "@/contexts/finance-context";
import { Category, FinanceRecord, RecordType, UserId } from "@/types";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

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
  const { dispatch } = useFinance();

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

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Completa todos los campos correctamente");
      return;
    }

    if (editRecord) {
      dispatch({
        type: "UPDATE_RECORD",
        payload: {
          id: editRecord.id,
          updates: {
            name: name.trim(),
            amount: parsedAmount,
            type,
            category,
            userId,
            date,
          },
        },
      });
      toast.success("Registro actualizado");
    } else {
      const record: FinanceRecord = {
        id: crypto.randomUUID(),
        name: name.trim(),
        amount: parsedAmount,
        type,
        category,
        userId,
        date,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: "ADD_RECORD", payload: record });
      toast.success("Registro creado");
    }

    onOpenChange(false);
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

          <div className="space-y-4 px-4">
            {/* Type selector */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "gasto" ? "default" : "outline"}
                className={
                  type === "gasto"
                    ? "flex-1 bg-red-600 hover:bg-red-700"
                    : "flex-1"
                }
                onClick={() => setType("gasto")}
              >
                Gasto
              </Button>
              <Button
                type="button"
                variant={type === "ingreso" ? "default" : "outline"}
                className={
                  type === "ingreso"
                    ? "flex-1 bg-green-600 hover:bg-green-700"
                    : "flex-1"
                }
                onClick={() => setType("ingreso")}
              >
                Ingreso
              </Button>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-bold"
                inputMode="numeric"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                placeholder="Descripción del registro"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as Category)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORIES[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* User */}
            <div className="space-y-2">
              <Label>Registrado por</Label>
              <UserSelector value={userId} onChange={setUserId} />
            </div>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} className="w-full">
              {editRecord ? "Guardar cambios" : "Agregar registro"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Cancelar
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
