import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchTransferencias,
  insertTransferencia,
  deleteTransferencia,
} from "@/store/transferencias-store";
import { fetchCuentas } from "@/store/cuentas-store";
import { ok, fail, guard, today } from "@/lib/mcp/shared";

/**
 * Tools sobre `transferencias`: movimientos internos entre dos cuentas
 * (p.ej. retiro de cajero: banco → efectivo). NO son gasto ni ingreso: solo
 * mueven saldo de una cuenta a otra y por eso no aparecen en resumen_mes,
 * presupuestos ni reportes de gastos/ingresos. El saldo de las cuentas
 * (listar_cuentas / saldo_cuenta) sí las refleja.
 */
export function registerTransferenciaTools(server: McpServer): void {
  server.tool(
    "crear_transferencia",
    "Registra una transferencia interna entre dos cuentas: resta el monto de la " +
      "cuenta origen y lo suma a la cuenta destino. Sirve para retiros de cajero " +
      "(banco → efectivo), consignaciones (efectivo → banco) o mover dinero entre " +
      "cuentas. NO cuenta como gasto ni ingreso: es un movimiento neutro que solo " +
      "afecta el saldo de las cuentas, nunca los reportes de P&L (resumen_mes, " +
      "presupuestos, listar_gastos).",
    {
      cuentaOrigenId: z
        .string()
        .uuid()
        .describe("ID (uuid) de la cuenta de la que sale el dinero"),
      cuentaDestinoId: z
        .string()
        .uuid()
        .describe("ID (uuid) de la cuenta a la que entra el dinero"),
      amount: z.number().positive().describe("Monto en pesos (positivo)"),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha YYYY-MM-DD (por defecto hoy)"),
      note: z
        .string()
        .optional()
        .describe("Nota opcional, p.ej. 'Retiro cajero'"),
    },
    async ({ cuentaOrigenId, cuentaDestinoId, amount, date, note }) => {
      return guard(async () => {
        if (cuentaOrigenId === cuentaDestinoId)
          return fail("La cuenta origen y destino deben ser distintas.");
        const cuentas = await fetchCuentas();
        if (!cuentas.some((c) => c.id === cuentaOrigenId))
          return fail(`No existe una cuenta origen con id ${cuentaOrigenId}.`);
        if (!cuentas.some((c) => c.id === cuentaDestinoId))
          return fail(`No existe una cuenta destino con id ${cuentaDestinoId}.`);
        const transferencia = await insertTransferencia({
          cuentaOrigenId,
          cuentaDestinoId,
          amount,
          date: date ?? today(),
          note,
        });
        return ok(transferencia);
      });
    }
  );

  server.tool(
    "listar_transferencias",
    "Lista transferencias entre cuentas con filtros opcionales. Con cuentaId " +
      "devuelve los movimientos (entradas y salidas) de esa cuenta.",
    {
      cuentaId: z
        .string()
        .uuid()
        .optional()
        .describe("Filtra por cuenta (como origen o destino)"),
      month: z.number().int().min(1).max(12).optional().describe("Mes 1-12"),
      year: z.number().int().min(2000).max(2100).optional(),
    },
    async ({ cuentaId, month, year }) => {
      return guard(async () => {
        let transferencias = await fetchTransferencias();
        transferencias = transferencias.filter((t) => {
          const [ty, tm] = t.date.split("-").map(Number);
          if (year !== undefined && ty !== year) return false;
          if (month !== undefined && tm !== month) return false;
          if (
            cuentaId !== undefined &&
            t.cuentaOrigenId !== cuentaId &&
            t.cuentaDestinoId !== cuentaId
          )
            return false;
          return true;
        });
        const total = transferencias.reduce((s, t) => s + t.amount, 0);
        return ok({ count: transferencias.length, total, transferencias });
      });
    }
  );

  server.tool(
    "borrar_transferencia",
    "Borra (revierte) una transferencia por su id: el saldo de las cuentas " +
      "origen y destino vuelve a su estado anterior. Las transferencias no son " +
      "finance_records, así que borrar_registro NO las cubre: usa esta tool. " +
      "Irreversible.",
    {
      id: z.string().uuid().describe("ID (uuid) de la transferencia a borrar"),
    },
    async ({ id }) => {
      return guard(async () => {
        await deleteTransferencia(id);
        return ok({ deleted: true, id });
      });
    }
  );
}
