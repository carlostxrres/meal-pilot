# Estado del proyecto

> Documento vivo: se actualiza cada sesión conforme avanza el trabajo. Para el diseño estable, ver [`diseno-sistema.md`](diseno-sistema.md); para el porqué de cada decisión, [`adrs/`](adrs/README.md).

**Última actualización**: 2026-07-26

## Fase actual

Fase 3 (motor de generación) completada en su v1: CLI funcionando de punta a punta contra el proyecto real. Lista para arrancar la **fase 4** (web mobile-first) o para iterar sobre las limitaciones conocidas del motor (ver abajo).

## Motor de generación (fase 3)

- Diseño previo en [`plans/2026-07-26-fase3-motor-generacion-design.md`](plans/2026-07-26-fase3-motor-generacion-design.md).
- Proyecto Node/TS en la raíz del repo: `src/engine/` (algoritmo puro, sin Supabase), `src/data/` (acceso a Supabase + tipos autogenerados en `database.types.ts`, regenerables con `npm run gen:types`), `src/cli.ts` (entrypoint de `npm run generate`).
- `npm test` (vitest): 15 tests en verde sobre `engine/` con fixtures en memoria — resolución de huecos, priorización (inventario/requisito/diversidad), semilla por fecha, dish descartada por requisito mandatory, meal sin candidata.
- `npm run generate` ejecutado contra `meal-pilot`: produce la propuesta completa de los 4 meals de hoy + resumen de los 5 `dietary_requirement`, sin errores.
- **Limitaciones conocidas, encontradas al ejecutarlo de verdad** (no son bugs, son simplificaciones deliberadas de esta v1, candidatas a mejorar en una iteración futura):
  - No se prioriza por caducidad (el esquema no guarda fecha de apertura de cada ingrediente — ver diseño de fase 3).
  - La cantidad de cada componente flexible es siempre la fija del `dish_ingredient` (o su mínimo si hay rango), nunca se estira hacia `quantity_max` aunque ayudaría a cumplir un requisito — por eso, por ejemplo, el aguacate de la ensalada (15g) no llega ni de lejos al mínimo diario (100g): la ensalada no está pensada como única fuente de ese requisito. Si se quiere que un requisito se cumpla de verdad con el catálogo actual, hay que revisar las cantidades/dishes semilla, no es una limitación del motor en sí.
  - El motor no escribe en `requirement_log` ni `meal_log` (decisión explícita del diseño); por tanto el resumen de requisitos que imprime el CLI es solo "lo que aportaría la propuesta de hoy", no un acumulado semanal real todavía.

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
| 4 | Web mobile-first de gestión | ⬜ Pendiente |
| 5 | Usos de IA (opcional, ver sección 8 de `diseno-sistema.md`) | ⬜ Pendiente |

## Decisiones aún abiertas

(copiado de la sección 9 de `diseno-sistema.md` — actualizar ahí primero si se resuelven, y reflejarlo aquí)

- **Alcance de la fase 5 (IA)**: cuál de las 5 ideas de la sección 8 abordar primero, si alguna. No bloquea nada antes de la fase 5.
- **Gramos de hidratos en el almuerzo**: nunca se formalizó como fila en 3.3, no bloquea nada — añadir como `dietary_requirement` nuevo cuando se decida.
- **Precisión de los valores nutricionales**: son estimaciones a mano (ver arriba), no vienen de una fuente validada. No bloquea la fase 3, pero conviene tenerlo presente al interpretar cualquier cálculo de cumplimiento.
- **Cantidades semilla insuficientes para algunos requisitos** (ver hallazgo de la fase 3 arriba): revisar si el catálogo de dishes necesita ajustes (ej. un topping de aguacate más generoso, o una dish dedicada) para que los requisitos se puedan cumplir de verdad con una combinación real de meals.
- **Escritura en `requirement_log`/`meal_log`**: el motor de la fase 3 es solo lectura; falta decidir cuándo se construye el flujo de confirmación que sí escriba ahí (¿parte de la fase 4?).

## Próximo paso concreto

Arrancar fase 4 (web mobile-first) reutilizando `src/engine/` y `src/data/`, o iterar primero sobre las limitaciones conocidas del motor (cantidades semilla, escritura de logs) antes de construir la web.
