import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchCuentas,
  insertCuenta,
  updateCuenta,
  deleteCuenta,
} from "@/store/cuentas-store";
import { fetchRecords } from "@/store/records-store";
import { fetchLiquidaciones } from "@/store/cards-store";
import { fetchTransferencias } from "@/store/transferencias-store";
import { computeCuentaSaldo } from "@/lib/account-helpers";
import { ok, fail, guard, zUserId, zCuentaType } from "@/lib/mcp/shared";

/**
 * Tools sobre `cuentas` (cuentas bancarias / efectivo).
 *
 * Saldo = saldo inicial + ingresos − gastos de débito/efectivo − liquidaciones
 * de tarjeta pagadas desde la cuenta + transferencias recibidas − transferencias
 * enviadas. Los gastos con tarjeta no tocan la cuenta hasta que la tarjeta se
 * liquida. El efectivo (type='cash') es una cuenta más: su saldo se calcula
 * igual y se alimenta con transferencias (retiros de cajero), ingresos en
 * efectivo y gastos pagados en efectivo (crear_gasto con cuentaId del efectivo).
 */
export function registerCuentaTools(server: McpServer): void {
  server.tool(
    "crear_cuenta",
    "Crea una cuenta con un saldo inicial. type='bank' (por defecto) para una " +
      "cuenta bancaria; type='cash' para la bolsa de efectivo (dinero físico). " +
      "El efectivo funciona como cualquier cuenta: se le hacen transferencias " +
      "(retiros de cajero) y se pagan gastos con él (crear_gasto con cuentaId).",
    {
      name: z.string().describe("Nombre, p.ej. 'Bancolombia Jose' o 'Efectivo'"),
      owner: zUserId.describe("Dueño de la cuenta"),
      type: zCuentaType
        .optional()
        .describe("bank (bancaria, por defecto) o cash (efectivo)"),
      initialBalance: z
        .number()
        .optional()
        .describe("Saldo inicial (por defecto 0)"),
    },
    async ({ name, owner, type, initialBalance }) => {
      return guard(async () => {
        const cuenta = await insertCuenta({
          name,
          owner,
          type: type ?? "bank",
          initialBalance: initialBalance ?? 0,
        });
        return ok(cuenta);
      });
    }
  );

  server.tool(
    "listar_cuentas",
    "Lista las cuentas con su saldo calculado (inicial + ingresos − gastos de " +
      "débito/efectivo − liquidaciones pagadas + transferencias recibidas − " +
      "transferencias enviadas). Incluye el efectivo (type='cash'). Por defecto " +
      "solo activas.",
    {
      incluirInactivas: z.boolean().optional(),
      owner: zUserId.optional().describe("Filtra por dueño"),
      type: zCuentaType.optional().describe("Filtra por tipo (bank/cash)"),
    },
    async ({ incluirInactivas, owner, type }) => {
      return guard(async () => {
        let cuentas = await fetchCuentas();
        if (!incluirInactivas) cuentas = cuentas.filter((c) => c.isActive);
        if (owner) cuentas = cuentas.filter((c) => c.owner === owner);
        if (type) cuentas = cuentas.filter((c) => c.type === type);
        const [records, liquidaciones, transferencias] = await Promise.all([
          fetchRecords(),
          fetchLiquidaciones(),
          fetchTransferencias(),
        ]);
        const saldos = cuentas.map((c) =>
          computeCuentaSaldo(c, records, liquidaciones, transferencias)
        );
        const totalBalance = saldos.reduce((s, c) => s + c.balance, 0);
        return ok({ count: saldos.length, totalBalance, cuentas: saldos });
      });
    }
  );

  server.tool(
    "saldo_cuenta",
    "Saldo detallado de una cuenta por su id (balance, ingresos, gastos, " +
      "liquidaciones y transferencias de entrada/salida acumuladas).",
    {
      id: z.string().uuid().describe("ID (uuid) de la cuenta"),
    },
    async ({ id }) => {
      return guard(async () => {
        const cuenta = (await fetchCuentas()).find((c) => c.id === id);
        if (!cuenta) return fail(`No existe una cuenta con id ${id}.`);
        const [records, liquidaciones, transferencias] = await Promise.all([
          fetchRecords(),
          fetchLiquidaciones(),
          fetchTransferencias(),
        ]);
        return ok(
          computeCuentaSaldo(cuenta, records, liquidaciones, transferencias)
        );
      });
    }
  );

  server.tool(
    "actualizar_cuenta",
    "Actualiza una cuenta (nombre, dueño, tipo, saldo inicial, activa). Solo " +
      "cambia los campos enviados.",
    {
      id: z.string().uuid(),
      name: z.string().optional(),
      owner: zUserId.optional(),
      type: zCuentaType.optional().describe("bank (bancaria) o cash (efectivo)"),
      initialBalance: z.number().optional(),
      isActive: z.boolean().optional(),
    },
    async ({ id, name, owner, type, initialBalance, isActive }) => {
      return guard(async () => {
        const existing = (await fetchCuentas()).find((c) => c.id === id);
        if (!existing) return fail(`No existe una cuenta con id ${id}.`);
        const cuenta = await updateCuenta(id, {
          ...(name !== undefined && { name }),
          ...(owner !== undefined && { owner }),
          ...(type !== undefined && { type }),
          ...(initialBalance !== undefined && { initialBalance }),
          ...(isActive !== undefined && { isActive }),
        });
        return ok(cuenta);
      });
    }
  );

  server.tool(
    "borrar_cuenta",
    "Borra una cuenta. Los registros y liquidaciones que la referenciaban " +
      "quedan sin cuenta (cuenta_id NULL); se conservan. Las transferencias en " +
      "las que participaba (origen o destino) se borran en cascada. Irreversible.",
    {
      id: z.string().uuid().describe("ID (uuid) de la cuenta a borrar"),
    },
    async ({ id }) => {
      return guard(async () => {
        await deleteCuenta(id);
        return ok({ deleted: true, id });
      });
    }
  );
}
