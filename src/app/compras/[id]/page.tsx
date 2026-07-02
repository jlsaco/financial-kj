"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFinance } from "@/contexts/finance-context";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AmortizationTable } from "@/components/shared/amortization-table";
import {
  AbonoFormDrawer,
  type AbonoPreview,
} from "@/components/shared/abono-form-drawer";
import { AbonosHistory } from "@/components/shared/abonos-history";
import { UserAvatar } from "@/components/shared/user-selector";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { USERS, CATEGORIES } from "@/lib/constants";
import {
  getCompraDiferidaSummary,
  getCompraDiferidaAmortization,
} from "@/lib/compra-helpers";
import { AbonoCapital, AbonoEffect } from "@/types";
import { ArrowLeft, CreditCard, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CompraDiferidaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { state, deleteCompraDiferida, addAbono, deleteAbono } = useFinance();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [abonoOpen, setAbonoOpen] = useState(false);

  const compra = state.comprasDiferidas.find((c) => c.id === params.id);

  if (!state.isLoaded) {
    return (
      <div className="p-4">
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!compra) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Compra diferida no encontrada</p>
        <Button variant="link" onClick={() => router.push("/tarjetas")}>
          Volver a tarjetas
        </Button>
      </div>
    );
  }

  const compraAbonos = state.abonos.filter((a) => a.compraDiferidaId === compra.id);
  const summary = getCompraDiferidaSummary(compra, state.records, state.abonos);
  const amortization = getCompraDiferidaAmortization(compra, compraAbonos);
  const tarjetaName = compra.tarjetaId
    ? state.tarjetas.find((t) => t.id === compra.tarjetaId)?.name
    : undefined;

  const handleDelete = async () => {
    try {
      await deleteCompraDiferida(compra.id);
      toast.success("Compra diferida eliminada");
      router.push("/tarjetas");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleAddAbono = async (data: {
    amount: number;
    effect: AbonoEffect;
    date: string;
    note?: string;
  }) => {
    await addAbono({ compraDiferidaId: compra.id, ...data });
  };

  const handleDeleteAbono = async (id: string) => {
    try {
      await deleteAbono(id);
      toast.success("Abono eliminado");
    } catch {
      toast.error("Error al eliminar el abono");
    }
  };

  const getAbonoPreview = (
    amount: number,
    effect: AbonoEffect
  ): AbonoPreview | null => {
    if (!amortization) return null;
    const hypo: AbonoCapital = {
      id: "preview",
      compraDiferidaId: compra.id,
      amount,
      date: todayStr(),
      effect,
      createdAt: "",
    };
    const next = getCompraDiferidaAmortization(compra, [...compraAbonos, hypo]);
    if (!next) return null;
    const paid = summary.paidCount;
    const remaining = Math.max(0, next.rows.length - paid);
    const idx = Math.min(paid, next.rows.length - 1);
    const installment = next.rows[idx]?.payment ?? next.installment;
    const outstanding = Math.max(0, (summary.outstandingPrincipal ?? 0) - amount);
    return { installment, remaining, outstanding };
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background px-4 pb-2 pt-4">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/tarjetas")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground/50 transition-colors hover:bg-accent active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
            </button>
            <h1 className="flex-1 truncate text-lg font-bold tracking-tight">
              {compra.name}
            </h1>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-destructive/70 transition-colors hover:bg-destructive/10 active:scale-95"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* Info + resumen */}
        <div className="rounded-2xl bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_32px_-8px_rgba(0,0,0,0.08)]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${CATEGORIES[compra.category].bgLight}`}
            >
              {CATEGORIES[compra.category].label}
            </span>
            {tarjetaName && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
                <CreditCard className="h-3 w-3" strokeWidth={1.7} />
                {tarjetaName}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <UserAvatar userId={compra.userId} />
              <span className="text-[11px] text-foreground/50">
                {USERS[compra.userId].name}
              </span>
            </span>
          </div>

          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-foreground/35">
                Saldo pendiente
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums font-mono">
                {formatCurrency(summary.pendingAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">
                {summary.paidCount} de {compra.installmentsCount}
              </p>
              <p className="text-[11px] text-foreground/40">cuotas</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/40 pt-4">
            {summary.outstandingPrincipal != null && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                  Saldo de capital
                </p>
                <p className="text-sm font-semibold tabular-nums font-mono">
                  {formatCurrency(summary.outstandingPrincipal)}
                </p>
              </div>
            )}
            {summary.totalAbonos > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                  Abonos a capital
                </p>
                <p className="text-sm font-semibold tabular-nums font-mono text-emerald-600">
                  {formatCurrency(summary.totalAbonos)}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                Total a pagar
              </p>
              <p className="text-sm font-semibold tabular-nums font-mono">
                {formatCurrency(compra.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                Cuota
              </p>
              <p className="text-sm font-semibold tabular-nums font-mono">
                {formatCurrency(summary.installmentAmount)}
              </p>
            </div>
            {compra.interestRate != null && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                  Interés
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {compra.interestRate}%
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-foreground/35">
                Fin estimado
              </p>
              <p className="text-sm font-semibold">
                {formatDateLabel(summary.endDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabla de amortización */}
        {amortization && (
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/35">
              Amortización
            </h2>
            <AmortizationTable result={amortization} />
          </div>
        )}

        {/* Abonos a capital */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/35">
              Abonos a capital
            </h2>
            <button
              onClick={() => setAbonoOpen(true)}
              className="inline-flex items-center rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97]"
            >
              <Plus className="mr-1 h-3.5 w-3.5" strokeWidth={2.2} /> Abonar
            </button>
          </div>
          <AbonosHistory abonos={compraAbonos} onDelete={handleDeleteAbono} />
        </div>
      </div>

      <AbonoFormDrawer
        open={abonoOpen}
        onOpenChange={setAbonoOpen}
        targetName={compra.name}
        onSubmit={handleAddAbono}
        getPreview={getAbonoPreview}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar compra diferida"
        description={`¿Eliminar "${compra.name}"? Se borrarán también sus ${compra.installmentsCount} cuotas y sus abonos. Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
