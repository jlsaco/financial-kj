# CLAUDE.md

Guía para Claude Code (y cualquier agente) al trabajar en **FinanceKJ**.

## Qué es

App de finanzas personales (Next.js 16 + React 19 + Supabase + Tailwind/shadcn).
Gestiona gastos e ingresos, gastos recurrentes, deudas y presupuestos para los
usuarios `jose`, `karen` y `bot-correos`.

Además de la UI web, la app **expone su funcionalidad como un servidor MCP**
(Model Context Protocol) para que asistentes de IA puedan operar las finanzas.

## ⚠️ Regla principal: toda funcionalidad nueva debe exponerse vía MCP

**Cada vez que se agregue o modifique una funcionalidad de la app, esa
funcionalidad DEBE actualizarse o exponerse también a través del MCP en el mismo
cambio.** El MCP no es un extra opcional: es una superficie de primera clase y
debe mantenerse a la par de la UI.

En la práctica, al tocar una feature pregúntate y resuelve:

1. ¿Esta capacidad debería poder usarla un agente vía MCP? Casi siempre **sí**.
2. ¿Existe ya una tool MCP que la cubra?
   - **No existe** → crea/actualiza la tool correspondiente en `src/lib/mcp/tools/`.
   - **Existe pero cambió el comportamiento, los campos o las validaciones** →
     actualiza la tool, su esquema Zod y su `description`.
3. ¿Cambiaron enums, categorías, usuarios o tipos? → sincroniza
   `src/lib/mcp/shared.ts` (y `instructions` en el route si aplica).

Una feature no se considera **terminada** hasta que su equivalente MCP está
creado/actualizado y validado. No mergees lógica nueva de negocio dejando el MCP
desactualizado.

## Arquitectura del MCP

- **Endpoint:** `src/app/api/[transport]/route.ts` → ruta `/api/mcp`
  (transporte Streamable HTTP, stateless, runtime Node/Lambda).
- **Auth:** header `Authorization: Bearer <MCP_AUTH_TOKEN>` (secreto compartido,
  mismo valor en Amplify y en la config del cliente MCP).
- **Registro central:** `src/lib/mcp/registry.ts` — array `registrars` con un
  `registerXTools(server)` por dominio. `registerAllTools` los aplica todos.
- **Tools por dominio:** `src/lib/mcp/tools/`
  - `records.ts` — gastos e ingresos (`finance_records`)
  - `recurring.ts` — gastos recurrentes (`recurring_events` / `month_payment_configs`)
  - `debts.ts` — deudas (registros con `category='deuda'`)
  - `summary.ts` — resúmenes y estado de presupuestos
  - `issues.ts` — issues de GitHub (bugs/mejoras) del repo público vía
    `src/lib/github.ts`
  - `releases.ts` — versión actual de la app y historial de releases de GitHub
    (`version_actual`, `listar_releases`) vía `src/lib/github.ts`
- **Helpers compartidos:** `src/lib/mcp/shared.ts` — enums Zod (`zCategory`,
  `zUserId`, `zRecordType`), `today()`, y wrappers `ok` / `fail` / `guard`.

Las tools reutilizan los stores en `src/store/*` (la misma lógica que usa la UI),
con `getServerClient()` de `src/lib/supabase-server.ts`. Mantén la UI y el MCP
apoyados en los mismos stores para que no diverjan.

## Cómo agregar una tool MCP (patrón)

1. En el archivo de dominio correspondiente bajo `src/lib/mcp/tools/`, dentro de
   `registerXTools`, llama a `server.tool(nombre, descripción, schemaZod, handler)`.
2. Define el esquema con Zod, reutilizando `zCategory` / `zUserId` / `zRecordType`
   de `shared.ts`. Escribe `.describe(...)` claro en cada campo.
3. Envuelve el handler en `guard(async () => { ... return ok(data); })`.
4. Reutiliza el store de `src/store/*` pasándole `getServerClient()`; evita
   duplicar lógica de negocio.
5. Si es un dominio nuevo, crea `tools/<dominio>.ts` con su `registerXTools` y
   añádelo al array `registrars` en `registry.ts`.
6. Mantén la `description` en español y consistente con las demás tools.

### Convenciones de dominio (mantener sincronizadas)

- **Categorías válidas:** `movilidad`, `alimentacion-salud`,
  `hogar-entretenimiento`, `deuda`, `servicios`, `entretenimiento`.
- **Usuarios:** `jose`, `karen`, `bot-correos`.
- **Tipos de registro:** `gasto`, `ingreso`.
- Las deudas son `finance_records` con `category='deuda'`.

## Stack y comandos

- Next.js 16, React 19, TypeScript, Tailwind v4, shadcn, Supabase JS.
- `@modelcontextprotocol/sdk` + `mcp-handler` para el servidor MCP.
- Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.

## Antes de terminar un cambio

- [ ] ¿La nueva funcionalidad quedó expuesta/actualizada en el MCP?
- [ ] ¿Enums/categorías/usuarios/tipos sincronizados en `shared.ts`?
- [ ] ¿`description` de las tools afectadas al día?
- [ ] `npm run lint` y `npm run build` pasan.
