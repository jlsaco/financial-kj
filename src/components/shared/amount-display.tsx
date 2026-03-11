import { RecordType } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface AmountDisplayProps {
  amount: number;
  type: RecordType;
  className?: string;
}

export function AmountDisplay({ amount, type, className }: AmountDisplayProps) {
  return (
    <span
      className={cn(
        "font-semibold tabular-nums font-mono",
        type === "ingreso" ? "text-emerald-600" : "text-rose-500",
        className
      )}
    >
      {type === "ingreso" ? "+" : "-"}
      {formatCurrency(amount)}
    </span>
  );
}
