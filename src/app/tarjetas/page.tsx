"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CardFormDrawer } from "@/components/cards/card-form-drawer";
import { TarjetaCard } from "@/components/cards/tarjeta-card";
import { CompraDiferidaCard } from "@/components/cards/compra-diferida-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useFinance } from "@/contexts/finance-context";
import { useUI } from "@/contexts/ui-context";
import { Tarjeta } from "@/types";
import { getCompraDiferidaSummary } from "@/lib/compra-helpers";
import { formatCurrency } from "@/lib/formatters";
import { Plus, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function TarjetasPage() {
  const { state, getTarjetasStatus, deleteCompraDiferida } = useFinance();
  const { selectedMonth, selectedYear } = useUI();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarjeta, setEditTarjeta] = useState<Tarjeta | null>(null);

  const activeStatuses = getTarjetasStatus(selectedMonth, selectedYear).filter(
    (s) => s.tarjeta.isActive
  );
  const inactiveTarjetas = state.tarjetas.filter((t) => !t.isActive);

  const totalPendiente = activeStatuses
    .filter((s) => !s.isPaid)
    .reduce((sum, s) => sum + s.owed, 0);

  const comprasSummaries = state.comprasDiferidas.map((c) =>
    getCompraDiferidaSummary(c, state.records)
  );
  const tarjetaName = (id?: string) =>
    id ? state.tarjetas.find((t) => t.id === id)?.name : undefined;

  const handleDeleteCompra = async (id: string) => {
    try {
      await deleteCompraDiferida(id);
      toast.success("Compra diferida eliminada");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleAdd = () => {
    setEditTarjeta(null);
    setDrawerOpen(true);
  };

  const handleEdit = (tarjetaId: string) => {
    const tarjeta = state.tarjetas.find((t) => t.id === tarjetaId) ?? null;
    setEditTarjeta(tarjeta);
    setDrawerOpen(true);
  };

  if (!state.isLoaded) {
    return (
      <div>
        <PageHeader title="Tarjetas" />
        <div className="space-y-3 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Tarjetas"
        showMonthNav
        action={
          <button
            onClick={handleAdd}
            className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
          >
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={2.2} /> Nueva
          </button>
        }
      />

      <div className="space-y-4 p-4">
        {state.tarjetas.length === 0 ? (
          <EmptyState
            message="No tienes tarjetas. Crea una para empezar a agrupar tus gastos y liquidarlas cada mes."
            icon={<CreditCard className="h-12 w-12" strokeWidth={1} />}
          />
        ) : (
          <>
            {/* Resumen del mes: pendiente de pago */}
            {activeStatuses.length > 0 && (
              <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-4">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                  Pendiente de pago este mes
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {formatCurrency(totalPendiente)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  Suma de lo gastado con tarjetas aún sin liquidar.
                </p>
              </div>
            )}

            {activeStatuses.length > 0 && (
              <div className="space-y-3">
                {activeStatuses.map((status) => (
                  <TarjetaCard
                    key={status.tarjeta.id}
                    status={status}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}

            {inactiveTarjetas.length > 0 && (
              <div className="mt-6 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/35">
                  Archivadas ({inactiveTarjetas.length})
                </h2>
                {inactiveTarjetas.map((tarjeta) => (
                  <button
                    key={tarjeta.id}
                    onClick={() => handleEdit(tarjeta.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/60 p-3 text-left opacity-70 transition-all active:scale-[0.99]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      <CreditCard className="h-4 w-4" strokeWidth={1.7} />
                    </div>
                    <span className="text-sm font-medium">{tarjeta.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Compras a cuotas (diferidas) */}
        {comprasSummaries.length > 0 && (
          <div className="mt-6 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/35">
              Compras a cuotas ({comprasSummaries.length})
            </h2>
            {comprasSummaries.map((summary) => (
              <CompraDiferidaCard
                key={summary.compra.id}
                summary={summary}
                tarjetaName={tarjetaName(summary.compra.tarjetaId)}
                onDelete={handleDeleteCompra}
              />
            ))}
          </div>
        )}
      </div>

      <CardFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editTarjeta={editTarjeta}
      />
    </div>
  );
}
