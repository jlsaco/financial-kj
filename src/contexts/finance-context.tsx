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
  ClassifiedRecurringGroups,
  Tarjeta,
  Liquidacion,
  TarjetaMonthStatus,
  CompraDiferida,
  Cuenta,
  CuentaSaldo,
} from "@/types";
import * as recordsStore from "@/store/records-store";
import * as recurringStore from "@/store/recurring-store";
import * as budgetsStore from "@/store/budgets-store";
import * as cardsStore from "@/store/cards-store";
import * as comprasStore from "@/store/compras-store";
import * as cuentasStore from "@/store/cuentas-store";
import {
  classifyRecurringEvents,
  getUpcomingRecurringEvents,
} from "@/lib/date-helpers";
import { getTarjetasMonthStatus } from "@/lib/card-helpers";
import { computeCuentasSaldos } from "@/lib/account-helpers";
import { CATEGORIES } from "@/lib/constants";
import { toast } from "sonner";

interface FinanceState {
  records: FinanceRecord[];
  recurringEvents: RecurringEvent[];
  monthConfigs: MonthPaymentConfig[];
  budgets: CategoryBudget[];
  tarjetas: Tarjeta[];
  liquidaciones: Liquidacion[];
  comprasDiferidas: CompraDiferida[];
  cuentas: Cuenta[];
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
  | { type: "UPDATE_BUDGET"; payload: CategoryBudget }
  | { type: "ADD_TARJETA"; payload: Tarjeta }
  | { type: "UPDATE_TARJETA"; payload: Tarjeta }
  | { type: "DELETE_TARJETA"; payload: string }
  | { type: "SET_LIQUIDACION"; payload: Liquidacion }
  | { type: "DELETE_LIQUIDACION"; payload: { tarjetaId: string; month: number; year: number } }
  | { type: "SET_RECORDS"; payload: FinanceRecord[] }
  | { type: "ADD_COMPRA"; payload: CompraDiferida }
  | { type: "DELETE_COMPRA"; payload: string }
  | { type: "ADD_CUENTA"; payload: Cuenta }
  | { type: "UPDATE_CUENTA"; payload: Cuenta }
  | { type: "DELETE_CUENTA"; payload: string };

const initialState: FinanceState = {
  records: [],
  recurringEvents: [],
  monthConfigs: [],
  budgets: [],
  tarjetas: [],
  liquidaciones: [],
  comprasDiferidas: [],
  cuentas: [],
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

    case "ADD_TARJETA":
      return { ...state, tarjetas: [...state.tarjetas, action.payload] };

    case "UPDATE_TARJETA":
      return {
        ...state,
        tarjetas: state.tarjetas.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };

    case "DELETE_TARJETA":
      // En BD: finance_records.tarjeta_id → SET NULL, liquidaciones → CASCADE.
      // Reflejamos lo mismo en memoria.
      return {
        ...state,
        tarjetas: state.tarjetas.filter((t) => t.id !== action.payload),
        records: state.records.map((r) =>
          r.tarjetaId === action.payload ? { ...r, tarjetaId: undefined } : r
        ),
        liquidaciones: state.liquidaciones.filter(
          (l) => l.tarjetaId !== action.payload
        ),
      };

    case "SET_LIQUIDACION": {
      const existing = state.liquidaciones.findIndex(
        (l) =>
          l.tarjetaId === action.payload.tarjetaId &&
          l.month === action.payload.month &&
          l.year === action.payload.year
      );
      const liquidaciones = [...state.liquidaciones];
      if (existing >= 0) {
        liquidaciones[existing] = action.payload;
      } else {
        liquidaciones.push(action.payload);
      }
      return { ...state, liquidaciones };
    }

    case "DELETE_LIQUIDACION":
      return {
        ...state,
        liquidaciones: state.liquidaciones.filter(
          (l) =>
            !(
              l.tarjetaId === action.payload.tarjetaId &&
              l.month === action.payload.month &&
              l.year === action.payload.year
            )
        ),
      };

    case "SET_RECORDS":
      return { ...state, records: action.payload };

    case "ADD_COMPRA":
      return {
        ...state,
        comprasDiferidas: [action.payload, ...state.comprasDiferidas],
      };

    case "DELETE_COMPRA":
      // En BD las cuotas (finance_records hijos) se borran en cascada.
      return {
        ...state,
        comprasDiferidas: state.comprasDiferidas.filter(
          (c) => c.id !== action.payload
        ),
        records: state.records.filter(
          (r) => r.compraDiferidaId !== action.payload
        ),
      };

    case "ADD_CUENTA":
      return { ...state, cuentas: [...state.cuentas, action.payload] };

    case "UPDATE_CUENTA":
      return {
        ...state,
        cuentas: state.cuentas.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      };

    case "DELETE_CUENTA":
      // En BD las referencias (records.cuenta_id, liquidaciones.cuenta_id,
      // tarjetas.cuenta_pago_id) pasan a NULL. Reflejamos lo mismo en memoria.
      return {
        ...state,
        cuentas: state.cuentas.filter((c) => c.id !== action.payload),
        records: state.records.map((r) =>
          r.cuentaId === action.payload ? { ...r, cuentaId: undefined } : r
        ),
        liquidaciones: state.liquidaciones.map((l) =>
          l.cuentaId === action.payload ? { ...l, cuentaId: undefined } : l
        ),
        tarjetas: state.tarjetas.map((t) =>
          t.cuentaPagoId === action.payload
            ? { ...t, cuentaPagoId: undefined }
            : t
        ),
      };

    default:
      return state;
  }
}

