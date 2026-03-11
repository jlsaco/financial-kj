"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { BudgetOverview } from "@/components/dashboard/budget-overview";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { RecordList } from "@/components/records/record-list";
import { RecordFormDrawer } from "@/components/records/record-form-drawer";
import { FabButton } from "@/components/records/fab-button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useFinance } from "@/contexts/finance-context";
import { useUI } from "@/contexts/ui-context";
import { FinanceRecord } from "@/types";
import { toast } from "sonner";

export default function DashboardPage() {
  const { state, dispatch } = useFinance();
  const { selectedMonth, selectedYear } = useUI();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FinanceRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<FinanceRecord | null>(null);

  const monthRecords = useMemo(() => {
    return state.records.filter((r) => {
      const d = new Date(r.date + "T12:00:00");
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [state.records, selectedMonth, selectedYear]);

  const handleEdit = (record: FinanceRecord) => {
    setEditRecord(record);
    setDrawerOpen(true);
  };

  const handleDelete = (record: FinanceRecord) => {
    setDeleteRecord(record);
  };

  const confirmDelete = () => {
    if (deleteRecord) {
      dispatch({ type: "DELETE_RECORD", payload: deleteRecord.id });
      toast.success("Registro eliminado");
      setDeleteRecord(null);
    }
  };

  const handleAdd = () => {
    setEditRecord(null);
    setDrawerOpen(true);
  };

  if (!state.isLoaded) {
    return (
      <div>
        <PageHeader title="FinanceKJ" showMonthNav />
        <div className="p-4">
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="FinanceKJ" showMonthNav />

      <div className="space-y-5 p-4">
        <SummaryCard />

        <UpcomingEvents />

        <div>
          <h2 className="mb-2.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Presupuestos</h2>
          <BudgetOverview />
        </div>
      </div>

      <div className="mt-1">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Registros recientes</h2>
          <span className="text-[11px] tabular-nums text-muted-foreground/50">
            {monthRecords.length} registros
          </span>
        </div>
        <RecordList
          records={monthRecords}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <FabButton onClick={handleAdd} />

      <RecordFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editRecord={editRecord}
      />

      <ConfirmDialog
        open={!!deleteRecord}
        onOpenChange={(open) => !open && setDeleteRecord(null)}
        title="Eliminar registro"
        description={`¿Estás seguro de eliminar "${deleteRecord?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
