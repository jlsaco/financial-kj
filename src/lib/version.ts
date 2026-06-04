/**
 * Versión de la app, derivada de `package.json` (bumpeada por semantic-release
 * en cada release y commiteada de vuelta a `main`).
 *
 * `NEXT_PUBLIC_APP_VERSION` se inyecta en build desde `next.config.ts` (y de
 * forma redundante en `amplify.yml`), por lo que es un valor SemVer — NO el
 * commit SHA. En desarrollo, si no estuviera definido, cae a "0.0.0".
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** Versión formateada para mostrar en la UI, p. ej. "v1.2.0". */
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
