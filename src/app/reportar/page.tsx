"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { FabButton } from "@/components/records/fab-button";
import { IssueCard } from "@/components/issues/issue-card";
import { IssueReportDrawer } from "@/components/issues/issue-report-drawer";
import { Issue } from "@/types";
import { MessageSquareDashed } from "lucide-react";

type Filter = "all" | "open" | "closed";

export default function ReportarPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues?state=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar");
      setIssues(data.issues as Issue[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const handleCreated = (issue: Issue) => {
    // Prepend so it shows immediately; it belongs to "all" and "open".
    if (filter !== "closed") {
      setIssues((prev) => [issue, ...prev]);
    }
  };

  return (
    <div>
      <PageHeader title="Reportar" />

      <div className="px-4 pt-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="w-full rounded-xl">
            <TabsTrigger value="all" className="flex-1 rounded-lg text-sm">
              Todos
            </TabsTrigger>
            <TabsTrigger value="open" className="flex-1 rounded-lg text-sm">
              Abiertos
            </TabsTrigger>
            <TabsTrigger value="closed" className="flex-1 rounded-lg text-sm">
              Resueltos
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4 space-y-2.5 px-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-muted"
            />
          ))
        ) : error ? (
          <div className="rounded-2xl border border-rose-200/60 bg-rose-50/60 px-4 py-6 text-center">
            <p className="text-sm font-medium text-rose-700">
              No se pudieron cargar los reportes
            </p>
            <p className="mt-1 text-xs text-rose-600/70">{error}</p>
            <button
              onClick={loadIssues}
              className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white active:scale-95"
            >
              Reintentar
            </button>
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            message="Aún no hay reportes"
            icon={
              <MessageSquareDashed className="h-12 w-12" strokeWidth={1} />
            }
          />
        ) : (
          issues.map((issue) => <IssueCard key={issue.id} issue={issue} />)
        )}
      </div>

      <FabButton onClick={() => setDrawerOpen(true)} />

      <IssueReportDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
