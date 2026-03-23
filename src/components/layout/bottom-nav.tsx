"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ArrowLeftRight, Repeat, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: House, label: "Inicio" },
  { href: "/registros", icon: ArrowLeftRight, label: "Registros" },
  { href: "/recurrentes", icon: Repeat, label: "Recurrentes" },
  { href: "/presupuestos", icon: Target, label: "Metas" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-lg px-5 pb-4">
        <div className="flex h-[60px] items-center justify-around rounded-2xl border border-white/50 bg-white/80 px-2 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.02)] backdrop-blur-2xl">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center justify-center gap-2 rounded-xl py-2 transition-all duration-300 ease-out active:scale-95",
                  isActive
                    ? "bg-primary px-4 text-primary-foreground shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                    : "px-3 text-muted-foreground/60 hover:text-muted-foreground"
                )}
              >
                <item.icon
                  className="h-[22px] w-[22px] shrink-0 transition-all duration-300"
                  strokeWidth={isActive ? 2 : 1.6}
                />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap text-[13px] font-semibold transition-all duration-300 ease-out",
                    isActive
                      ? "max-w-[100px] opacity-100"
                      : "max-w-0 opacity-0"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
