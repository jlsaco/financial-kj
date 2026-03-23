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
      className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-2xl bg-primary shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] active:scale-95 active:translate-y-[1px]"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </Button>
  );
}
