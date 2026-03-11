import { Inbox } from "lucide-react";

interface EmptyStateProps {
  message: string;
  icon?: React.ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      {icon ?? <Inbox className="h-10 w-10" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}
