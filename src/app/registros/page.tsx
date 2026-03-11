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
import { Badge } from "@/components/ui/badge";
import { ALL_CATEGORIES, CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

export default function RegistrosPage() {
  const { state, dispatch } = useFinance();
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

  return (
    <div>
      <PageHeader title="Registros" showMonthNav />

      <div className="space-y-3 px-4 pt-3">
        {/* Type filter */}
        <Tabs
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as "todos" | RecordType)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="todos" className="flex-1">
              Todos
            </TabsTrigger>
            <TabsTrigger value="gasto" className="flex-1">
              Gastos
            </TabsTrigger>
            <TabsTrigger value="ingreso" className="flex-1">
              Ingresos
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Badge
            variant={categoryFilter === "todos" ? "default" : "outline"}
            className="shrink-0 cursor-pointer"
            onClick={() => setCategoryFilter("todos")}
          >
            Todas
          </Badge>
          {ALL_CATEGORIES.map((cat) => (
            <Badge
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              className="shrink-0 cursor-pointer"
              onClick={() =>
                setCategoryFilter(categoryFilter === cat ? "todos" : cat)
              }
            >
              {CATEGORIES[cat].label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="mt-2">
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
