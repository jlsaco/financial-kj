"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ArrowLeftRight, Repeat, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: House, label: "Inicio" },
  { href: "/registros", icon: ArrowLeftRight, label: "Registros" },
  { href: "/recurrentes", icon: Repeat, label: "Recurrentes" },
  { href: "/presupuestos", icon: Target, label: "Presupuestos" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      {/* Floating pill container */}
      <div className="mx-auto max-w-lg px-4 pb-3">
        <div className="flex h-[62px] items-center justify-around rounded-[20px] border border-white/40 bg-card/85 px-1 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.16),0_0_0_1px_rgba(0,0,0,0.03)] backdrop-blur-2xl">
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
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 transition-all duration-200 active:scale-90",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
              >
                {/* Active pill background */}
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-primary/8" />
                )}
                <item.icon
                  className={cn(
                    "relative z-10 h-[20px] w-[20px] transition-all duration-200",
                  )}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                <span className={cn(
                  "relative z-10 text-[10px] transition-all duration-200",
                  isActive ? "font-semibold" : "font-medium"
                )}>
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
