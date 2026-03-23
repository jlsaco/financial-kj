import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-foreground/25">
      {icon ?? <Inbox className="h-12 w-12" strokeWidth={1} />}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
