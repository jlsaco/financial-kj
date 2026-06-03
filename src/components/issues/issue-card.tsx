import { Bug, Sparkles, CircleDot, CheckCircle2, XCircle } from "lucide-react";
import { Issue } from "@/types";
import { cn } from "@/lib/utils";

function formatIssueDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function statusConfig(issue: Issue) {
  if (issue.state === "open") {
    return {
      label: "Abierto",
      icon: CircleDot,
      className: "bg-amber-50/80 text-amber-700 border border-amber-200/60",
    };
  }
  if (issue.stateReason === "not_planned") {
    return {
      label: "Descartado",
      icon: XCircle,
      className: "bg-zinc-100/80 text-zinc-600 border border-zinc-200/60",
    };
  }
  return {
    label: "Resuelto",
    icon: CheckCircle2,
    className: "bg-emerald-50/80 text-emerald-700 border border-emerald-200/60",
  };
}

interface IssueCardProps {
  issue: Issue;
}

export function IssueCard({ issue }: IssueCardProps) {
  const isBug = issue.labels.includes("bug");
  const KindIcon = isBug ? Bug : Sparkles;
  const status = statusConfig(issue);
  const StatusIcon = status.icon;

  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all active:scale-[0.99]"
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          isBug ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-sky-600"
        )}
      >
        <KindIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {issue.title}
          </p>
          <span className="shrink-0 text-[11px] tabular-nums text-foreground/30">
            #{issue.number}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              status.className
            )}
          >
            <StatusIcon className="h-3 w-3" strokeWidth={2} />
            {status.label}
          </span>
          <span className="text-[11px] text-foreground/35">
            {formatIssueDate(issue.createdAt)}
          </span>
        </div>
      </div>
    </a>
  );
}
