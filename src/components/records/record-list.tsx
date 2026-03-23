"use client";

import { FinanceRecord } from "@/types";
import { RecordCard } from "./record-card";
import { EmptyState } from "@/components/shared/empty-state";
import { groupByDate } from "@/lib/date-helpers";
import { formatDate } from "@/lib/formatters";

interface RecordListProps {
  records: FinanceRecord[];
  onEdit: (record: FinanceRecord) => void;
  onDelete: (record: FinanceRecord) => void;
}

export function RecordList({ records, onEdit, onDelete }: RecordListProps) {
  if (records.length === 0) {
    return <EmptyState message="No hay registros para este periodo" />;
  }

  const grouped = groupByDate(records);

  return (
    <div>
      {Array.from(grouped.entries()).map(([date, items]) => (
        <div key={date}>
          <div className="sticky top-[105px] z-10 bg-background/80 backdrop-blur-sm px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/35">
              {formatDate(date)}
            </p>
          </div>
          <div className="divide-y divide-border/30">
            {items.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
