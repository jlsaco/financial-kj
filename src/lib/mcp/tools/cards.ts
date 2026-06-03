import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  fetchTarjetas,
  insertTarjeta,
  updateTarjeta,
  deleteTarjeta,
  fetchLiquidaciones,
  upsertLiquidacion,
  deleteLiquidacion,
} from "@/store/cards-store";
import { fetchRecords } from "@/store/records-store";
import { getTarjetasMonthStatus } from "@/lib/card-helpers";
import { ok, fail, guard, today, zCategory, zUserId } from "@/lib/mcp/shared";

/** Mes/año actual a partir de today() (YYYY-MM-DD). */
function currentMonthYear(): { month: number; year: number } {
  const [y, m] = today().split("-").map(Number);
  return { month: m, year: y };
}

/**
 * Tools sobre `tarjetas` y `liquidaciones`.
 *
 * Concepto: una tarjeta es un medio de pago. Los gastos se vinculan a una
 * tarjeta con `tarjetaId` (ver crear_gasto). A fin de mes se "liquida" lo
 * gastado con cada tarjeta: la liquidación NO es un gasto nuevo (la compra ya
 * se registró), solo marca que el periodo quedó pagado, evitando doble conteo.
 */
export function registerCardTools(server: McpServer): void {
  server.tool(
    "crear_tarjeta",
    "Crea una tarjeta (medio de pago) en la tabla tarjetas.",
    {
      name: z.string().describe("Nombre de la tarjeta, p.ej. 'Visa Alimentación'"),
      owner: zUserId.describe("Dueño de la tarjeta"),
      closingDay: z
        .number()
        .int()
        .min(1)
        .max(31)
        .optional()
        .describe("Día de corte/pago del mes (1-31), opcional"),
      categories: z
        .array(zCategory)
        .optional()
        .describe("Rubros asociados (informativo), p.ej. ['alimentacion-salud']"),
    },
    async ({ name, owner, closingDay, categories }) => {
      return guard(async () => {
        const tarjeta = await insertTarjeta({
          name,
          owner,
          closingDay,
          categories,
        });
        return ok(tarjeta);
      });
    }
  );

  server.tool(
    "listar_tarjetas",
    "Lista las tarjetas existentes. Por defecto solo las activas.",
    {
      incluirInactivas: z
        .boolean()
        .optional()
        .describe("Si es true, incluye tarjetas archivadas (is_active=false)"),
      owner: zUserId.optional().describe("Filtra por dueño"),
    },
    async ({ incluirInactivas, owner }) => {
      return guard(async () => {
        let tarjetas = await fetchTarjetas();
        if (!incluirInactivas) tarjetas = tarjetas.filter((t) => t.isActive);
        if (owner) tarjetas = tarjetas.filter((t) => t.owner === owner);
        return ok({ count: tarjetas.length, tarjetas });
      });
    }
  );

  server.tool(
    "actualizar_tarjeta",
    "Actualiza campos de una tarjeta existente. Solo se modifican los campos " +
      "enviados. Usa isActive=false para archivarla sin borrarla.",
    {
      id: z.string().uuid().describe("ID (uuid) de la tarjeta"),
      name: z.string().optional(),
      owner: zUserId.optional(),
      closingDay: z.number().int().min(1).max(31).nullable().optional(),
      categories: z.array(zCategory).nullable().optional(),
      isActive: z.boolean().optional(),
    },
    async ({ id, name, owner, closingDay, categories, isActive }) => {
      return guard(async () => {
        const existing = (await fetchTarjetas()).find((t) => t.id === id);
        if (!existing) return fail(`No existe una tarjeta con id ${id}.`);
        const tarjeta = await updateTarjeta(id, {
          ...(name !== undefined && { name }),
          ...(owner !== undefined && { owner }),
          ...(closingDay !== undefined && {
            closingDay: closingDay ?? undefined,
          }),
          ...(categories !== undefined && {
            categories: categories ?? undefined,
          }),
          ...(isActive !== undefined && { isActive }),
        });
        return ok(tarjeta);
      });
    }
  );

  server.tool(
    "borrar_tarjeta",
    "Borra de forma definitiva una tarjeta. Los gastos que la usaban quedan " +
      "sin tarjeta (tarjeta_id pasa a NULL, se conservan) y sus liquidaciones " +
      "se borran en cascada. La acción es irreversible; para ocultarla sin " +
      "perder el histórico usa actualizar_tarjeta con isActive=false.",
    {
      id: z.string().uuid().describe("ID (uuid) de la tarjeta a borrar"),
    },
    async ({ id }) => {
      return guard(async () => {
        await deleteTarjeta(id);
        return ok({ deleted: true, id });
      });
    }
  );

  server.tool(
    "estado_tarjetas",
    "Liquidación mensual: para un periodo (mes/año, por defecto el actual) " +
      "devuelve, por cada tarjeta, cuánto se gastó con ella (owed), cuántos " +
      "gastos fueron, y si el periodo ya está liquidado (isPaid) o pendiente.",
    {
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe("Mes 1-12 (por defecto el mes actual)"),
      year: z
        .number()
        .int()
        .min(2020)
        .max(2100)
        .optional()
        .describe("Año (por defecto el actual)"),
      tarjetaId: z
        .string()
        .uuid()
        .optional()
        .describe("Si se indica, limita el resultado a esa tarjeta"),
    },
    async ({ month, year, tarjetaId }) => {
      return guard(async () => {
        const now = currentMonthYear();
        const m = month ?? now.month;
        const y = year ?? now.year;
        const [tarjetas, records, liquidaciones] = await Promise.all([
          fetchTarjetas(),
          fetchRecords(),
          fetchLiquidaciones(),
        ]);
        const activeTarjetas = tarjetas.filter(
          (t) => t.isActive && (!tarjetaId || t.id === tarjetaId)
        );
        const status = getTarjetasMonthStatus(
          activeTarjetas,
          records,
          liquidaciones,
          m,
          y
        );
        const totalOwed = status.reduce((s, t) => s + t.owed, 0);
        const totalPendiente = status
          .filter((t) => !t.isPaid)
          .reduce((s, t) => s + t.owed, 0);
        return ok({ month: m, year: y, totalOwed, totalPendiente, tarjetas: status });
      });
    }
  );

  server.tool(
    "liquidar_tarjeta_mes",
    "Marca como pagada (liquida) o como pendiente el estado de cuenta de una " +
      "tarjeta para un periodo (mes/año). NO crea un gasto: solo registra que " +
      "ese periodo quedó saldado, evitando doble conteo. Con pagado=true (por " +
      "defecto) usa amount o, si se omite, la suma gastada con la tarjeta ese " +
      "mes. Con pagado=false elimina la liquidación (vuelve a pendiente).",
    {
      tarjetaId: z.string().uuid().describe("ID (uuid) de la tarjeta"),
      month: z.number().int().min(1).max(12).describe("Mes del periodo (1-12)"),
      year: z.number().int().min(2020).max(2100).describe("Año del periodo"),
      pagado: z
        .boolean()
        .optional()
        .describe("true=liquidar (por defecto), false=marcar pendiente"),
      amount: z
        .number()
        .nonnegative()
        .optional()
        .describe("Monto liquidado; por defecto = suma gastada con la tarjeta ese mes"),
      paidDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe("Fecha de pago YYYY-MM-DD (por defecto hoy)"),
      note: z.string().optional().describe("Nota opcional"),
    },
    async ({ tarjetaId, month, year, pagado, amount, paidDate, note }) => {
      return guard(async () => {
        const tarjeta = (await fetchTarjetas()).find((t) => t.id === tarjetaId);
        if (!tarjeta) return fail(`No existe una tarjeta con id ${tarjetaId}.`);

        const isPaid = pagado ?? true;
        if (!isPaid) {
          await deleteLiquidacion(tarjetaId, month, year);
          return ok({ tarjetaId, month, year, isPaid: false });
        }

        let resolvedAmount = amount;
        if (resolvedAmount === undefined) {
          const records = await fetchRecords();
          resolvedAmount = records
            .filter((r) => {
              if (r.type !== "gasto" || r.tarjetaId !== tarjetaId) return false;
              const [ry, rm] = r.date.split("-").map(Number);
              return ry === year && rm === month;
            })
            .reduce((s, r) => s + r.amount, 0);
        }

        const liquidacion = await upsertLiquidacion({
          tarjetaId,
          month,
          year,
          amount: resolvedAmount,
          isPaid: true,
          paidDate: paidDate ?? today(),
          note,
        });
        return ok(liquidacion);
      });
    }
  );
}
