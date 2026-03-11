"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FabButtonProps {
  onClick: () => void;
}

export function FabButton({ onClick }: FabButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-20 right-4 z-30 h-13 w-13 rounded-2xl bg-primary shadow-[0_4px_14px_rgba(16,185,129,0.35)] transition-all duration-200 hover:shadow-[0_6px_20px_rgba(16,185,129,0.45)] active:scale-95 active:translate-y-[1px]"
    >
      <Plus className="h-5 w-5" strokeWidth={2.5} />
    </Button>
  );
}
