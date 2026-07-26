# ADR-0016: Monorepo con npm workspaces para compartir `engine`/`data` entre el CLI y la web

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

Hasta la fase 3, `src/engine/` y `src/data/` vivían en la raíz del repo junto a un único `package.json`/`tsconfig.json` pensados solo para el CLI (ejecutado con `tsx`, `module: NodeNext`, sin JSX). La fase 4 añade un segundo consumidor — una app Next.js (App Router) — que necesita reutilizar exactamente ese mismo código (`fetchDailyContext`, `generateDayProposal`, etc.), tal como ya preveía el diseño de la fase 3 ("para que la futura web pueda reutilizar `engine/` importándolo como módulo"). Next.js tiene su propia configuración de TypeScript/bundler (JSX, `moduleResolution: bundler`, Turbopack) que no convive bien con un único `tsconfig.json`/`package.json` de raíz pensado para un CLI plano.

## Decisión

Se reestructura el repo como un monorepo con **npm workspaces**:

- `packages/core` — el antiguo `src/engine`+`src/data`, sin cambios internos de lógica. Paquete `@comida-diaria/core`, con su propio `package.json`/`tsconfig.json`.
- `apps/cli` — el antiguo `src/cli.ts`, ahora importando `@comida-diaria/core` en vez de rutas relativas.
- `apps/web` — la nueva app Next.js (fase 4), también dependiendo de `@comida-diaria/core`.

`packages/core` se **compila a JS real** (`tsc`, `npm run build -w @comida-diaria/core`, salida en `dist/` con `.d.ts`) en vez de exponer el TypeScript fuente directamente. `apps/web`/`apps/cli` consumen ese `dist/` compilado a través del `main`/`types` del `package.json` del paquete.

## Alternativas consideradas

- **`apps/web` aparte, importando `../src/...` por rutas relativas, sin workspaces formales**: se descartó porque Next.js/Turbopack no importan con naturalidad archivos fuera de su propio directorio de proyecto sin configuración adicional, y porque con más apps futuras (fase de inventario/lista de compra) las rutas relativas se vuelven frágiles.
- **`transpilePackages` + Turbopack leyendo el TypeScript fuente de `packages/core` directamente (sin paso de build)**: fue el primer intento. Falló: los imports internos de `packages/core` usan la convención NodeNext (`import "./foo.js"` apuntando a un archivo `foo.ts`, correcta para `tsc`/`tsx`/Node en tiempo de ejecución tras compilar), pero Turbopack no resuelve esa sustitución de extensión para especificadores que ya traen una extensión explícita — ni con `transpilePackages` ni con `turbopack.resolveExtensions` (que solo afecta a imports *sin* extensión). Compilar `packages/core` a `dist/` real evita el problema de raíz: `apps/web` consume JS ya compilado, exactamente igual que cualquier otra dependencia de `node_modules`, sin necesitar que el bundler entienda la convención NodeNext de otro paquete.

## Consecuencias

- `packages/core` necesita un paso de build (`npm run build -w @comida-diaria/core`) antes de que `apps/web`/`apps/cli` vean cambios — `apps/web` lo automatiza con hooks `predev`/`prebuild` en su `package.json`, así que `npm run dev`/`npm run build` en `apps/web` siempre reconstruyen `core` primero. Si se edita `packages/core` y se quiere probar solo el CLI, hay que acordarse de rebuildear a mano (`npm run build -w @comida-diaria/core`) o usar `apps/web`.
- `packages/core/dist/` no se versiona (gitignored), como cualquier output de build.
- Vercel detecta monorepos npm-workspaces de forma nativa: al desplegar, Root Directory = `apps/web`.
- Cualquier futura "app" nueva (o página dentro de `apps/web`) que necesite `engine`/`data` los importa igual, vía `@comida-diaria/core`.
