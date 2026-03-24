"use client";

import { FinanceRecord } from "@/types";
import { CategoryBadge } from "@/components/shared/category-badge";
import { AmountDisplay } from "@/components/shared/amount-display";
import { UserAvatar } from "@/components/shared/user-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

interface RecordCardProps {
  record: FinanceRecord;
  onEdit: (record: FinanceRecord) => void;
  onDelete: (record: FinanceRecord) => void;
}

export function RecordCard({ record, onEdit, onDelete }: RecordCardProps) {
  return (
    <div
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/40 active:bg-accent/60 cursor-pointer"
      onClick={() => onEdit(record)}
    >
      <UserAvatar userId={record.userId} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{record.name}</p>
        <CategoryBadge category={record.category} className="mt-1" />
      </div>
      <AmountDisplay amount={record.amount} type={record.type} className="text-sm" />
      <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent">
            <MoreVertical className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(record)}>
              <Pencil className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(record)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
