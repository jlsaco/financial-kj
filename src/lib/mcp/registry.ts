import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerRecordTools } from "@/lib/mcp/tools/records";
import { registerRecurringTools } from "@/lib/mcp/tools/recurring";
import { registerDebtTools } from "@/lib/mcp/tools/debts";
import { registerSummaryTools } from "@/lib/mcp/tools/summary";
import { registerCardTools } from "@/lib/mcp/tools/cards";
import { registerCompraTools } from "@/lib/mcp/tools/compras";
import { registerCuentaTools } from "@/lib/mcp/tools/cuentas";
import { registerTransferenciaTools } from "@/lib/mcp/tools/transferencias";
import { registerIssueTools } from "@/lib/mcp/tools/issues";
import { registerReleaseTools } from "@/lib/mcp/tools/releases";

/**
 * Registro central de tools del MCP.
 *
 * Para exponer una nueva funcionalidad: crea un archivo en `tools/` con una
 * función `registerXTools(server)` y añádela a este array. Nada más cambia.
 */
const registrars: Array<(server: McpServer) => void> = [
  registerRecordTools,
  registerRecurringTools,
  registerDebtTools,
  registerSummaryTools,
  registerCardTools,
  registerCompraTools,
  registerCuentaTools,
  registerTransferenciaTools,
  registerIssueTools,
  registerReleaseTools,
];

export function registerAllTools(server: McpServer): void {
  for (const register of registrars) register(server);
}
