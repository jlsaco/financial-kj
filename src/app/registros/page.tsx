"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RecordList } from "@/components/records/record-list";
import { RecordFormDrawer } from "@/components/records/record-form-drawer";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FabButton } from "@/components/records/fab-button";
import { useFinance } from "@/contexts/finance-context";
import { useUI } from "@/contexts/ui-context";
import { Category, FinanceRecord, RecordType } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

export default function RegistrosPage() {
  const { state, deleteRecord: deleteRecordAction } = useFinance();
  const { selectedMonth, selectedYear } = useUI();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<FinanceRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<FinanceRecord | null>(null);
  const [typeFilter, setTypeFilter] = useState<"todos" | RecordType>("todos");
  const [categoryFilter, setCategoryFilter] = useState<Category | "todos">("todos");

  const filteredRecords = useMemo(() => {
    return state.records.filter((r) => {
      const d = new Date(r.date + "T12:00:00");
      if (d.getMonth() + 1 !== selectedMonth || d.getFullYear() !== selectedYear)
        return false;
      if (typeFilter !== "todos" && r.type !== typeFilter) return false;
      if (categoryFilter !== "todos" && r.category !== categoryFilter) return false;
      return true;
    });
  }, [state.records, selectedMonth, selectedYear, typeFilter, categoryFilter]);

  const handleEdit = (record: FinanceRecord) => {
    setEditRecord(record);
    setDrawerOpen(true);
  };

  const handleDelete = (record: FinanceRecord) => {
    setDeleteRecord(record);
  };

  const confirmDelete = async () => {
    if (deleteRecord) {
      try {
        await deleteRecordAction(deleteRecord.id);
        toast.success("Registro eliminado");
      } catch {
        toast.error("Error al eliminar");
      }
      setDeleteRecord(null);
    }
  };

  const handleAdd = () => {
    setEditRecord(null);
    setDrawerOpen(true);
  };

  return (
    <div>
      <PageHeader title="Registros" showMonthNav />

      <div className="space-y-3 px-4 pt-3">
        {/* Type filter */}
        <Tabs
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as "todos" | RecordType)}
        >
          <TabsList className="w-full rounded-xl">
            <TabsTrigger value="todos" className="flex-1 rounded-lg text-sm">
              Todos
            </TabsTrigger>
            <TabsTrigger value="gasto" className="flex-1 rounded-lg text-sm">
              Gastos
            </TabsTrigger>
            <TabsTrigger value="ingreso" className="flex-1 rounded-lg text-sm">
              Ingresos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoryFilter("todos")}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-all active:scale-95 ${
              categoryFilter === "todos"
                ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                : "bg-card text-foreground/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:text-foreground"
            }`}
          >
            Todas
          </button>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() =>
                setCategoryFilter(categoryFilter === cat ? "todos" : cat)
              }
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-all active:scale-95 ${
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
                  : "bg-card text-foreground/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:text-foreground"
              }`}
            >
              {CATEGORIES[cat].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <RecordList
          records={filteredRecords}
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
        description={`¿Estás seguro de eliminar "${deleteRecord?.name}"?`}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
