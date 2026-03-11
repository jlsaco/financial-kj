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
        "font-semibold tabular-nums",
        type === "ingreso" ? "text-green-600" : "text-red-600",
        className
      )}
    >
      {type === "ingreso" ? "+" : "-"}
      {formatCurrency(amount)}
    </span>
  );
}