interface FinanceContextValue {
  state: FinanceState;
  addRecord: (data: Omit<FinanceRecord, "id" | "createdAt" | "updatedAt">) => Promise<FinanceRecord>;
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
  getClassifiedRecurring: () => ClassifiedRecurringGroups;
  addTarjeta: (
    data: Omit<Tarjeta, "id" | "createdAt" | "isActive"> & { isActive?: boolean }
  ) => Promise<Tarjeta>;
  updateTarjeta: (id: string, updates: Partial<Tarjeta>) => Promise<void>;
  deleteTarjeta: (id: string) => Promise<void>;
  /** Marca/actualiza la liquidación (pago) de una tarjeta para un periodo. */
  setLiquidacion: (liq: Omit<Liquidacion, "id" | "createdAt">) => Promise<void>;
  /** Borra la liquidación de un periodo (deja la tarjeta como pendiente). */
  clearLiquidacion: (
    tarjetaId: string,
    month: number,
    year: number
  ) => Promise<void>;
  /** Estado de liquidación de todas las tarjetas para un periodo. */
  getTarjetasStatus: (month: number, year: number) => TarjetaMonthStatus[];
  /** Crea una compra diferida (genera sus N cuotas como gastos). */
  addCompraDiferida: (
    data: Omit<CompraDiferida, "id" | "createdAt">
  ) => Promise<void>;
  /** Borra una compra diferida y sus cuotas. */
  deleteCompraDiferida: (id: string) => Promise<void>;
  addCuenta: (
    data: Omit<Cuenta, "id" | "createdAt" | "isActive"> & { isActive?: boolean }
  ) => Promise<Cuenta>;
  updateCuenta: (id: string, updates: Partial<Cuenta>) => Promise<void>;
  deleteCuenta: (id: string) => Promise<void>;
  /** Saldo calculado de todas las cuentas. */
  getCuentasSaldos: () => CuentaSaldo[];
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, initialState);

  useEffect(() => {
    async function load() {
      const [
        records,
        recurringEvents,
        monthConfigs,
        budgets,
        tarjetas,
        liquidaciones,
        comprasDiferidas,
        cuentas,
      ] = await Promise.all([
        recordsStore.fetchRecords(),
        recurringStore.fetchRecurringEvents(),
        recurringStore.fetchMonthConfigs(),
        budgetsStore.fetchBudgets(),
        cardsStore.fetchTarjetas(),
        cardsStore.fetchLiquidaciones(),
        comprasStore.fetchComprasDiferidas(),
        cuentasStore.fetchCuentas(),
      ]);
      dispatch({
        type: "INIT",
        payload: {
          records,
          recurringEvents,
          monthConfigs,
          budgets,
          tarjetas,
          liquidaciones,
          comprasDiferidas,
          cuentas,
        },
      });
    }
    load().catch(() => toast.error("Error cargando datos"));
  }, []);

  const addRecord = useCallback(
    async (data: Omit<FinanceRecord, "id" | "createdAt" | "updatedAt">) => {
      const saved = await recordsStore.insertRecord(data);
      dispatch({ type: "ADD_RECORD", payload: saved });
      return saved;
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

  const getClassifiedRecurring = useCallback(() => {
    return classifyRecurringEvents(state.recurringEvents, state.monthConfigs);
  }, [state.recurringEvents, state.monthConfigs]);

  const addTarjeta = useCallback(
    async (
      data: Omit<Tarjeta, "id" | "createdAt" | "isActive"> & {
        isActive?: boolean;
      }
    ) => {
      const saved = await cardsStore.insertTarjeta(data);
      dispatch({ type: "ADD_TARJETA", payload: saved });
      return saved;
    },
    []
  );

  const updateTarjeta = useCallback(
    async (id: string, updates: Partial<Tarjeta>) => {
      const saved = await cardsStore.updateTarjeta(id, updates);
      dispatch({ type: "UPDATE_TARJETA", payload: saved });
    },
    []
  );

  const deleteTarjeta = useCallback(async (id: string) => {
    await cardsStore.deleteTarjeta(id);
    dispatch({ type: "DELETE_TARJETA", payload: id });
  }, []);

  const setLiquidacion = useCallback(
    async (liq: Omit<Liquidacion, "id" | "createdAt">) => {
      const saved = await cardsStore.upsertLiquidacion(liq);
      dispatch({ type: "SET_LIQUIDACION", payload: saved });
    },
    []
  );

  const clearLiquidacion = useCallback(
    async (tarjetaId: string, month: number, year: number) => {
      await cardsStore.deleteLiquidacion(tarjetaId, month, year);
      dispatch({
        type: "DELETE_LIQUIDACION",
        payload: { tarjetaId, month, year },
      });
    },
    []
  );

  const getTarjetasStatus = useCallback(
    (month: number, year: number) =>
      getTarjetasMonthStatus(
        state.tarjetas,
        state.records,
        state.liquidaciones,
        state.recurringEvents,
        state.monthConfigs,
        month,
        year
      ),
    [
      state.tarjetas,
      state.records,
      state.liquidaciones,
      state.recurringEvents,
      state.monthConfigs,
    ]
  );

  const addCompraDiferida = useCallback(
    async (data: Omit<CompraDiferida, "id" | "createdAt">) => {
      const saved = await comprasStore.insertCompraDiferida(data);
      // Las cuotas (hijos) se insertan en BD fuera del dispatch: recargamos.
      const records = await recordsStore.fetchRecords();
      dispatch({ type: "SET_RECORDS", payload: records });
      dispatch({ type: "ADD_COMPRA", payload: saved });
    },
    []
  );

  const deleteCompraDiferida = useCallback(async (id: string) => {
    await comprasStore.deleteCompraDiferida(id);
    dispatch({ type: "DELETE_COMPRA", payload: id });
  }, []);

  const addCuenta = useCallback(
    async (
      data: Omit<Cuenta, "id" | "createdAt" | "isActive"> & {
        isActive?: boolean;
      }
    ) => {
      const saved = await cuentasStore.insertCuenta(data);
      dispatch({ type: "ADD_CUENTA", payload: saved });
      return saved;
    },
    []
  );

  const updateCuenta = useCallback(
    async (id: string, updates: Partial<Cuenta>) => {
      const saved = await cuentasStore.updateCuenta(id, updates);
      dispatch({ type: "UPDATE_CUENTA", payload: saved });
    },
    []
  );

  const deleteCuenta = useCallback(async (id: string) => {
    await cuentasStore.deleteCuenta(id);
    dispatch({ type: "DELETE_CUENTA", payload: id });
  }, []);

  const getCuentasSaldos = useCallback(
    () =>
      computeCuentasSaldos(state.cuentas, state.records, state.liquidaciones),
    [state.cuentas, state.records, state.liquidaciones]
  );

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
        getClassifiedRecurring,
        addTarjeta,
        updateTarjeta,
        deleteTarjeta,
        setLiquidacion,
        clearLiquidacion,
        getTarjetasStatus,
        addCompraDiferida,
        deleteCompraDiferida,
        addCuenta,
        updateCuenta,
        deleteCuenta,
        getCuentasSaldos,
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
