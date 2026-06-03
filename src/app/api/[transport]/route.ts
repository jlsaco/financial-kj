import { createMcpHandler } from "mcp-handler";
import { registerAllTools } from "@/lib/mcp/registry";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * MCP server de FinanceKJ (transporte Streamable HTTP).
 *
 * URL del endpoint:  /api/mcp
 * Auth: header `Authorization: Bearer <MCP_AUTH_TOKEN>` (secreto compartido,
 *       mismo valor en Amplify y en la config del MCP del cliente).
 *
 * El handler corre en modo stateless (sin Redis/SSE persistente), apto para
 * el runtime Lambda de Amplify.
 */
const mcpHandler = createMcpHandler(
  (server) => {
    registerAllTools(server);
  },
  {
    instructions:
      "MCP de FinanceKJ. Gestiona finanzas personales: gastos e ingresos " +
      "(finance_records), gastos recurrentes (recurring_events / month_payment_configs), " +
      "deudas (registros con category='deuda') y presupuestos. Categorías válidas: " +
      "movilidad, alimentacion-salud, hogar-entretenimiento, deuda, servicios. " +
      "Usuarios: jose, karen, bot-correos. Los recurrentes (recurring_events) pueden " +
      "ser de tipo 'gasto' o 'ingreso' (campo type): crear_gasto_recurrente para " +
      "gastos y crear_ingreso_recurrente para ingresos (p.ej. salario); un ingreso " +
      "recurrente no puede tener category='deuda'. Los recurrentes admiten fechas de " +
      "inicio/fin opcionales (startDate/endDate, YYYY-MM-DD): sin inicio se asume " +
      "el mes actual y sin fin es indefinido. Para editar un recurrente (incluidas " +
      "sus fechas o su type) usa actualizar_recurrente. Al registrar el pago de un mes se " +
      "puede vincular la cuota a un finance_record existente con recordId. Las deudas " +
      "con cuotas son recurrentes con category='deuda' y campos extra (totalAmount = " +
      "total a pagar, principalAmount = capital, interestRate = % interés, " +
      "installmentsCount = nº de cuotas): la cuota mensual es totalAmount ÷ cuotas y la " +
      "fecha de fin se calcula automáticamente. Usa crear_deuda_recurrente para crearlas, " +
      "actualizar_recurrente para editar sus campos (recalcula end_date al cambiar inicio/" +
      "cuotas) y resumen_deuda para el saldo pendiente, progreso, próxima cuota y fin " +
      "estimado. Se pueden borrar definitivamente registros/deudas (borrar_registro) y " +
      "eventos recurrentes (borrar_recurrente); el borrado es irreversible.",
  },
  {
    basePath: "/api",
    maxDuration: 60,
  }
);

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

function withAuth(handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const expected = process.env.MCP_AUTH_TOKEN;
    if (!expected) return unauthorized();
    const header = req.headers.get("authorization");
    if (header !== `Bearer ${expected}`) return unauthorized();
    return handler(req);
  };
}

const handler = withAuth(mcpHandler);

export { handler as GET, handler as POST, handler as DELETE };
