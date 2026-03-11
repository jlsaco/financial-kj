import { Category, CategoryBudget, User, UserId } from "@/types";

export const USERS: Record<UserId, User> = {
  jose: { id: "jose", name: "Jose", avatar: "J", color: "bg-blue-500" },
  karen: { id: "karen", name: "Karen", avatar: "K", color: "bg-purple-500" },
  "bot-correos": {
    id: "bot-correos",
    name: "Bot Correos",
    avatar: "🤖",
    color: "bg-gray-500",
  },
};

export const CATEGORIES: Record<
  Category,
  { label: string; icon: string; color: string; bgLight: string }
> = {
  movilidad: {
    label: "Movilidad",
    icon: "Car",
    color: "bg-amber-500",
    bgLight: "bg-amber-50 text-amber-700",
  },
  "alimentacion-salud": {
    label: "Alimentación & Salud",
    icon: "Apple",
    color: "bg-green-500",
    bgLight: "bg-green-50 text-green-700",
  },
  "hogar-entretenimiento": {
    label: "Hogar & Entretenimiento",
    icon: "Home",
    color: "bg-indigo-500",
    bgLight: "bg-indigo-50 text-indigo-700",
  },
  deuda: {
    label: "Deuda",
    icon: "CreditCard",
    color: "bg-red-500",
    bgLight: "bg-red-50 text-red-700",
  },
  servicios: {
    label: "Servicios",
    icon: "Zap",
    color: "bg-cyan-500",
    bgLight: "bg-cyan-50 text-cyan-700",
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

export const STORAGE_KEYS = {
  RECORDS: "financekj_records",
  RECURRING_EVENTS: "financekj_recurring_events",
  MONTH_CONFIGS: "financekj_month_payment_configs",
  BUDGETS: "financekj_budgets",
} as const;

export const DEFAULT_BUDGETS: CategoryBudget[] = [
  {
    category: "movilidad",
    monthlyBudget: 300000,
    updatedAt: new Date().toISOString(),
  },
  {
    category: "alimentacion-salud",
    monthlyBudget: 800000,
    updatedAt: new Date().toISOString(),
  },
  {
    category: "hogar-entretenimiento",
    monthlyBudget: 500000,
    updatedAt: new Date().toISOString(),
  },
  {
    category: "deuda",
    monthlyBudget: 1000000,
    updatedAt: new Date().toISOString(),
  },
  {
    category: "servicios",
    monthlyBudget: 400000,
    updatedAt: new Date().toISOString(),
  },
];

export const ALL_CATEGORIES: Category[] = [
  "movilidad",
  "alimentacion-salud",
  "hogar-entretenimiento",
  "deuda",
  "servicios",
];

export const ALL_USER_IDS: UserId[] = ["jose", "karen", "bot-correos"];
