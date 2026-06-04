import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  listIssues,
  getIssue,
  createIssue,
  addIssueComment,
  setIssueState,
} from "@/lib/github";
import { ok, guard } from "@/lib/mcp/shared";

const zIssueKind = z.enum(["bug", "mejora"]);

/** Label que marca un issue para procesamiento/desarrollo automático por un
 *  agente (pipeline de auto-merge). Se añade por defecto a los issues creados
 *  vía MCP; se puede desactivar con `agentDevelop: false`. */
const AGENT_DEVELOP_LABEL = "agent-develop";

/**
 * Tools sobre los issues de GitHub del repositorio de FinanceKJ
 * (repo público `GITHUB_OWNER/GITHUB_REPO`, por defecto jlsaco/financial-kj).
 *
 * Permiten reportar bugs/mejoras y consultar el seguimiento sin salir del MCP.
 * Cada issue devuelto incluye `url` (html_url de GitHub), accesible al ser un
 * repositorio público. Crear, comentar y cambiar el estado requieren que
 * GITHUB_TOKEN esté configurado en el servidor.
 */
export function registerIssueTools(server: McpServer): void {
  server.tool(
    "listar_issues",
    "Lista los issues (bugs/mejoras) del repositorio de FinanceKJ en GitHub, " +
      "del más reciente al más antiguo (máx. 50). Excluye pull requests. Cada " +
      "issue incluye su `url` pública en GitHub. Filtra por estado con `estado`.",
    {
      estado: z
        .enum(["open", "closed", "all"])
        .optional()
        .describe("Filtra por estado: open, closed o all (por defecto all)"),
    },
    async ({ estado }) => {
      return guard(async () => {
        const issues = await listIssues(estado ?? "all");
        return ok({ count: issues.length, issues });
      });
    }
  );

  server.tool(
    "ver_issue",
    "Devuelve un issue concreto del repositorio por su número, incluyendo su " +
      "título, cuerpo, estado, etiquetas y su `url` pública en GitHub.",
    {
      number: z
        .number()
        .int()
        .positive()
        .describe("Número del issue (el que aparece como #N en GitHub)"),
    },
    async ({ number }) => {
      return guard(async () => {
        const issue = await getIssue(number);
        return ok(issue);
      });
    }
  );

  server.tool(
    "crear_issue",
    "Crea un nuevo issue en el repositorio de FinanceKJ. `kind` define la " +
      "etiqueta: 'bug' (label bug) o 'mejora' (label enhancement). Por defecto " +
      "añade también el label 'agent-develop', que marca el issue para " +
      "procesamiento/desarrollo automático por un agente (pipeline de " +
      "auto-merge); usa agentDevelop=false para no añadirlo. Devuelve el issue " +
      "creado con su número y su `url` pública en GitHub. Requiere GITHUB_TOKEN " +
      "configurado en el servidor.",
    {
      title: z.string().min(1).describe("Título del issue"),
      body: z
        .string()
        .optional()
        .describe("Descripción del issue (Markdown), opcional"),
      kind: zIssueKind.describe("'bug' o 'mejora' (define la etiqueta)"),
      agentDevelop: z
        .boolean()
        .optional()
        .describe(
          "Añade el label 'agent-develop' para auto-procesamiento (por defecto true)"
        ),
    },
    async ({ title, body, kind, agentDevelop }) => {
      return guard(async () => {
        const issue = await createIssue({
          title,
          body: body ?? "",
          kind,
          extraLabels:
            agentDevelop === false ? [] : [AGENT_DEVELOP_LABEL],
        });
        return ok(issue);
      });
    }
  );

  server.tool(
    "comentar_issue",
    "Añade un comentario a un issue existente. Devuelve la url del comentario " +
      "creado. Requiere GITHUB_TOKEN configurado en el servidor.",
    {
      number: z
        .number()
        .int()
        .positive()
        .describe("Número del issue a comentar"),
      body: z.string().min(1).describe("Texto del comentario (Markdown)"),
    },
    async ({ number, body }) => {
      return guard(async () => {
        const comment = await addIssueComment(number, body);
        return ok(comment);
      });
    }
  );

  server.tool(
    "actualizar_estado_issue",
    "Abre o cierra un issue. Al cerrarlo se puede indicar el motivo con " +
      "`motivo`: 'completed' (resuelto) o 'not_planned' (descartado). Devuelve " +
      "el issue actualizado. Requiere GITHUB_TOKEN configurado en el servidor.",
    {
      number: z.number().int().positive().describe("Número del issue"),
      estado: z
        .enum(["open", "closed"])
        .describe("Nuevo estado del issue: open o closed"),
      motivo: z
        .enum(["completed", "not_planned"])
        .optional()
        .describe("Solo al cerrar: 'completed' o 'not_planned'"),
    },
    async ({ number, estado, motivo }) => {
      return guard(async () => {
        const issue = await setIssueState(number, estado, motivo);
        return ok(issue);
      });
    }
  );
}
