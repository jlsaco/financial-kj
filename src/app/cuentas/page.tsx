"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CuentaFormDrawer } from "@/components/cuentas/cuenta-form-drawer";
import { TransferenciaFormDrawer } from "@/components/cuentas/transferencia-form-drawer";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-selector";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useFinance } from "@/contexts/finance-context";
import { Cuenta, Transferencia } from "@/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Plus, Wallet, Banknote, Pencil, ArrowLeftRight, ArrowRight, Trash2 } from "lucide-react";

export default function CuentasPage() {
  const { state, getCuentasSaldos, deleteTransferencia } = useFinance();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editCuenta, setEditCuenta] = useState<Cuenta | null>(null);
  const [transferToDelete, setTransferToDelete] = useState<Transferencia | null>(
    null
  );

  const saldos = getCuentasSaldos();
  const activeSaldos = saldos.filter((s) => s.cuenta.isActive);
  const inactiveSaldos = saldos.filter((s) => !s.cuenta.isActive);
  const totalBalance = activeSaldos.reduce((sum, s) => sum + s.balance, 0);

  const cuentaName = (id: string) =>
    state.cuentas.find((c) => c.id === id)?.name ?? "Cuenta eliminada";

  const handleAdd = () => {
    setEditCuenta(null);
    setDrawerOpen(true);
  };
  const handleEdit = (cuenta: Cuenta) => {
    setEditCuenta(cuenta);
    setDrawerOpen(true);
  };

  if (!state.isLoaded) {
    return (
      <div>
        <PageHeader title="Cuentas" />
        <div className="space-y-3 p-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Cuentas"
        action={
          <div className="flex items-center gap-2">
            {activeSaldos.length >= 2 && (
              <button
                onClick={() => setTransferOpen(true)}
                className="inline-flex items-center rounded-xl border border-border/60 px-3 py-2 text-sm font-semibold text-foreground transition-all hover:bg-accent/50 active:scale-[0.97]"
              >
                <ArrowLeftRight className="mr-1.5 h-4 w-4" strokeWidth={2} /> Transferir
              </button>
            )}
            <button
              onClick={handleAdd}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.97] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
            >
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={2.2} /> Nueva
            </button>
          </div>
        }
      />

      <div className="space-y-4 p-4">
        {saldos.length === 0 ? (
          <EmptyState
            message="No tienes cuentas. Crea una para ver tu saldo real: lo que entra, lo que sale y lo que queda."
            icon={<Wallet className="h-12 w-12" strokeWidth={1} />}
          />
        ) : (
          <>
            {/* Saldo total */}
            <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-transparent p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                Saldo total
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {formatCurrency(totalBalance)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                Suma de tus cuentas activas.
              </p>
            </div>

            {activeSaldos.map(({ cuenta, balance, totalIngresos, totalGastos, totalLiquidaciones, totalTransferenciasEntrada, totalTransferenciasSalida }) => {
              const isCash = cuenta.type === "cash";
              return (
              <div
                key={cuenta.id}
                className="rounded-2xl border border-border/50 bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isCash ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      {isCash ? (
                        <Banknote className="h-5 w-5" strokeWidth={1.7} />
                      ) : (
                        <Wallet className="h-5 w-5" strokeWidth={1.7} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[15px] font-semibold">{cuenta.name}</p>
                        {isCash ? (
                          <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Efectivo
                          </span>
                        ) : (
                          <UserAvatar userId={cuenta.owner} className="h-5 w-5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground/70">
                        Inicial {formatCurrency(cuenta.initialBalance)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEdit(cuenta)}
                    aria-label="Editar cuenta"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/60 transition-all hover:bg-accent/50 hover:text-foreground active:scale-95"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.7} />
                  </button>
                </div>

                <div className="mt-3 border-t border-border/40 pt-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                    Saldo actual
                  </p>
                  <p
                    className={`mt-0.5 text-2xl font-bold tabular-nums ${
                      balance < 0 ? "text-rose-600" : ""
                    }`}
                  >
                    {formatCurrency(balance)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/70">
                    <span>+ {formatCurrency(totalIngresos)} ingresos</span>
                    <span>− {formatCurrency(totalGastos)} débito</span>
                    <span>− {formatCurrency(totalLiquidaciones)} tarjetas</span>
                    {totalTransferenciasEntrada > 0 && (
                      <span>+ {formatCurrency(totalTransferenciasEntrada)} transf. recibidas</span>
                    )}
                    {totalTransferenciasSalida > 0 && (
                      <span>− {formatCurrency(totalTransferenciasSalida)} transf. enviadas</span>
                    )}
                  </div>
                </div>
              </div>
              );
            })}

            {/* Movimientos entre cuentas (transferencias) */}
            {state.transferencias.length > 0 && (
              <div className="mt-6 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/35">
                  Transferencias ({state.transferencias.length})
                </h2>
                {state.transferencias.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                      <ArrowLeftRight className="h-4 w-4" strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[13px] font-medium">
                        <span className="truncate">{cuentaName(t.cuentaOrigenId)}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />
                        <span className="truncate">{cuentaName(t.cuentaDestinoId)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/70">
                        {formatDate(t.date)}
                        {t.note ? ` · ${t.note}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[15px] font-bold tabular-nums">
                      {formatCurrency(t.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTransferToDelete(t)}
                      aria-label="Eliminar transferencia"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground/50 transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {inactiveSaldos.length > 0 && (
              <div className="mt-6 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/35">
                  Archivadas ({inactiveSaldos.length})
                </h2>
                {inactiveSaldos.map(({ cuenta }) => (
                  <button
                    key={cuenta.id}
                    onClick={() => handleEdit(cuenta)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-card/60 p-3 text-left opacity-70 transition-all active:scale-[0.99]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      {cuenta.type === "cash" ? (
                        <Banknote className="h-4 w-4" strokeWidth={1.7} />
                      ) : (
                        <Wallet className="h-4 w-4" strokeWidth={1.7} />
                      )}
                    </div>
                    <span className="text-sm font-medium">{cuenta.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <CuentaFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editCuenta={editCuenta}
      />

      <TransferenciaFormDrawer
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />

      {transferToDelete && (
        <ConfirmDialog
          open={transferToDelete !== null}
          onOpenChange={(o) => !o && setTransferToDelete(null)}
          title="Eliminar transferencia"
          description={`¿Eliminar la transferencia de ${cuentaName(
            transferToDelete.cuentaOrigenId
          )} → ${cuentaName(transferToDelete.cuentaDestinoId)} por ${formatCurrency(
            transferToDelete.amount
          )}? Los saldos de las cuentas volverán a su estado anterior.`}
          onConfirm={async () => {
            await deleteTransferencia(transferToDelete.id);
            setTransferToDelete(null);
          }}
        />
      )}
    </div>
  );
}
