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
import { Textarea } from "@/components/ui/textarea";
import { Bug, Sparkles, Mic } from "lucide-react";
import { UserSelector } from "@/components/shared/user-selector";
import { USERS } from "@/lib/constants";
import { Issue, IssueKind, UserId } from "@/types";
import { toast } from "sonner";

interface IssueReportDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (issue: Issue) => void;
}

export function IssueReportDrawer({
  open,
  onOpenChange,
  onCreated,
}: IssueReportDrawerProps) {
  const [kind, setKind] = useState<IssueKind>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reporter, setReporter] = useState<UserId>("jose");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind("bug");
    setTitle("");
    setDescription("");
    setReporter("jose");
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Escribe un título para el reporte");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          description,
          reporter: USERS[reporter].name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Error al crear el reporte");
      }

      toast.success("Reporte enviado a GitHub");
      onCreated(data.issue as Issue);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Reportar</DrawerTitle>
          </DrawerHeader>

          <div className="space-y-5 px-4">
            {/* Kind selector */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setKind("bug")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold tracking-wide transition-all active:scale-[0.98] ${
                  kind === "bug"
                    ? "bg-rose-500 text-white shadow-[0_2px_8px_rgba(244,63,94,0.3)]"
                    : "border border-border/60 text-muted-foreground hover:border-rose-200 hover:text-rose-600"
                }`}
              >
                <Bug className="h-4 w-4" strokeWidth={1.8} />
                Bug
              </button>
              <button
                type="button"
                onClick={() => setKind("mejora")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold tracking-wide transition-all active:scale-[0.98] ${
                  kind === "mejora"
                    ? "bg-sky-600 text-white shadow-[0_2px_8px_rgba(2,132,199,0.3)]"
                    : "border border-border/60 text-muted-foreground hover:border-sky-200 hover:text-sky-600"
                }`}
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                Mejora
              </button>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label
                htmlFor="issue-title"
                className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70"
              >
                Título
              </Label>
              <Input
                id="issue-title"
                placeholder={
                  kind === "bug"
                    ? "Ej: El monto no se guarda al editar"
                    : "Ej: Agregar exportar a Excel"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="issue-description"
                  className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70"
                >
                  Descripción
                </Label>
                <button
                  type="button"
                  disabled
                  title="Dictado por voz — próximamente"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground/40"
                >
                  <Mic className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Voz
                </button>
              </div>
              <Textarea
                id="issue-description"
                placeholder="Cuéntanos qué pasó o qué te gustaría mejorar…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Reporter */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">
                Reportado por
              </Label>
              <UserSelector value={reporter} onChange={setReporter} />
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="h-11 w-full rounded-xl font-semibold tracking-wide transition-all active:translate-y-[1px] active:scale-[0.98]"
            >
              {saving ? "Enviando…" : "Enviar reporte"}
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
