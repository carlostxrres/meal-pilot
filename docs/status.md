# Estado del proyecto

> Documento vivo: se actualiza cada sesión conforme avanza el trabajo. Para el diseño estable, ver [`diseno-sistema.md`](diseno-sistema.md); para el porqué de cada decisión, [`adrs/`](adrs/README.md).

**Última actualización**: 2026-07-26

## Fase actual

Fase 4 ampliada: además de login + ver la propuesta del día, ya hay inventario editable, lista de la compra derivada, y confirmación de meals (escribe en `meal_log`). Sistema de interfaz propio (no genérico) aplicado con Radix UI.

## Sistema de interfaz (diseño)

- Sesión con el skill `interface-design`, inspirada en [`DESIGN.md`](DESIGN.md) (Nike) pero adaptada al dominio real — no es un e-commerce, es un ticket de cocina personal. Razonamiento completo en [`plans/2026-07-26-ui-design-system-and-ia.md`](plans/2026-07-26-ui-design-system-and-ia.md); patrones reutilizables guardados en `.interface-design/system.md` (para que futuras sesiones los apliquen sin repetir la exploración).
- Tokens propios en `apps/web/app/globals.css`: paleta papel/tinta + dos acentos con significado fijo (`--turmeric` = ritual diario, `--sardine-teal` = rotación de proteína), tipografía `ticket-header` (mayúsculas, para nombres de meal) + `data-mono` (monoespaciada tabular, para cantidades), superficies planas sin sombra (`radius: none` salvo en píldoras de acción/medidor).
- **Signature**: `CapsuleMeter` — sustituye la barra de progreso plana por una cápsula con banda de tolerancia (visualiza `effectiveMinimum`/`effectiveMaximum` reales, no solo un %). Se usa en "Hoy" para los 5 `dietary_requirement`.
- **IA**: tab bar inferior con 3 secciones — `/` (Hoy), `/inventory` (Inventario), `/shopping` (Compra) — dentro de un route group `app/(app)/` con layout compartido (header + tab bar).
- **Radix UI** (`@radix-ui/react-checkbox`, `@radix-ui/react-dialog`): confirmar meal y tachar compra (Checkbox), editar cantidad de inventario (Dialog). Sin `Tabs` de Radix — la navegación principal es la tab bar custom.

## Estructura del repo (monorepo, desde la fase 4)

Reestructurado como monorepo npm workspaces (ver [ADR-0016](adrs/0016-monorepo-npm-workspaces-para-compartir-engine-y-data.md)):

- `packages/core` (`@meal-pilot/core`) — el motor: `src/engine/` (algoritmo puro, sin Supabase) + `src/data/` (acceso a Supabase + tipos autogenerados en `database.types.ts`, regenerables con `npm run gen:types -w @meal-pilot/core`). Se compila a `dist/` (`npm run build -w @meal-pilot/core`) — **hay que reconstruirlo tras cualquier cambio** si se va a probar solo el CLI (la web lo hace sola vía hooks `predev`/`prebuild`).
- `apps/cli` (`@meal-pilot/cli`) — el CLI de terminal (`npm run generate`), sin cambios de comportamiento tras el movimiento.
- `apps/web` (`@meal-pilot/web`) — la app Next.js de la fase 4 (ver abajo).

Nota: el nombre de cara al usuario de la app es **Meal Pilot** (título, copy de la web, scope de los paquetes npm). El repo en disco y el histórico de docs/ADRs se quedan como `comida-diaria` — decisión explícita para no romper rutas a mitad de sesión.

## Motor de generación (fase 3)

