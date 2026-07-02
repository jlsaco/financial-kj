import { z } from "zod";

/** Zod enums mirroring the Postgres enums in `src/types/database.ts`.
 *  Keep these in sync if the DB enums change. */
export const zCategory = z.enum([
  "movilidad",
  "alimentacion-salud",
  "hogar-entretenimiento",
  "deuda",
  "servicios",
  "entretenimiento",
  "gastos-financieros",
]);

export const zUserId = z.enum(["jose", "karen", "bot-correos"]);

export const zRecordType = z.enum(["gasto", "ingreso"]);

/** Tipo lógico de cuenta: bank (bancaria) o cash (efectivo). */
export const zCuentaType = z.enum(["bank", "cash"]);

/** Today as YYYY-MM-DD in local time (used as default for `date` params). */
export function today(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

/** Wrap a JSON-serializable payload as a successful MCP tool result. */
export function ok(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/** Wrap an error as an MCP tool result (so the model sees the message). */
export function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}

/** Run a tool handler, converting thrown errors into a `fail` result. */
export async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
}
