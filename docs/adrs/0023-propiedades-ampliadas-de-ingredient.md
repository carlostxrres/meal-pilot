# ADR-0023: Propiedades ampliadas de `ingredient` (conservación, habilitado, descripción, links de compra)

- **Estado**: Aceptada
- **Fecha**: 2026-08-03

## Contexto

Hoy `ingredient` solo se gestiona por SQL manual (migraciones de seed/mantenimiento); no existe ninguna UI para crear o editar ingredientes, solo `InventoryEditDialog` para tocar cantidades de inventario. El usuario quiere una página `/ingredients` (calcada de `/dishes`) para gestionar el catálogo completo, y de paso ampliar `ingredient` con cuatro propiedades: descripción libre, vida útil una vez abierto por método de conservación, habilitado/deshabilitado, y links de compra online por supermercado.

Cada propiedad implicaba una decisión de modelado con más de una alternativa razonable, y varias de las ideas iniciales del usuario chocaban con convenciones ya asentadas:

- Ya existe `ingredient.opened_shelf_life_days` (int nullable, sin usar por ningún código), que se solapa directamente con la idea de "conservación por método".
- El [ADR-0006](0006-valores-nutricionales-como-columnas-en-ingredient.md) fija una preferencia explícita por columnas planas tipadas frente a normalizar, "para un beneficio que no aporta valor real en un sistema de un único usuario". El único `jsonb` del esquema hoy (`planned_meal.components`, [ADR-0019](0019-plan-comprometido-con-horizonte-rodante.md)) congela un snapshot inmutable en el momento de comprometer un plan — un uso distinto al de guardar metadatos mutables y editables por el usuario.
- El esquema ya tiene dos patrones distintos para "listas de valores constreñidos": enum nativo de Postgres, cerrado (`base_unit`, `storage_type`, `time_of_day`) y tabla abierta editable desde la UI ([ADR-0007](0007-categorias-de-ingrediente-como-entidad-abierta.md), `ingredient_category`).
- `dish.active` (migración `20260731100000_dish_active_and_timestamps.sql`, sin ADR propio por ser extensión directa de patrones ya decididos) es un precedente casi idéntico para "ocultar sin borrar", incluyendo el trigger `set_updated_at()`.
- No existe ninguna librería de tooltips en el proyecto, y varias interacciones (swipe para acciones, drag por pointer events en el creador de platos) confirman que la app está pensada para uso táctil/móvil, donde un tooltip por `hover` no es utilizable.

## Decisión

1. **Conservación por método de almacenamiento** → tres columnas nullable tipadas: `pantry_shelf_life_days`, `fridge_shelf_life_days`, `freezer_shelf_life_days` (int), en sustitución de `opened_shelf_life_days` (se migra el valor existente a la columna que corresponda según el `storage_type` de cada fila, y se borra la columna vieja). Sigue el sesgo de columnas planas del ADR-0006; encaja exactamente con que `storage_type` ya solo tiene esos 3 valores posibles.
2. **Habilitado/deshabilitado** → `ingredient.enabled boolean not null default true`, más `created_at`/`updated_at timestamptz` y el trigger `set_updated_at()` ya existente (reutilizado, no redefinido). Espejo directo de `dish.active`: oculta el ingrediente del alta de nuevos platos sin borrarlo ni romper los `dish_ingredient` que ya lo referencian (no hay ni hace falta cascada, porque nunca se borra la fila).
3. **Descripción** → `ingredient.description text`, nullable, libre — mismo patrón que `dish.description`.
4. **Links de compra** → tabla normalizada `ingredient_purchase_link (id, ingredient_id → ingredient, supermarket, url)`, con `supermarket` como enum nativo de Postgres (`create type supermarket as enum ('mercadona')`, ampliable con `ALTER TYPE ... ADD VALUE`). La tabla sigue el mismo patrón que `dish_ingredient`/`ingredient_category_link`: sin `owner_id` propio, RLS vía `EXISTS` contra el `owner_id` del `ingredient` padre.
5. **Aviso de ingrediente deshabilitado** → un icono de aviso con un `Popover` de Radix que se abre al tocar/pulsar (mismo patrón que `NutritionPopover`), no un tooltip por `hover` ni una librería nueva.

## Alternativas consideradas

- **`conservation jsonb`** (la forma propuesta originalmente, `{ "congelador": 60, "nevera": 20, "despensa": 10 }`): más flexible si en el futuro aparecen métodos de conservación más allá de los 3 de `storage_type`, pero introduce el primer `jsonb` pensado para metadatos mutables del esquema, en un caso donde el ADR-0006 ya se decantó por columnas planas y donde el conjunto de métodos es cerrado y conocido. Descartada.
- **Tabla abierta para `supermarket`** (patrón ADR-0007): permitiría añadir supermercados desde la UI sin migración, pero es más aparato (tabla + relación) para lo que hoy es solo una etiqueta; el usuario es quien opera las migraciones, así que el coste de `ALTER TYPE ... ADD VALUE` es marginal. Descartada.
- **`purchase_links` como columna `jsonb` o array de texto**: más simple de escribir en el primer momento, pero rompe el patrón ya usado en todo el esquema para "un ingrediente tiene N de algo" (tabla hija normalizada + RLS vía EXISTS). Descartada por consistencia.
- **Tooltip nativo (`title`) o añadir Radix Tooltip**: el atributo `title` ya se usa en otro punto de la app (`DayProposalView`) pero no funciona con un toque en móvil; añadir Radix Tooltip resolvería el caso de escritorio pero seguiría sin resolver bien el táctil sin trabajo extra, y sumaría una dependencia nueva. Descartadas a favor de reutilizar el `Popover` que ya existe para la nutrición.

## Consecuencias

- `packages/core` gana `ingredientCatalog.ts` (fetch + create + update + `setIngredientEnabled`), calcado de `createDish.ts` — hasta ahora `ingredient` solo tenía `fetchIngredients`/`updateIngredientInventory`/`addToHomeInventory` en `inventory.ts`.
- El picker de ingredientes del creador de platos (`DishCreator`) debe filtrar `enabled = false`; el resto de vistas que ya muestran ingredientes (Inventario, Compra, catálogo de platos) siguen mostrándolos igual, con el aviso visual añadido vía `IngredientRow`.
- `docs/diseno-sistema.md` (sección 2, entidad `Ingredient`) se actualiza para reflejar las columnas nuevas — aprovechando para poner al día también `price_eur_per_100` y `max_quantity_per_dish`, que ya estaban desactualizadas en ese documento desde antes de este ADR.
- Cualquier ingrediente con `opened_shelf_life_days` relleno conserva su valor tras la migración, reubicado en la columna de su `storage_type` actual.
