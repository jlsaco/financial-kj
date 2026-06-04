"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Release } from "@/types";
import { APP_VERSION_LABEL } from "@/lib/version";
import { Tag, History } from "lucide-react";

function formatReleaseDate(iso: string | null): string {
  if (!iso) return "Borrador";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReleases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/releases");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al cargar");
      setReleases(data.releases as Release[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  return (
    <div>
      <PageHeader title="Versiones" />

      <div className="px-4 pt-2">
        <p className="text-sm text-muted-foreground/70">
          Estás usando{" "}
          <span className="font-semibold text-foreground">
            {APP_VERSION_LABEL}
          </span>
          . Historial de versiones publicadas.
        </p>
      </div>

      <div className="mt-4 space-y-3 px-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-muted"
            />
          ))
        ) : error ? (
          <div className="rounded-2xl border border-rose-200/60 bg-rose-50/60 px-4 py-6 text-center">
            <p className="text-sm font-medium text-rose-700">
              No se pudo cargar el historial
            </p>
            <p className="mt-1 text-xs text-rose-600/70">{error}</p>
            <button
              onClick={loadReleases}
              className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white active:scale-95"
            >
              Reintentar
            </button>
          </div>
        ) : releases.length === 0 ? (
          <EmptyState
            message="Aún no hay versiones publicadas. Aparecerán aquí cuando se haga el primer release."
            icon={<History className="h-12 w-12" strokeWidth={1} />}
          />
        ) : (
          releases.map((release) => (
            <a
              key={release.id}
              href={release.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl bg-card px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Tag className="h-4 w-4" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">
                      {release.name?.trim() || release.tagName}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {formatReleaseDate(release.publishedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {release.tagName === APP_VERSION_LABEL && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Actual
                    </span>
                  )}
                  {release.isPrerelease && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Pre-release
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted-foreground/60">
                    {release.tagName}
                  </span>
                </div>
              </div>

              {/* Las notas vienen en Markdown; las mostramos como texto plano
                  (sin dangerouslySetInnerHTML) a propósito: evita XSS y mantiene
                  la página simple. Si algún día se quiere render de Markdown,
                  hacerlo con un sanitizador. */}
              {release.body?.trim() && (
                <p className="mt-2.5 whitespace-pre-line border-t border-border/40 pt-2.5 text-xs leading-relaxed text-muted-foreground/80 line-clamp-6">
                  {release.body.trim()}
                </p>
              )}
            </a>
          ))
        )}
      </div>
    </div>
  );
}
