# Estado del proyecto

> Documento vivo: se actualiza cada sesión conforme avanza el trabajo. Para el diseño estable, ver [`diseno-sistema.md`](diseno-sistema.md); para el porqué de cada decisión, [`adrs/`](adrs/README.md).

**Última actualización**: 2026-07-26

## Fase actual

Fase 4 (web mobile-first) completada en su v1: login + ver la propuesta del día, funcionando de punta a punta contra el proyecto real. Sin edición de inventario ni lista de la compra todavía (fuera de alcance de este v1, ver roadmap).

## Estructura del repo (monorepo, desde la fase 4)

Reestructurado como monorepo npm workspaces (ver [ADR-0016](adrs/0016-monorepo-npm-workspaces-para-compartir-engine-y-data.md)):

- `packages/core` (`@comida-diaria/core`) — el motor: `src/engine/` (algoritmo puro, sin Supabase) + `src/data/` (acceso a Supabase + tipos autogenerados en `database.types.ts`, regenerables con `npm run gen:types -w @comida-diaria/core`). Se compila a `dist/` (`npm run build -w @comida-diaria/core`) — **hay que reconstruirlo tras cualquier cambio** si se va a probar solo el CLI (la web lo hace sola vía hooks `predev`/`prebuild`).
- `apps/cli` (`@comida-diaria/cli`) — el CLI de terminal (`npm run generate`), sin cambios de comportamiento tras el movimiento.
- `apps/web` (`@comida-diaria/web`) — la app Next.js de la fase 4 (ver abajo).

## Motor de generación (fase 3)

- Diseño previo en [`plans/2026-07-26-fase3-motor-generacion-design.md`](plans/2026-07-26-fase3-motor-generacion-design.md).
- `npm test` (vitest): 15 tests en verde sobre `packages/core/src/engine/` con fixtures en memoria — resolución de huecos, priorización (inventario/requisito/diversidad), semilla por fecha, dish descartada por requisito mandatory, meal sin candidata.
- `npm run generate` ejecutado contra `meal-pilot`: produce la propuesta completa de los 4 meals de hoy + resumen de los 5 `dietary_requirement`, sin errores.
- **Limitaciones conocidas, encontradas al ejecutarlo de verdad** (no son bugs, son simplificaciones deliberadas de esta v1, candidatas a mejorar en una iteración futura):
  - No se prioriza por caducidad (el esquema no guarda fecha de apertura de cada ingrediente — ver diseño de fase 3).
  - La cantidad de cada componente flexible es siempre la fija del `dish_ingredient` (o su mínimo si hay rango), nunca se estira hacia `quantity_max` aunque ayudaría a cumplir un requisito — por eso, por ejemplo, el aguacate de la ensalada (15g) no llega ni de lejos al mínimo diario (100g): la ensalada no está pensada como única fuente de ese requisito. Si se quiere que un requisito se cumpla de verdad con el catálogo actual, hay que revisar las cantidades/dishes semilla, no es una limitación del motor en sí.
  - El motor no escribe en `requirement_log` ni `meal_log` (decisión explícita del diseño); por tanto el resumen de requisitos que imprime el CLI/la web es solo "lo que aportaría la propuesta de hoy", no un acumulado semanal real todavía.

## Web (fase 4)

