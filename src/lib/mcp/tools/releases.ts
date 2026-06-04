import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listReleases } from "@/lib/github";
import { APP_VERSION, APP_VERSION_LABEL } from "@/lib/version";
import { ok, guard } from "@/lib/mcp/shared";

/**
 * Tools sobre el versionado de FinanceKJ: la versión que corre en el deploy y
 * el historial de releases publicados en GitHub (SemVer generado por
 * semantic-release). La API de releases es pública para el repo público, así
 * que `listar_releases` no requiere GITHUB_TOKEN (si existe, sube el
 * rate-limit). Misma fuente de datos que la página `/releases` de la UI.
 */
export function registerReleaseTools(server: McpServer): void {
  server.tool(
    "version_actual",
    "Devuelve la versión de la app (SemVer, p. ej. '1.2.0' / 'v1.2.0') que está " +
      "corriendo, leída de NEXT_PUBLIC_APP_VERSION (de package.json, bumpeada " +
      "por semantic-release). No es el commit SHA.",
    {},
    async () => {
      return guard(async () => {
        return ok({ version: APP_VERSION, label: APP_VERSION_LABEL });
      });
    }
  );

  server.tool(
    "listar_releases",
    "Lista los releases publicados del repositorio de FinanceKJ en GitHub, del " +
      "más reciente al más antiguo (máx. 50, excluye borradores). Cada release " +
      "incluye `tagName` (vX.Y.Z), `name`, `body` (notas/changelog), " +
      "`publishedAt`, `isPrerelease` y su `url` pública. Es el historial de " +
      "versiones que muestra la página /releases de la app.",
    {},
    async () => {
      return guard(async () => {
        const releases = await listReleases();
        return ok({ count: releases.length, releases });
      });
    }
  );
}
