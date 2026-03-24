import { Category, User, UserId } from "@/types";

export const USERS: Record<UserId, User> = {
  jose: { id: "jose", name: "Jose", avatar: "J", color: "bg-emerald-600" },
  karen: { id: "karen", name: "Karen", avatar: "K", color: "bg-rose-500" },
  "bot-correos": {
    id: "bot-correos",
    name: "Bot",
    avatar: "B",
    color: "bg-zinc-500",
  },
};

export const CATEGORIES: Record<
  Category,
  { label: string; icon: string; color: string; bgLight: string }
> = {
  movilidad: {
    label: "Movilidad",
    icon: "Car",
    color: "bg-amber-600",
    bgLight: "bg-amber-50/80 text-amber-800 border border-amber-200/60",
  },
  "alimentacion-salud": {
    label: "Salud",
    icon: "HeartPulse",
    color: "bg-emerald-600",
    bgLight: "bg-emerald-50/80 text-emerald-800 border border-emerald-200/60",
  },
  "hogar-entretenimiento": {
    label: "Hogar",
    icon: "Home",
    color: "bg-sky-600",
    bgLight: "bg-sky-50/80 text-sky-800 border border-sky-200/60",
  },
  deuda: {
    label: "Deuda",
    icon: "CreditCard",
    color: "bg-rose-600",
    bgLight: "bg-rose-50/80 text-rose-800 border border-rose-200/60",
  },
  servicios: {
    label: "Servicios",
    icon: "Wifi",
    color: "bg-violet-600",
    bgLight: "bg-violet-50/80 text-violet-800 border border-violet-200/60",
  },
};

export const RECORD_TYPE_CONFIG = {
  gasto: { label: "Gasto", color: "text-red-600", bgColor: "bg-red-50" },
  ingreso: {
    label: "Ingreso",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
};

export const ALL_CATEGORIES: Category[] = [
  "movilidad",
  "alimentacion-salud",
  "hogar-entretenimiento",
  "deuda",
  "servicios",
];

export const ALL_USER_IDS: UserId[] = ["jose", "karen", "bot-correos"];
