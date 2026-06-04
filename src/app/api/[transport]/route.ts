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
      "Usuarios: jose, karen, bot-correos. Los recurrentes admiten fechas de " +
      "inicio/fin opcionales (startDate/endDate, YYYY-MM-DD): sin inicio se asume " +
      "el mes actual y sin fin es indefinido. Para editar un recurrente (incluidas " +
      "sus fechas) usa actualizar_recurrente. Al registrar el pago de un mes se " +
      "puede vincular la cuota a un finance_record existente con recordId. Las deudas " +
      "con cuotas son recurrentes con category='deuda' y campos extra (totalAmount = " +
      "total a pagar, principalAmount = capital, interestRate = % interés, " +
      "installmentsCount = nº de cuotas): la cuota mensual es totalAmount ÷ cuotas y la " +
      "fecha de fin se calcula automáticamente. Usa crear_deuda_recurrente para crearlas, " +
      "actualizar_recurrente para editar sus campos (recalcula end_date al cambiar inicio/" +
      "cuotas) y resumen_deuda para el saldo pendiente, progreso, próxima cuota y fin " +
      "estimado. Se pueden borrar definitivamente registros/deudas (borrar_registro) y " +
      "eventos recurrentes (borrar_recurrente); el borrado es irreversible. " +
      "Tarjetas (medio de pago): muchos gastos se pagan con tarjetas de crédito " +
      "dedicadas por rubro y se liquidan a inicio del mes siguiente. Gestiona las " +
      "tarjetas con crear_tarjeta, listar_tarjetas, actualizar_tarjeta (isActive=false " +
      "para archivar) y borrar_tarjeta. Al registrar un gasto puedes indicar la tarjeta " +
      "con tarjetaId en crear_gasto (sin tarjeta = débito/efectivo); el gasto sigue " +
      "contando en su rubro, la tarjeta solo agrupa para la liquidación. estado_tarjetas " +
      "muestra, por periodo (mes/año), cuánto se gastó con cada tarjeta (owed) y si está " +
      "liquidado o pendiente. liquidar_tarjeta_mes marca un periodo como pagado " +
      "(pagado=true, importe por defecto = lo gastado) o pendiente (pagado=false). La " +
      "liquidación NO es un gasto nuevo: solo registra que el periodo quedó saldado, " +
      "evitando doble conteo. " +
      "Compras diferidas: una compra grande (casa, viajes…) puede repartirse en " +
      "cuotas con crear_compra_diferida (name, category, userId, totalAmount, " +
      "installmentsCount, tarjetaId?, interestRate?, startDate?). Genera N gastos " +
      "mensuales (uno por mes), cada uno con su tarjeta y fecha, de modo que cada " +
      "cuota pesa solo en su mes (en el rubro y en la liquidación de la tarjeta). La " +
      "cuota = totalAmount ÷ installmentsCount. Usa listar_compras_diferidas y " +
      "resumen_compra_diferida para ver cuotas pagadas/restantes, saldo pendiente y " +
      "próxima cuota, y borrar_compra_diferida para eliminarla con sus cuotas en cascada. " +
      "Cuentas (caja real): cuentas bancarias/efectivo con saldo. crear_cuenta, " +
      "listar_cuentas (con saldo calculado), saldo_cuenta, actualizar_cuenta y " +
      "borrar_cuenta. El saldo = saldo inicial + ingresos − gastos de débito/efectivo − " +
      "liquidaciones de tarjeta pagadas desde la cuenta. Un ingreso entra a una cuenta " +
      "con cuentaId (crear_ingreso); un gasto de débito/efectivo sale de la cuenta con " +
      "cuentaId (crear_gasto sin tarjeta). Los gastos con tarjeta NO mueven la cuenta " +
      "hasta que la tarjeta se liquida: liquidar_tarjeta_mes resta de la cuenta indicada " +
      "(cuentaId) o, por defecto, de la cuenta de pago de la tarjeta (cuentaPagoId, " +
      "configurable en crear_tarjeta/actualizar_tarjeta).",
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