- Diseño previo en [`plans/2026-07-26-fase3-motor-generacion-design.md`](plans/2026-07-26-fase3-motor-generacion-design.md).
- `npm test` (vitest): 15 tests en verde sobre `packages/core/src/engine/` con fixtures en memoria — resolución de huecos, priorización (inventario/requisito/diversidad), semilla por fecha, dish descartada por requisito mandatory, meal sin candidata.
- `npm run generate` ejecutado contra `meal-pilot`: produce la propuesta completa de los 4 meals de hoy + resumen de los 5 `dietary_requirement`, sin errores.
- **Limitaciones conocidas, encontradas al ejecutarlo de verdad** (no son bugs, son simplificaciones deliberadas de esta v1, candidatas a mejorar en una iteración futura):
  - No se prioriza por caducidad (el esquema no guarda fecha de apertura de cada ingrediente — ver diseño de fase 3).
  - La cantidad de cada componente flexible es siempre la fija del `dish_ingredient` (o su mínimo si hay rango), nunca se estira hacia `quantity_max` aunque ayudaría a cumplir un requisito — por eso, por ejemplo, el aguacate de la ensalada (15g) no llega ni de lejos al mínimo diario (100g): la ensalada no está pensada como única fuente de ese requisito. Si se quiere que un requisito se cumpla de verdad con el catálogo actual, hay que revisar las cantidades/dishes semilla, no es una limitación del motor en sí.
  - El motor no escribe en `requirement_log` ni `meal_log` (decisión explícita del diseño); por tanto el resumen de requisitos que imprime el CLI/la web es solo "lo que aportaría la propuesta de hoy", no un acumulado semanal real todavía.

## Web (fase 4)

