import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchComprasDiferidas,
  insertCompraDiferida,
  deleteCompraDiferida,
} from "@/store/compras-store";
import { fetchRecords } from "@/store/records-store";
import {
  getCompraDiferidaSummary,
  getCompraDiferidaAmortization,
} from "@/lib/compra-helpers";
import { fetchAbonos, insertAbono } from "@/store/abonos-store";
import {
  ok,
  fail,
  guard,
  today,
  zCategory,
  zUserId,
  zAbonoEffect,
} from "@/lib/mcp/shared";

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
        const [records, abonos] = await Promise.all([
          fetchRecords(),
          fetchAbonos(),
        ]);
        const items = compras.map((c) =>
          getCompraDiferidaSummary(c, records, abonos)
        );
        const totalPendiente = items.reduce((s, i) => s + i.pendingAmount, 0);
        return ok({ count: items.length, totalPendiente, compras: items });
      });
    }
  );

  server.tool(
    "resumen_compra_diferida",
    "Resumen de una compra diferida por su id: cuota, cuotas pagadas/restantes, " +
      "monto pagado/pendiente, próxima cuota y fecha de fin. Incluye el SALDO DE " +
      "CAPITAL pendiente (outstandingPrincipal, que refleja los abonos), el interés " +
      "total estimado y el total de abonos a capital.",
    {
      id: z.string().uuid().describe("ID (uuid) de la compra diferida"),
    },
    async ({ id }) => {
      return guard(async () => {
        const compra = (await fetchComprasDiferidas()).find((c) => c.id === id);
        if (!compra) return fail(`No existe una compra diferida con id ${id}.`);
        const [records, abonos] = await Promise.all([
          fetchRecords(),
          fetchAbonos(),
        ]);
        const summary = getCompraDiferidaSummary(compra, records, abonos);
        const compraAbonos = abonos.filter((a) => a.compraDiferidaId === id);
        return ok({ ...summary, abonos: compraAbonos });
      });
    }
  );

  server.tool(
    "tabla_amortizacion_compra_diferida",
    "Devuelve la TABLA DE AMORTIZACIÓN real (sistema francés) de una compra " +
      "diferida, con los abonos a capital ya aplicados. Como la compra guarda el " +
      "total y (opcional) la tasa % e.m. pero no el capital, si hay tasa el capital " +
      "se deriva como valor presente de la anualidad; sin tasa se amortiza a " +
      "interés 0. Por cuota entrega nº (index), fecha (dueDate), cuota (payment), " +
      "interés (interest), capital (principal), saldo restante (balance) y abono " +
      "aplicado (abono, si hay), además de principal derivado, effectiveRate y " +
      "totalInterest.",
    {
      id: z.string().uuid().describe("ID (uuid) de la compra diferida"),
    },
    async ({ id }) => {
      return guard(async () => {
        const compra = (await fetchComprasDiferidas()).find((c) => c.id === id);
        if (!compra) return fail(`No existe una compra diferida con id ${id}.`);
        const abonos = (await fetchAbonos()).filter(
          (a) => a.compraDiferidaId === id
        );
        const amortization = getCompraDiferidaAmortization(compra, abonos);
        if (!amortization)
          return fail(
            `La compra diferida ${id} no tiene datos suficientes para amortizar.`
          );
        return ok({ id, amortization });
      });
    }
  );

  server.tool(
    "abonar_capital_compra_diferida",
    "Registra un ABONO EXTRAORDINARIO a capital sobre una compra diferida. El " +
      "abono reduce el saldo de capital de inmediato y recalcula el plan según el " +
      "efecto: 'reducir_plazo' (misma cuota, menos cuotas) o 'reducir_cuota' " +
      "(mismas cuotas restantes, cuota menor). Devuelve el abono creado, el resumen " +
      "actualizado y la nueva tabla de amortización.",
    {
      compraId: z.string().uuid().describe("ID (uuid) de la compra diferida"),
      amount: z.number().positive().describe("Monto del abono a capital"),
      effect: zAbonoEffect.describe(
        "Efecto en el plan: 'reducir_plazo' o 'reducir_cuota'"
      ),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha del abono YYYY-MM-DD (por defecto hoy)"),
      note: z.string().optional().describe("Nota opcional del abono"),
    },
    async ({ compraId, amount, effect, date, note }) => {
      return guard(async () => {
        const compra = (await fetchComprasDiferidas()).find(
          (c) => c.id === compraId
        );
        if (!compra)
          return fail(`No existe una compra diferida con id ${compraId}.`);
        const abono = await insertAbono({
          compraDiferidaId: compraId,
          amount,
          date: date ?? today(),
          effect,
          note,
        });
        const [records, abonos] = await Promise.all([
          fetchRecords(),
          fetchAbonos(),
        ]);
        const compraAbonos = abonos.filter((a) => a.compraDiferidaId === compraId);
        const summary = getCompraDiferidaSummary(compra, records, abonos);
        const amortization = getCompraDiferidaAmortization(compra, compraAbonos);
        return ok({ abono, summary, amortization });
      });
    }
  );

  server.tool(
    "listar_abonos_compra_diferida",
    "Lista el historial de abonos a capital de una compra diferida " +
      "(fecha, monto, efecto y nota), ordenados por fecha.",
    {
      id: z.string().uuid().describe("ID (uuid) de la compra diferida"),
    },
    async ({ id }) => {
      return guard(async () => {
        const abonos = (await fetchAbonos()).filter(
          (a) => a.compraDiferidaId === id
        );
        const totalAbonos = abonos.reduce((s, a) => s + a.amount, 0);
        return ok({ count: abonos.length, totalAbonos, abonos });
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
