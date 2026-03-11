import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground/50">
      {icon ?? <Inbox className="h-10 w-10" strokeWidth={1} />}
      <p className="text-[13px] font-medium">{message}</p>
    </div>
  );
}
