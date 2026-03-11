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
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";

interface RecordCardProps {
  record: FinanceRecord;
  onEdit: (record: FinanceRecord) => void;
  onDelete: (record: FinanceRecord) => void;
}

export function RecordCard({ record, onEdit, onDelete }: RecordCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <UserAvatar userId={record.userId} />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">{record.name}</p>
        <CategoryBadge category={record.category} className="mt-1 text-[10px]" />
      </div>
      <AmountDisplay amount={record.amount} type={record.type} className="text-sm" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(record)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(record)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
