"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bug, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { USERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Secondary / utility destinations that don't belong in the bottom nav.
 * Add new entries here as the app grows (Ajustes, Perfil, Ayuda…).
 */
const MENU_GROUPS: {
  label: string;
  items: {
    href: string;
    icon: typeof Bug;
    title: string;
    description: string;
    iconClass: string;
  }[];
}[] = [
  {
    label: "Más opciones",
    items: [
      {
        href: "/reportar",
        icon: Bug,
        title: "Reportar",
        description: "Bugs y mejoras",
        iconClass: "bg-rose-50 text-rose-600",
      },
    ],
  },
];

export function MainMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Abrir menú"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground/60 transition-all hover:bg-accent/50 hover:text-foreground active:scale-95"
      >
        <Menu className="h-5 w-5" strokeWidth={1.8} />
      </SheetTrigger>

      <SheetContent side="right" className="w-[82%] max-w-xs gap-0 p-0">
        <SheetHeader className="gap-1 px-5 pb-5 pt-6">
          <SheetTitle className="text-lg font-bold tracking-tight">
            FinanceKJ
          </SheetTitle>
          <p className="text-[13px] text-muted-foreground/70">
            Finanzas compartidas
          </p>
          <div className="mt-3 flex -space-x-1.5">
            {(["jose", "karen"] as const).map((id) => (
              <Avatar
                key={id}
                className="h-7 w-7 ring-2 ring-background"
              >
                <AvatarFallback
                  className={cn("text-[11px] text-white", USERS[id].color)}
                >
                  {USERS[id].avatar}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
        </SheetHeader>

        <nav className="flex flex-col gap-6 px-3 pt-2">
          {MENU_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1.5">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-widest text-foreground/35">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-all active:scale-[0.99]",
                      isActive ? "bg-accent/60" : "hover:bg-accent/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        item.iconClass
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">
                        {item.title}
                      </span>
                      <span className="block text-xs text-muted-foreground/70">
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-foreground/25"
                      strokeWidth={2}
                    />
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
