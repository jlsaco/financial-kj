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
import { computeCuentaSaldo } from "@/lib/account-helpers";
import { ok, fail, guard, zUserId } from "@/lib/mcp/shared";

/**
 * Tools sobre `cuentas` (cuentas bancarias / efectivo).
 *
 * Saldo = saldo inicial + ingresos − gastos de débito/efectivo − liquidaciones
 * de tarjeta pagadas desde la cuenta. Los gastos con tarjeta no tocan la cuenta
 * hasta que la tarjeta se liquida.
 */
export function registerCuentaTools(server: McpServer): void {
  server.tool(
    "crear_cuenta",
    "Crea una cuenta bancaria / efectivo con un saldo inicial.",
    {
      name: z.string().describe("Nombre, p.ej. 'Bancolombia Jose'"),
      owner: zUserId.describe("Dueño de la cuenta"),
      initialBalance: z
        .number()
        .optional()
        .describe("Saldo inicial (por defecto 0)"),
    },
    async ({ name, owner, initialBalance }) => {
      return guard(async () => {
        const cuenta = await insertCuenta({
          name,
          owner,
          initialBalance: initialBalance ?? 0,
        });
        return ok(cuenta);
      });
    }
  );

  server.tool(
    "listar_cuentas",
    "Lista las cuentas con su saldo calculado (inicial + ingresos − gastos de " +
      "débito/efectivo − liquidaciones pagadas). Por defecto solo activas.",
    {
      incluirInactivas: z.boolean().optional(),
      owner: zUserId.optional().describe("Filtra por dueño"),
    },
    async ({ incluirInactivas, owner }) => {
      return guard(async () => {
        let cuentas = await fetchCuentas();
        if (!incluirInactivas) cuentas = cuentas.filter((c) => c.isActive);
        if (owner) cuentas = cuentas.filter((c) => c.owner === owner);
        const [records, liquidaciones] = await Promise.all([
          fetchRecords(),
          fetchLiquidaciones(),
        ]);
        const saldos = cuentas.map((c) =>
          computeCuentaSaldo(c, records, liquidaciones)
        );
        const totalBalance = saldos.reduce((s, c) => s + c.balance, 0);
        return ok({ count: saldos.length, totalBalance, cuentas: saldos });
      });
    }
  );

  server.tool(
    "saldo_cuenta",
    "Saldo detallado de una cuenta por su id (balance, ingresos, gastos y " +
      "liquidaciones acumuladas).",
    {
      id: z.string().uuid().describe("ID (uuid) de la cuenta"),
    },
    async ({ id }) => {
      return guard(async () => {
        const cuenta = (await fetchCuentas()).find((c) => c.id === id);
        if (!cuenta) return fail(`No existe una cuenta con id ${id}.`);
        const [records, liquidaciones] = await Promise.all([
          fetchRecords(),
          fetchLiquidaciones(),
        ]);
        return ok(computeCuentaSaldo(cuenta, records, liquidaciones));
      });
    }
  );

  server.tool(
    "actualizar_cuenta",
    "Actualiza una cuenta (nombre, dueño, saldo inicial, activa). Solo cambia " +
      "los campos enviados.",
    {
      id: z.string().uuid(),
      name: z.string().optional(),
      owner: zUserId.optional(),
      initialBalance: z.number().optional(),
      isActive: z.boolean().optional(),
    },
    async ({ id, name, owner, initialBalance, isActive }) => {
      return guard(async () => {
        const existing = (await fetchCuentas()).find((c) => c.id === id);
        if (!existing) return fail(`No existe una cuenta con id ${id}.`);
        const cuenta = await updateCuenta(id, {
          ...(name !== undefined && { name }),
          ...(owner !== undefined && { owner }),
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
      "quedan sin cuenta (cuenta_id NULL); se conservan. Irreversible.",
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
