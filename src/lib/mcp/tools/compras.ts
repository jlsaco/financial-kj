import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchComprasDiferidas,
  insertCompraDiferida,
  deleteCompraDiferida,
} from "@/store/compras-store";
import { fetchRecords } from "@/store/records-store";
import { getCompraDiferidaSummary } from "@/lib/compra-helpers";
import { ok, fail, guard, today, zCategory, zUserId } from "@/lib/mcp/shared";

/**
 * Tools sobre `compras_diferidas`: compras grandes repartidas en cuotas.
 *
 * Una compra diferida genera N `finance_records` hijos (uno por mes), cada uno
 * con su tarjeta y fecha. Así cada cuota pesa solo en su mes, tanto en el rubro
 * como en la liquidación mensual de la tarjeta (estado_tarjetas). La cuota es
 * totalAmount ÷ installmentsCount (la última absorbe el redondeo).
 */
export function registerCompraTools(server: McpServer): void {
  server.tool(
    "crear_compra_diferida",
    "Crea una compra grande diferida en cuotas (casa, viajes…). Genera N gastos " +
      "mensuales (uno por mes desde startDate) con la categoría, usuario y tarjeta " +
      "indicados. totalAmount es el total a pagar (capital + intereses); la cuota " +
      "es totalAmount ÷ installmentsCount.",
    {
      name: z.string().describe("Descripción, p.ej. 'Nevera' o 'Viaje Cartagena'"),
      category: zCategory,
      userId: zUserId.describe("Quién hizo la compra"),
      totalAmount: z.number().positive().describe("Total a pagar (capital + intereses)"),
      installmentsCount: z.number().int().min(1).describe("Número de cuotas (meses)"),
      tarjetaId: z
        .string()
        .uuid()
        .optional()
        .describe("Tarjeta con la que se difiere (cada cuota la hereda)"),
      interestRate: z
        .number()
        .optional()
        .describe("% de interés (opcional, informativo)"),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha de la primera cuota YYYY-MM-DD (por defecto hoy)"),
    },
    async ({
      name,
      category,
      userId,
      totalAmount,
      installmentsCount,
      tarjetaId,
      interestRate,
      startDate,
    }) => {
      return guard(async () => {
        const compra = await insertCompraDiferida({
          name,
          category,
          userId,
          tarjetaId,
          totalAmount,
          installmentsCount,
          interestRate,
          startDate: startDate ?? today(),
        });
        return ok({
          ...compra,
          installmentAmount: totalAmount / installmentsCount,
        });
      });
    }
  );

  server.tool(
    "listar_compras_diferidas",
    "Lista las compras diferidas con su resumen (cuotas pagadas/restantes, " +
      "saldo pendiente y próxima cuota). Filtros opcionales por tarjeta o usuario.",
    {
      tarjetaId: z.string().uuid().optional().describe("Filtra por tarjeta"),
      userId: zUserId.optional().describe("Filtra por usuario"),
    },
    async ({ tarjetaId, userId }) => {
      return guard(async () => {
        let compras = await fetchComprasDiferidas();
        if (tarjetaId) compras = compras.filter((c) => c.tarjetaId === tarjetaId);
        if (userId) compras = compras.filter((c) => c.userId === userId);
        const records = await fetchRecords();
        const items = compras.map((c) => getCompraDiferidaSummary(c, records));
        const totalPendiente = items.reduce((s, i) => s + i.pendingAmount, 0);
        return ok({ count: items.length, totalPendiente, compras: items });
      });
    }
  );

  server.tool(
    "resumen_compra_diferida",
    "Resumen de una compra diferida por su id: cuota, cuotas pagadas/restantes, " +
      "monto pagado/pendiente, próxima cuota y fecha de fin.",
    {
      id: z.string().uuid().describe("ID (uuid) de la compra diferida"),
    },
    async ({ id }) => {
      return guard(async () => {
        const compra = (await fetchComprasDiferidas()).find((c) => c.id === id);
        if (!compra) return fail(`No existe una compra diferida con id ${id}.`);
        const records = await fetchRecords();
        return ok(getCompraDiferidaSummary(compra, records));
      });
    }
  );

  server.tool(
    "borrar_compra_diferida",
    "Borra de forma definitiva una compra diferida y, en cascada, todas sus " +
      "cuotas (los gastos hijos). La acción es irreversible.",
    {
      id: z.string().uuid().describe("ID (uuid) de la compra diferida a borrar"),
    },
    async ({ id }) => {
      return guard(async () => {
        await deleteCompraDiferida(id);
        return ok({ deleted: true, id });
      });
    }
  );
}
