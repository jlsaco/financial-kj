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

/** Label que marca un issue para que un agente lo trabaje automáticamente,
 *  sin refinamiento/revisión previa. Opt-in: solo si quien crea el issue lo
 *  pide con `agentDevelop: true`. */
const AGENT_DEVELOP_LABEL = "agent-develop";

/** Label que marca un issue para que el PR resultante se mergee de forma
 *  automática, sin revisión. Opt-in con `autoMerge: true`. Independiente de
 *  agent-develop (puede trabajarse con agente pero requerir revisión al fin). */
const AGENT_AUTO_MERGE_LABEL = "agent-auto-merge";

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
      "etiqueta: 'bug' (label bug) o 'mejora' (label enhancement). Quien crea " +
      "el issue decide explícitamente el grado de automatización con dos flags " +
      "independientes (ambos opt-in, por defecto false): `agentDevelop` añade " +
      "el label 'agent-develop' para que un agente trabaje el ticket de forma " +
      "automática (sin refinamiento/revisión previa) — déjalo en false si la " +
      "feature debe revisarse o refinarse antes; `autoMerge` añade el label " +
      "'agent-auto-merge' para que el PR resultante se mergee solo, sin " +
      "revisión. Devuelve el issue creado con su número y su `url` pública en " +
      "GitHub. Requiere GITHUB_TOKEN configurado en el servidor.",
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
          "true añade 'agent-develop' para que un agente trabaje el ticket " +
            "automáticamente, sin revisión previa (por defecto false)"
        ),
      autoMerge: z
        .boolean()
        .optional()
        .describe(
          "true añade 'agent-auto-merge' para mergear el PR resultante sin " +
            "revisión (por defecto false)"
        ),
    },
    async ({ title, body, kind, agentDevelop, autoMerge }) => {
      return guard(async () => {
        const extraLabels: string[] = [];
        if (agentDevelop) extraLabels.push(AGENT_DEVELOP_LABEL);
        if (autoMerge) extraLabels.push(AGENT_AUTO_MERGE_LABEL);
        const issue = await createIssue({
          title,
          body: body ?? "",
          kind,
          extraLabels,
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
