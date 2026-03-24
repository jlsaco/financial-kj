"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  FinanceRecord,
  RecurringEvent,
  MonthPaymentConfig,
  CategoryBudget,
  Category,
  UpcomingEvent,
} from "@/types";
import * as recordsStore from "@/store/records-store";
import * as recurringStore from "@/store/recurring-store";
import * as budgetsStore from "@/store/budgets-store";
import { getUpcomingRecurringEvents } from "@/lib/date-helpers";
import { CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

interface FinanceState {
  records: FinanceRecord[];
  recurringEvents: RecurringEvent[];
  monthConfigs: MonthPaymentConfig[];
  budgets: CategoryBudget[];
  isLoaded: boolean;
}

type FinanceAction =
  | { type: "INIT"; payload: Omit<FinanceState, "isLoaded"> }
  | { type: "ADD_RECORD"; payload: FinanceRecord }
  | { type: "UPDATE_RECORD"; payload: FinanceRecord }
  | { type: "DELETE_RECORD"; payload: string }
  | { type: "ADD_RECURRING"; payload: RecurringEvent }
  | { type: "UPDATE_RECURRING"; payload: RecurringEvent }
  | { type: "DELETE_RECURRING"; payload: string }
  | { type: "SET_MONTH_CONFIG"; payload: MonthPaymentConfig }
  | { type: "UPDATE_BUDGET"; payload: CategoryBudget };

const initialState: FinanceState = {
  records: [],
  recurringEvents: [],
  monthConfigs: [],
  budgets: [],
  isLoaded: false,
};

function financeReducer(
  state: FinanceState,
  action: FinanceAction
): FinanceState {
  switch (action.type) {
    case "INIT":
      return { ...action.payload, isLoaded: true };

    case "ADD_RECORD":
      return { ...state, records: [...state.records, action.payload] };

    case "UPDATE_RECORD":
      return {
        ...state,
        records: state.records.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      };

    case "DELETE_RECORD":
      return {
        ...state,
        records: state.records.filter((r) => r.id !== action.payload),
      };

    case "ADD_RECURRING":
      return {
        ...state,
        recurringEvents: [...state.recurringEvents, action.payload],
      };

    case "UPDATE_RECURRING":
      return {
        ...state,
        recurringEvents: state.recurringEvents.map((e) =>
          e.id === action.payload.id ? action.payload : e
        ),
      };

    case "DELETE_RECURRING":
      return {
        ...state,
        recurringEvents: state.recurringEvents.filter(
          (e) => e.id !== action.payload
        ),
        monthConfigs: state.monthConfigs.filter(
          (c) => c.recurringEventId !== action.payload
        ),
      };

    case "SET_MONTH_CONFIG": {
      const existing = state.monthConfigs.findIndex(
        (c) =>
          c.recurringEventId === action.payload.recurringEventId &&
          c.month === action.payload.month &&
          c.year === action.payload.year
      );
      const configs = [...state.monthConfigs];
      if (existing >= 0) {
        configs[existing] = action.payload;
      } else {
        configs.push(action.payload);
      }
      return { ...state, monthConfigs: configs };
    }

    case "UPDATE_BUDGET":
      return {
        ...state,
        budgets: state.budgets.map((b) =>
          b.category === action.payload.category ? action.payload : b
        ),
      };

    default:
      return state;
  }
}

interface FinanceContextValue {
  state: FinanceState;
  addRecord: (data: Omit<FinanceRecord, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateRecord: (id: string, updates: Partial<FinanceRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  addRecurringEvent: (data: Omit<RecurringEvent, "id" | "createdAt">) => Promise<void>;
  updateRecurringEvent: (id: string, updates: Partial<RecurringEvent>) => Promise<void>;
  deleteRecurringEvent: (id: string) => Promise<void>;
  setMonthConfig: (config: Omit<MonthPaymentConfig, "id">) => Promise<void>;
  updateBudget: (budget: CategoryBudget) => Promise<void>;
  getMonthSummary: (
    month: number,
    year: number
  ) => {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    byCategory: Record<Category, number>;
  };
  getUpcomingEvents: () => UpcomingEvent[];
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, initialState);

  useEffect(() => {
    async function load() {
      const [records, recurringEvents, monthConfigs, budgets] =
        await Promise.all([
          recordsStore.fetchRecords(),
          recurringStore.fetchRecurringEvents(),
          recurringStore.fetchMonthConfigs(),
          budgetsStore.fetchBudgets(),
        ]);
      dispatch({
        type: "INIT",
        payload: { records, recurringEvents, monthConfigs, budgets },
      });
    }
    load().catch(() => toast.error("Error cargando datos"));
  }, []);

  const addRecord = useCallback(
    async (data: Omit<FinanceRecord, "id" | "createdAt" | "updatedAt">) => {
      const saved = await recordsStore.insertRecord(data);
      dispatch({ type: "ADD_RECORD", payload: saved });
    },
    []
  );

  const updateRecord = useCallback(
    async (id: string, updates: Partial<FinanceRecord>) => {
      const saved = await recordsStore.updateRecord(id, updates);
      dispatch({ type: "UPDATE_RECORD", payload: saved });
    },
    []
  );

  const deleteRecord = useCallback(async (id: string) => {
    await recordsStore.deleteRecord(id);
    dispatch({ type: "DELETE_RECORD", payload: id });
  }, []);

  const addRecurringEvent = useCallback(
    async (data: Omit<RecurringEvent, "id" | "createdAt">) => {
      const saved = await recurringStore.insertRecurringEvent(data);
      dispatch({ type: "ADD_RECURRING", payload: saved });
    },
    []
  );

  const updateRecurringEvent = useCallback(
    async (id: string, updates: Partial<RecurringEvent>) => {
      const saved = await recurringStore.updateRecurringEvent(id, updates);
      dispatch({ type: "UPDATE_RECURRING", payload: saved });
    },
    []
  );

  const deleteRecurringEvent = useCallback(async (id: string) => {
    await recurringStore.deleteRecurringEvent(id);
    dispatch({ type: "DELETE_RECURRING", payload: id });
  }, []);

  const setMonthConfig = useCallback(
    async (config: Omit<MonthPaymentConfig, "id">) => {
      const saved = await recurringStore.upsertMonthConfig(config);
      dispatch({ type: "SET_MONTH_CONFIG", payload: saved });
    },
    []
  );

  const updateBudget = useCallback(async (budget: CategoryBudget) => {
    const saved = await budgetsStore.updateBudget(budget);
    dispatch({ type: "UPDATE_BUDGET", payload: saved });
  }, []);

  const getMonthSummary = useCallback(
    (month: number, year: number) => {
      const monthRecords = state.records.filter((r) => {
        const d = new Date(r.date + "T12:00:00");
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      });

      const totalIncome = monthRecords
        .filter((r) => r.type === "ingreso")
        .reduce((sum, r) => sum + r.amount, 0);

      const totalExpenses = monthRecords
        .filter((r) => r.type === "gasto")
        .reduce((sum, r) => sum + r.amount, 0);

      const byCategory = {} as Record<Category, number>;
      for (const cat of Object.keys(CATEGORIES) as Category[]) {
        byCategory[cat] = monthRecords
          .filter((r) => r.category === cat && r.type === "gasto")
          .reduce((sum, r) => sum + r.amount, 0);
      }

      return {
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        byCategory,
      };
    },
    [state.records]
  );

  const getUpcomingEvents = useCallback(() => {
    return getUpcomingRecurringEvents(state.recurringEvents, state.monthConfigs);
  }, [state.recurringEvents, state.monthConfigs]);

  return (
    <FinanceContext.Provider
      value={{
        state,
        addRecord,
        updateRecord,
        deleteRecord,
        addRecurringEvent,
        updateRecurringEvent,
        deleteRecurringEvent,
        setMonthConfig,
        updateBudget,
        getMonthSummary,
        getUpcomingEvents,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used within FinanceProvider");
  return ctx;
}
