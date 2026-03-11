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
  | {
      type: "UPDATE_RECORD";
      payload: { id: string; updates: Partial<FinanceRecord> };
    }
  | { type: "DELETE_RECORD"; payload: string }
  | { type: "ADD_RECURRING"; payload: RecurringEvent }
  | {
      type: "UPDATE_RECURRING";
      payload: { id: string; updates: Partial<RecurringEvent> };
    }
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
          r.id === action.payload.id
            ? { ...r, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : r
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
          e.id === action.payload.id
            ? { ...e, ...action.payload.updates }
            : e
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
  dispatch: React.Dispatch<FinanceAction>;
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
    dispatch({
      type: "INIT",
      payload: {
        records: recordsStore.getRecords(),
        recurringEvents: recurringStore.getRecurringEvents(),
        monthConfigs: recurringStore.getMonthConfigs(),
        budgets: budgetsStore.getBudgets(),
      },
    });
  }, []);

  useEffect(() => {
    if (!state.isLoaded) return;
    recordsStore.saveRecords(state.records);
  }, [state.records, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded) return;
    recurringStore.saveRecurringEvents(state.recurringEvents);
  }, [state.recurringEvents, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded) return;
    recurringStore.saveMonthConfigs(state.monthConfigs);
  }, [state.monthConfigs, state.isLoaded]);

  useEffect(() => {
    if (!state.isLoaded) return;
    budgetsStore.saveBudgets(state.budgets);
  }, [state.budgets, state.isLoaded]);

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
      value={{ state, dispatch, getMonthSummary, getUpcomingEvents }}
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