- Diseño previo: plan de la fase 4 (brainstorming + Plan agent), resumido en [ADR-0016](adrs/0016-monorepo-npm-workspaces-para-compartir-engine-y-data.md).
- `apps/web`: Next.js 16 (App Router, Turbopack), `@supabase/ssr` para auth server-side. Una sola página protegida (`app/page.tsx`) que llama a `fetchDailyContext` + `generateDayProposal` de `@comida-diaria/core` y renderiza `DayProposalView` (HTML mobile-first, sin librería de componentes).
- **Auth**: `proxy.ts` (antes `middleware.ts` — Next 16 renombró la convención, ver [nota de migración](https://nextjs.org/docs/messages/middleware-to-proxy)) refresca la sesión y redirige a `/login` si no hay usuario, protegiendo automáticamente cualquier página futura. Login/logout como Server Actions (`app/login/actions.ts`) con `@supabase/ssr`. Usa **solo** `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (`apps/web/.env.local`, gitignored) — nunca la service_role key.
- **Verificado de punta a punta** (`next build` + `next dev` local, sin desplegar): sin sesión → redirect a `/login`; login con `ctorresmoral@gmail.com` → redirect a `/` con la propuesta renderizada; **la página autenticada devuelve exactamente los mismos meals/dishes/ingredientes/cantidades/estado de requisitos que `npm run generate` para la misma fecha** — confirma que RLS bajo sesión real (anon key) da el mismo resultado que la service_role key del CLI, sin haber tenido que tocar `fetchDailyContext`. Logout también verificado (limpia la cookie, vuelve a redirigir a `/login`).
- **Problema real encontrado y resuelto durante la implementación**: Turbopack no resuelve los imports internos de `packages/core` en convención NodeNext (`import "./foo.js"` apuntando a `foo.ts`) ni con `transpilePackages` ni con `turbopack.resolveExtensions` — esa opción solo afecta a imports *sin* extensión. Solución adoptada: `packages/core` se compila a `dist/` real (`tsc`, con `declaration: true`) y `apps/web`/`apps/cli` consumen ese JS ya compilado como cualquier dependencia normal de `node_modules`, sin necesitar que el bundler entienda la convención del paquete de origen. Detalle completo en [ADR-0016](adrs/0016-monorepo-npm-workspaces-para-compartir-engine-y-data.md).
- **`npm audit`**: 3 vulnerabilidades "high" reportadas, todas transitivas dentro del propio `next@16.2.12` (postcss/sharp, CVEs de 2026 aún no parcheados en ninguna versión reciente de Next — el fix sugerido por `audit` es degradar a `next@9.3.3`, inviable). No afectan a este v1 (no se usa `next/image` ni se procesa CSS/sourcemaps de origen no confiable). Revisar `npm audit` de nuevo antes de cualquier despliegue público.
- **Fuera de alcance de este v1** (a propósito): edición de inventario, lista de la compra dinámica, escritura en `requirement_log`/`meal_log`. Despliegue a Vercel no hecho todavía (diseño no lo impide — ver notas de despliegue en el plan de la fase 4).

## Proyecto Supabase

- **Nombre**: `meal-pilot`, org `carlostxrres's Org`, región `eu-central-1` (Frankfurt).
- **Project ref**: `mpcembushoagmskcqajd` (ver `.env`, no versionado — plantilla en `.env.example`).
- **Auth**: email/password activo por defecto (`external_email_enabled = true`, `disable_signup = false`, confirmación por email requerida). No ha hecho falta tocar nada — es el estado por defecto de todo proyecto Supabase nuevo.
- **Usuario semilla**: creado vía Admin API (`ctorresmoral@gmail.com`, email pre-confirmado). Su id es el `owner_id` de todas las filas semilla. Contraseña generada y guardada en `.env` (`SEED_OWNER_PASSWORD`) — pensada para entrar a Supabase Studio o a la futura web (fase 4), cámbiala si lo prefieres.
- **CLI local**: repo linkado (`supabase link`) contra este proyecto; `supabase/config.toml` scaffoldeado con `supabase init` (aún no se ha hecho `supabase config push` — el `site_url`/`additional_redirect_urls` de ese archivo son placeholders de `localhost` para desarrollo local, hay que revisarlos antes de ir a producción en la fase 4).
- **Esquema**: aplicado vía `supabase/migrations/20260726120546_initial_schema.sql` — las 12 tablas de la sección 4.2 de `diseno-sistema.md`, con RLS activado y policy `owner_id = auth.uid()` (directa en las tablas con `owner_id`, vía `EXISTS` al padre en las tablas puente/hijas). Verificado en remoto: 12 tablas creadas, RLS activo en las 12.
- **Detalles de implementación no cubiertos por el diseño conceptual** (traducción a columnas físicas, ver comentario al inicio de la migración): `dietary_requirement.scope_ref` se parte en `scope_ingredient_id` / `scope_category_id` / `scope_nutrient_column` + CHECK; `dish_ingredient.quantity` añade `quantity_max` nullable para rangos; `supplement.relative_timing` añade `relative_timing_hours` nullable para el caso "X horas después".
- **Datos semilla**: aplicados vía `supabase/migrations/20260726130000_seed_initial_catalog.sql`. Contenido y conteo verificado en remoto: 59 `ingredient`, 9 `ingredient_category`, 56 `ingredient_category_link`, 6 `dish` (Ensalada de la oficina, Bocadillo de pollo/pavo, Tostada de pan de maíz, Papilla diluida en leche, Fruta (pieza), Snack post-entreno), 20 `dish_ingredient`, 4 `meal`, 7 `meal_dish`, 1 `supplement` (Poción del entrenador), 5 `dietary_requirement` (sardinas, aguacate, vitamina C, atún, proteína post-entreno).
- **Asunciones tomadas al sembrar** (documentadas también en el propio archivo de migración): 1 ración de pescado en lata = 120g; reset semanal de los requisitos = lunes; ventana horaria del snack post-entreno = 15:30–16:00 (el diseño solo daba la hora de inicio).
- **Valores nutricionales**: aplicados vía `supabase/migrations/20260726140000_seed_nutrient_values.sql` — los 12 `*_per_100` de los 59 ingredientes, ya sin ningún `NULL` (verificado en remoto). **Importante**: son estimaciones a mano (referencia USDA/BEDCA aproximada), no vienen de la API nutricional externa — esa integración es posterior (ver [ADR-0015](adrs/0015-fuente-de-datos-nutricionales-api-externa-mas-overrides.md)) y cuando se construya debería revisar/sobreescribir estos valores. Tómalos como punto de partida razonable, no como dato de laboratorio.

## Progreso por fase

| Fase | Descripción | Estado |
| --- | --- | --- |
| 1 | Documento de diseño (`diseno-sistema.md`) | ✅ Hecho |
| 2a | Proyecto Supabase base (Auth, convención UUID + RLS) | ✅ Hecho |
| 2b | DDL del esquema (`supabase/migrations/`) | ✅ Hecho |
| 2c | Datos semilla (catálogo de meals/dishes/ingredients/supplements/requisitos) | ✅ Hecho |
| 2d | Valores nutricionales reales de los ingredientes semilla | ✅ Hecho |
| 3 | Motor de generación de menú diario (TypeScript/Node) | ✅ Hecho (v1) |
| 4 | Web mobile-first de gestión | ✅ Hecho (v1: login + ver propuesta) |
| 5 | Usos de IA (opcional, ver sección 8 de `diseno-sistema.md`) | ⬜ Pendiente |

## Decisiones aún abiertas

(copiado de la sección 9 de `diseno-sistema.md` — actualizar ahí primero si se resuelven, y reflejarlo aquí)

- **Alcance de la fase 5 (IA)**: cuál de las 5 ideas de la sección 8 abordar primero, si alguna. No bloquea nada antes de la fase 5.
- **Gramos de hidratos en el almuerzo**: nunca se formalizó como fila en 3.3, no bloquea nada — añadir como `dietary_requirement` nuevo cuando se decida.
- **Precisión de los valores nutricionales**: son estimaciones a mano (ver arriba), no vienen de una fuente validada. No bloquea la fase 3, pero conviene tenerlo presente al interpretar cualquier cálculo de cumplimiento.
- **Cantidades semilla insuficientes para algunos requisitos** (ver hallazgo de la fase 3 arriba): revisar si el catálogo de dishes necesita ajustes (ej. un topping de aguacate más generoso, o una dish dedicada) para que los requisitos se puedan cumplir de verdad con una combinación real de meals.
- **Escritura en `requirement_log`/`meal_log`**: la web y el CLI son de solo lectura; falta decidir cuándo se construye el flujo de confirmación que sí escriba ahí (¿parte de la siguiente iteración de la web?).
- **`npm audit` (3 high, transitivas en `next@16.2.12`)**: no bloquea el desarrollo local, pero revisar de nuevo antes de desplegar públicamente (ver detalle en la sección "Web (fase 4)").
- **`supabase/config.toml` (`site_url`/`additional_redirect_urls`)**: siguen apuntando a `localhost`, pendiente de revisar antes de desplegar `apps/web` a Vercel.

## Próximo paso concreto

Elegir entre: (a) desplegar `apps/web` a Vercel tal cual (v1 read-only), (b) construir el flujo de confirmación (escribir en `meal_log`/`requirement_log`) antes de desplegar, o (c) añadir la edición de inventario/lista de la compra que quedó fuera de este v1.
