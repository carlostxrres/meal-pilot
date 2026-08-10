# ADR-0024: CSS Modules para estilos por componente

- **Estado**: Aceptada
- **Fecha**: 2026-08-09

## Contexto

Todo el CSS de `apps/web` vivía en un único archivo, `app/globals.css`, que había crecido a 1.698 líneas y 144 clases. Sus 19 comentarios de sección no eran una frontera fiable: por ejemplo, la sección "Bottom tab bar" solo cubría sus primeras ~38 líneas, y el resto (~234 líneas) eran en realidad reglas de `dish-card`/popover de nutrición añadidas sin cabecera nueva.

La propiedad de cada clase era cada vez más difusa: la familia `dish-*` aparecía en 9 archivos de componente distintos sin relación explícita entre ellos en el código; el patrón de menú desplegable (`dropdown-*`/`select-*`) estaba duplicado literalmente en `DishCardMenu`, `IngredientCardMenu` y `UserMenu`; `DishCreator` e `IngredientCreator` compartían siete clases (`dish-creator-content`, `dish-creator-trigger`, `dish-edit-btn`, `creator-component-list`, `creator-component-remove`, `creator-description`, `creator-grid2`) sin que nada en el código indicara esa relación salvo el nombre. Tocar el CSS de un componente arriesgaba romper otro sin aviso del compilador.

No había ninguna herramienta de CSS instalada en el proyecto (ni Tailwind, ni CSS Modules, ni CSS-in-JS), y Next.js 16 con Turbopack soporta CSS Modules de forma nativa sin dependencias nuevas.

## Decisión

Migrar a **CSS Modules**, colocados junto a cada componente/ruta (`Component.module.css`, `page.module.css`), en una sola pasada completa:

1. **`app/globals.css` se reduce** (1.698 → ~530 líneas) a solo: los tokens de diseño (`:root` + su variante `@media (prefers-color-scheme: dark)`), el reset (`*`, `html`, `body`, `button, input { font: inherit }`), y un conjunto explícito de primitivas realmente transversales — botones (`btn-primary`/`btn-secondary`/`btn-destructive`), diálogo/overlay de Radix, `chip`/`chip-button`, `field`, el patrón select/dropdown de Radix, cabeceras de sección, `data-mono`, checkbox de Radix, shell/tabbar, `warning`, `inventory-controls`, `dish-filters-row`, `dish-meal-chips`, `meter-action`/`meter-actions`.
2. **Convención de nombres**: cada clase conserva su nombre kebab-case exacto; el único cambio es el acceso (`styles['dish-row']` en vez de la clase literal). Se descartó renombrar a camelCase a la vez — un único cambio mecánico por sitio es más seguro en una migración de ~35 archivos que dos cambios simultáneos, donde un typo falla en silencio (sin error de build) en vez de con un error de TypeScript.
3. **`composes`** para los grupos con un propietario canónico claro: `IngredientRow.module.css` compone `dish-description` desde `DishCard.module.css`; `Skeleton.module.css` compone de ambos (cadena transitiva); `IngredientCreator.module.css` compone las siete clases compartidas desde `DishCreator.module.css`. Los compuestos con clases globales (`.creator-grid2 .field`, `.swipe-row-content .ingredient-row`, `.dinner-target-list li[data-covered="true"] .data-mono`...) usan el escape `:global(...)` de CSS Modules.
4. **Clases mixtas** (una global + una local) se combinan con un único template literal en el `className`, sin `clsx` ni ninguna dependencia nueva.

## Alternativas consideradas

- **Tailwind**: habría significado reescribir todo el markup y abandonar el sistema de diseño ya fijado (tokens propios, superficies planas, dos acentos con significado fijo) documentado en `docs/diseno-sistema.md` y `.interface-design/system.md`. Una app de un único desarrollador con un sistema visual ya asentado no se beneficia de ese coste.
- **CSS-in-JS con runtime (styled-components/Emotion)**: añade una dependencia y coste en runtime, y obliga a marcar como `"use client"` cada componente con estilos propios — choca con el modelo de Server Components de Next y con la preferencia del proyecto por pocas dependencias.
- **CSS-in-JS sin runtime (vanilla-extract)**: zero-runtime y compatible con Server Components, pero añade una dependencia y un plugin de build nuevos, y un paradigma (estilos en TypeScript) distinto del CSS plano ya usado en todo el proyecto, para un beneficio de tipado que no hacía falta aquí.
- **Reorganizar `globals.css` en varios archivos sin scoping**: el cambio más barato, pero no resuelve el problema real — el acoplamiento accidental entre componentes no relacionados y la propiedad difusa de cada clase seguirían existiendo, solo repartidos en más archivos.

## Consecuencias

- Se encontró y eliminó CSS muerto sin ningún consumidor: `.purchase-toast*` (+ sus `@keyframes` y variantes `[data-state]`/`[data-swipe]`) y `.shopping-empty`. La dependencia `@radix-ui/react-toast`, sin ningún import en todo el repo, queda como huérfana señalada — retirarla es un cambio aparte, fuera de esta migración de CSS.
- `IngredientThumb` gana un prop `small?: boolean` (con `data-size="small"`) para la miniatura de 24px de `ContributionDialog`, que antes se resolvía con el selector global `.contrib-name .ingredient-thumb` — con CSS Modules esa regla ya no podía alcanzar la clase de `IngredientThumb` desde fuera de su propio archivo. Sigue el mismo patrón `data-*` que ya usa el resto de la app (`data-tone`, `data-state`, `data-inactive`).
- Dos duplicaciones accidentales salieron a la luz durante la migración y se corrigieron: `.capsule-meter-compact` y sus reglas descendientes estaban definidas dos veces en `globals.css` (una en la sección "Dish creator", otra en "Capsule meter"); `.skeleton-thumb`/`.ingredient-thumb`/`.dish-row` ya tenían acoplamiento implícito con Skeleton.tsx que ahora es explícito vía `composes`.
- Todo componente/ruta nuevo debe seguir el mismo patrón: `Component.module.css` colocado junto a `Component.tsx`, clases realmente transversales (usadas sin variación por 3+ archivos no relacionados) añadidas a `globals.css`, y `composes` cuando dos componentes comparten una clase con un propietario canónico claro.