- Diseño previo: plan de la fase 4 (brainstorming + Plan agent), resumido en [ADR-0016](adrs/0016-monorepo-npm-workspaces-para-compartir-engine-y-data.md); IA/diseño de interfaz en la sección de arriba.
- `apps/web`: Next.js 16 (App Router, Turbopack), `@supabase/ssr` para auth server-side. 4 rutas: `/login`, y dentro de `app/(app)/` (layout con header + tab bar) — `/` (Hoy), `/inventory`, `/shopping`.
- **Auth**: `proxy.ts` (antes `middleware.ts` — Next 16 renombró la convención, ver [nota de migración](https://nextjs.org/docs/messages/middleware-to-proxy)) refresca la sesión y redirige a `/login` si no hay usuario, protegiendo automáticamente cualquier página nueva bajo `(app)`. Login/logout como Server Actions (`app/login/actions.ts`) con `@supabase/ssr`. Usa **solo** `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` — nunca la service_role key.
- **Hoy** (`/`): selector **Hoy/Mañana/Pasado mañana** (`DayTabs`, Radix Tabs, `PLANNING_HORIZON_DAYS = 3`) — cada pestaña es un `DayProposalView` para esa fecha, y las 3 vienen del **mismo plan encadenado** (ver más abajo), no de 3 llamadas independientes. Cada meal tiene un botón de valores nutricionales (`NutritionPopover`, Radix Popover, usa `computeMealNutrition`) y, solo en "Hoy", un checkbox de confirmar (`MealConfirmCheckbox`, clicable también por su label) que escribe/borra en `meal_log` vía `setMealConfirmed`. `CapsuleMeter` (sobre `@radix-ui/react-progress`) por cada `dietary_requirement`.
- **Inventario** (`/inventory`): `InventoryList` (client) separa **En stock** / **Agotado**, con buscador por nombre y un `Select` de Radix para ordenar (cantidad ↓ por defecto, cantidad ↑, nombre A-Z/Z-A). `InventoryEditDialog` edita `office_inventory`/`home_inventory` (ya no gestiona imagen, ver abajo).
- **Compra** (`/shopping`): `computeShoppingList` calcula lo que hace falta para las propuestas de los **próximos `PLANNING_HORIZON_DAYS` días** (mismo plan encadenado que "Hoy") más lo pendiente de un `dietary_requirement` mandatory. La cantidad de reposición del motivo "próximos días" es el déficit real (necesidad agregada menos stock actual); el motivo "requisito" sigue usando un valor fijo por tipo de unidad al no haber una necesidad concreta que medir. Cada fila muestra la imagen del ingrediente o un icono Tabler de repuesto si falla (ver abajo). Tachar sigue sin tabla `shopping_list` — 100% derivada.
- **Imágenes de ingrediente, rediseñadas**: en vez de una `image_url` manual en la tabla `ingredient` (probado brevemente, luego revertido a petición del usuario), las fotos son **fijas** en el bucket público `ingredient-images` de Supabase Storage, con nombre de archivo determinista `{ingredient.id}.png` — el usuario las sube él mismo desde el dashboard. La URL se **construye**, no se guarda (`apps/web/lib/ingredientImage.ts`, `ingredientImageUrl(id)`); `PurchaseCheckbox` usa `onError` en el `<img>` para caer al icono Tabler de repuesto cuando un ingrediente aún no tiene foto subida. Migraciones: `20260726210340_ingredient_images_bucket.sql` (bucket + policy de lectura pública) y `20260726210341_drop_ingredient_image_url.sql` (elimina la columna).
- **Motor multi-día encadenado** (`generateMultiDayPlan`, `packages/core/src/engine/resolve.ts`): a petición explícita del usuario, se sustituyó la generación independiente por día por un plan que encadena varios días: la diversidad (ingredientes usados) y el acumulado de los `dietary_requirement` de `period = week` se arrastran de un día al siguiente dentro de la ventana (con reset correcto en el cruce de `week_reset_day`); los de `period = day` se reinician cada día. `generateDayProposal` (un solo día) queda como caso particular (`generateMultiDayPlan([ctx], rand)[0]`) — comportamiento idéntico verificado (los 21 tests previos siguen en verde tal cual). 4 tests nuevos cubren el encadenado (no repetir ingrediente rotable entre días consecutivos, acumular un requisito semanal a través de varios días, reiniciar uno diario, y equivalencia con un solo día).
- **Sistema de interfaz, iteración de feedback**: iconos Tabler en toda la web (tab bar, checkmarks, warning, logout, editar, buscar, ordenar), Radix ampliado a Progress/Popover/Tabs/Select (además de Checkbox/Dialog) — se mantuvo la decisión de **no** adoptar Radix Themes, para no traer una identidad visual ajena a los tokens propios (papel/tinta, cápsula de tolerancia) definidos en la sesión de diseño.
- **Verificado**: `npm test` (25 tests) y `next build` (type-check + compila las 4 rutas) en verde tras cada bloque de cambios. La verificación interactiva en navegador la sigue haciendo el propio usuario con su `npm run dev` local. De paso se corrigieron dos huecos de tipado latentes en `testFixtures.ts` (`confirmedMealIds`/`image_url` ausentes) que el build normal no detectaba porque excluye ese archivo — no afectaban al comportamiento en tiempo de ejecución, solo al chequeo de tipos.
- **Problema real encontrado y resuelto durante la implementación (fase 4 inicial)**: Turbopack no resuelve los imports internos de `packages/core` en convención NodeNext (`import "./foo.js"` apuntando a `foo.ts`) ni con `transpilePackages` ni con `turbopack.resolveExtensions`. Solución: `packages/core` se compila a `dist/` real (`tsc`, `declaration: true`), consumido como JS normal de `node_modules`. Detalle en [ADR-0016](adrs/0016-monorepo-npm-workspaces-para-compartir-engine-y-data.md).
- **`npm audit`**: 3 vulnerabilidades "high" transitivas en `next@16.2.12` (postcss/sharp, sin parche disponible). No afectan a este v1. Revisar antes de desplegar públicamente.
- **Simplificaciones de este v1, documentadas a propósito** (no son bugs):
  - Confirmar un meal es sí/no — no permite editar qué se comió realmente si hubo desviación.
  - Confirmar un meal escribe en `meal_log` pero **no** recalcula `requirement_log` — los `CapsuleMeter` de "Hoy" siguen mostrando el aporte de la propuesta generada, no un acumulado histórico real de lo confirmado.
  - El plan multi-día sigue siendo un algoritmo **voraz día a día** (prioriza en cada hueco "ayuda a un requisito no cumplido"), no un solver que mire toda la ventana a la vez para encontrar el reparto óptimo de requisitos escasos — pero ya no genera cada día de forma aislada.
  - El motivo "requisito" en Compra sigue usando una cantidad de reposición fija (no calculada), a diferencia del motivo "próximos días" que ya sí calcula el déficit real.
  - Las fotos de ingrediente hay que subirlas manualmente al bucket (no hay pipeline automático de importación/CDN de terceros) — mientras no se suban las 59, las que falten muestran el icono de repuesto.
- Despliegue a Vercel no hecho todavía (diseño no lo impide).

## Proyecto Supabase

- **Nombre**: `meal-pilot`, org `carlostxrres's Org`, región `eu-central-1` (Frankfurt).
- **Project ref**: `mpcembushoagmskcqajd` (ver `.env`, no versionado — plantilla en `.env.example`).
- **Auth**: email/password activo por defecto (`external_email_enabled = true`, `disable_signup = false`, confirmación por email requerida). No ha hecho falta tocar nada — es el estado por defecto de todo proyecto Supabase nuevo.
- **Usuario semilla**: creado vía Admin API (`ctorresmoral@gmail.com`, email pre-confirmado). Su id es el `owner_id` de todas las filas semilla. Contraseña generada y guardada en `.env` (`SEED_OWNER_PASSWORD`) — pensada para entrar a Supabase Studio o a la futura web (fase 4), cámbiala si lo prefieres.
- **CLI local**: repo linkado (`supabase link`) contra este proyecto; `supabase/config.toml` scaffoldeado con `supabase init` (aún no se ha hecho `supabase config push` — el `site_url`/`additional_redirect_urls` de ese archivo son placeholders de `localhost` para desarrollo local, hay que revisarlos antes de ir a producción en la fase 4).
- **Esquema**: aplicado vía `supabase/migrations/20260726120546_initial_schema.sql` — las 12 tablas de la sección 4.2 de `diseno-sistema.md`, con RLS activado y policy `owner_id = auth.uid()` (directa en las tablas con `owner_id`, vía `EXISTS` al padre en las tablas puente/hijas). Verificado en remoto: 12 tablas creadas, RLS activo en las 12.
- **Detalles de implementación no cubiertos por el diseño conceptual** (traducción a columnas físicas, ver comentario al inicio de la migración): `dietary_requirement.scope_ref` se parte en `scope_ingredient_id` / `scope_category_id` / `scope_nutrient_column` + CHECK; `dish_ingredient.quantity` añade `quantity_max` nullable para rangos; `supplement.relative_timing` añade `relative_timing_hours` nullable para el caso "X horas después".
- **Datos semilla**: aplicados vía `supabase/migrations/20260726130000_seed_initial_catalog.sql`. Contenido y conteo verificado en remoto: 59 `ingredient`, 9 `ingredient_category`, 56 `ingredient_category_link`, 20 `dish_ingredient` (de las 6 dishes originales), 4 `meal`, 7 `meal_dish`, 1 `supplement` (Poción del entrenador), 5 `dietary_requirement` (sardinas, aguacate, vitamina C, atún, proteína post-entreno).
- **Catálogo de dishes ampliado**: `supabase/migrations/20260726210000_seed_more_dishes.sql` añadió 25 dishes más (bowls, bocadillos, tostadas, ensaladas, snacks — mezcla de fijas/semiflexibles/flexibles), reutilizando solo ingredientes/categorías ya sembrados. Total actual: **31 `dish`**. Nota: esta migración no se generó en esta sesión de chat, apareció ya escrita en disco (aplicada junto con las migraciones de imágenes de este mismo bloque de trabajo) — revisar su contenido si no la reconoces.
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
- **Escritura en `requirement_log`**: `meal_log` ya se escribe (confirmar meal en "Hoy"), pero `requirement_log` sigue sin recalcularse a partir de confirmaciones reales — pendiente para una iteración futura.
- **`npm audit` (3 high, transitivas en `next@16.2.12`)**: no bloquea el desarrollo local, pero revisar de nuevo antes de desplegar públicamente (ver detalle en la sección "Web (fase 4)").
- **`supabase/config.toml` (`site_url`/`additional_redirect_urls`)**: siguen apuntando a `localhost`, pendiente de revisar antes de desplegar `apps/web` a Vercel.

## Próximo paso concreto

El usuario está probando la app en su navegador (`npm run dev` local) tras la ronda de feedback de UI. Tras su verificación: elegir entre (a) desplegar `apps/web` a Vercel, o (b) construir el recálculo real de `requirement_log` a partir de `meal_log` confirmado antes de desplegar.
