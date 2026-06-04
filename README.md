This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Versionado (SemVer automático)

El versionado lo hace [**semantic-release**](https://semantic-release.gitbook.io/)
a partir de los _conventional commits_ (`feat:`, `fix:`, `BREAKING CHANGE`).

**Cómo funciona**

- `.github/workflows/release.yml` corre en cada push a `main`. Calcula la
  versión, crea el **tag** `vX.Y.Z`, publica un **GitHub Release**, actualiza
  `CHANGELOG.md` y commitea de vuelta el bump de `package.json` a `main`
  (config en `.releaserc.json`).
- **Saltos de versión** (personalizados en `releaseRules`):

  | Commit | Salto |
  |--------|-------|
  | `fix: ...` | **patch** (`1.1.1` → `1.1.2`) |
  | `feat: ...` | **patch** (`1.1.1` → `1.1.2`) |
  | `BREAKING CHANGE` / `feat!:` / `fix!:` | **minor** (`1.1.1` → `1.2.0`) |
  | `docs:`, `chore:`, `refactor:`, `perf:`… | sin release |
  | **major** | **nunca automático** — solo manual (ver abajo) |

- **Identidad**: todo (commit, tag, Release) lo hace `github-actions[bot]` con el
  `GITHUB_TOKEN` del runner. Es una automatización; no se atribuye a una persona.
- **No publica a npm** (app privada): usa `@semantic-release/npm` con
  `npmPublish: false`, solo para bumpear `package.json`.
- **Anti-bucle**: el commit de release lleva `[skip ci]`, así GitHub Actions no
  re-dispara el workflow (además, los pushes con `GITHUB_TOKEN` no re-disparan
  Actions). Amplify **sí** despliega ese commit (solo ignora `[skip-cd]`), por lo
  que el deploy queda con la versión correcta.

**Versión visible en la app**

- `next.config.ts` expone `NEXT_PUBLIC_APP_VERSION` desde `package.json` (y
  `amplify.yml` la fija también en el build). Es **SemVer, no el commit SHA**.
- Se muestra como `vX.Y.Z` al fondo del menú hamburguesa; al hacer click abre
  **`/releases`**, que lista los GitHub Releases (tag, fecha, notas).

**Secrets / permisos necesarios**

- **No hace falta ningún PAT.** El workflow usa el `GITHUB_TOKEN` efímero del
  runner, con los scopes del bloque `permissions:` (`contents`, `issues`,
  `pull-requests` = `write`).
- ⚠️ **Branch protection**: como ahora empuja `github-actions[bot]`, si `main`
  tiene reglas de protección hay que **permitir que ese actor pueda pushear**
  (Settings → Branches → _Allow specified actors to bypass_ / añadir la app
  **GitHub Actions**). Si no, el push del commit de release fallará.

**Versión inicial (paso OBLIGATORIO antes del primer release)**

semantic-release usa los **tags de git** como fuente de verdad, **no** el campo
`version` de `package.json`. Hoy el repo no tiene tags, así que **el primer
release saltaría a `v1.0.0`** (ignorando el `0.1.0` de `package.json`).

Decide antes del primer merge a `main`:

- **Mantener `0.x`** (recomendado mientras la app madura): crea el tag base una
  sola vez:
  ```bash
  git tag v0.1.0 && git push origin v0.1.0
  ```
  Luego el siguiente `feat:`/`fix:` → `0.1.1`; un `BREAKING CHANGE` → `0.2.0`.
- **Arrancar en `1.0.0`**: no hagas nada; el primer `feat:`/`fix:` publicará
  `v1.0.0` automáticamente.

**Forzar un release**

- Empujar un commit convencional (`feat:`/`fix:`) a `main`, o relanzar el
  workflow `release` desde la pestaña Actions.

**Cómo hacer un MAJOR (manual)**

Ningún commit sube major automáticamente (los `BREAKING CHANGE` solo suben
minor). Para cortar una major a propósito (p. ej. `1.4.2` → `2.0.0`), hazlo a
mano desde `main` actualizado:

```bash
git checkout main && git pull

# 1. Bump de package.json + package-lock a la nueva major (sin crear tag aún)
npm version 2.0.0 --no-git-tag-version

# 2. (opcional) añade la entrada 2.0.0 a CHANGELOG.md a mano

# 3. Commit con [skip ci] para que el workflow de release NO se dispare
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): 2.0.0 [skip ci]"

# 4. Tag y push (commit + tag)
git tag v2.0.0
git push origin main --follow-tags

# 5. Publica el GitHub Release de esa versión
gh release create v2.0.0 --target main --title "v2.0.0" --notes "Notas de la 2.0.0"
```

A partir de ahí semantic-release toma `v2.0.0` como última versión y sigue
automático: el siguiente `fix:` → `2.0.1`, un `BREAKING CHANGE` → `2.1.0`. El
push del paso 4 dispara el deploy de Amplify, que mostrará `v2.0.0` en la UI.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
