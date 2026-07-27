# ADR-0018: Toda dish es fija y pertenece a exactamente un meal

- **Estado**: Aceptada (sustituye a [ADR-0008](0008-structure-type-de-dish-derivado-no-almacenado.md))
- **Fecha**: 2026-07-27

## Contexto

Con las ventanas nutricionales por meal del [ADR-0017](0017-requisitos-dieteticos-por-meal-como-mecanismo-principal.md), el usuario quiere que cada dish satisfaga **por construcción** todos los requisitos de su meal. Una dish flexible/semiflexible (ej. la ensalada de 5 categorías) no tiene perfil nutricional fijo — depende de cómo se resuelvan sus huecos — así que esa garantía solo puede darse en generación, no al crear la dish. Además, una misma dish difícilmente encaja en las ventanas de dos meals distintos, lo que vacía de sentido la relación N:M `meal_dish`.

## Decisión

- Toda dish es **fija**: `dish_ingredient` queda en `(dish_id, ingredient_id, quantity)`; se eliminan `category_id`, `slot_group`, `required` y `quantity_max` (borrado en limpio, no columnas dormidas). Desaparece la clasificación fija/flexible/semiflexible del ADR-0008.
- Cada dish pertenece a exactamente un meal: columna `dish.meal_id` (NOT NULL, FK → `meal`); se elimina la tabla `meal_dish`. La propuesta diaria de un meal es una única dish de entre las suyas.
- La garantía "toda dish cumple su meal" se valida al crear/editar la dish (vista `dish_compliance` o cálculo en `@meal-pilot/core`: perfil estático de la dish vs. ventana del meal, nutriente a nutriente), y la página `/dishes` marca las que queden fuera de ventana.
- `ingredient_category` y su tabla puente se conservan: las usan los `dietary_requirement` por categoría y la futura alta asistida de dishes (fase 5).

## Alternativas consideradas

- **Mantener dishes flexibles con validación al crearlas** (calcular el rango alcanzable de peor/mejor resolución y avisar si no cabe en la ventana): conserva la ensalada rotatoria como entidad única, pero mantiene toda la maquinaria de huecos en esquema y motor. El usuario prefirió la simplicidad total.
- **Mantener flexibles y validar solo en generación** (statu quo): garantía débil — una dish mal diseñada solo se descubre cuando el generador nunca la elige.
- **Dejar las columnas flexibles dormidas en el esquema**: menos migración destructiva, a cambio de piezas muertas que confunden; descartado explícitamente.

## Consecuencias

- El motor pierde la resolución de huecos (su parte más compleja): las candidatas de un meal son sus dishes, ya válidas por construcción; solo quedan puntuación (inventario, requisitos globales abiertos, diversidad) y el filtro duro de techos de ingrediente/categoría. `generateMultiDayPlan` se conserva.
- La rotación (norma "Diverso") recae por completo en tener varias dishes fijas por meal (objetivo: 4–6) — el catálogo semilla se reconstruye, las variantes las diseña el usuario.
- El aviso de "dish huérfana" de `/dishes` deja de poder existir (`meal_id NOT NULL`); lo sustituye el badge de cumplimiento nutricional.
- Los tests de resolución de huecos se retiran; se adaptan los de rotación, encadenado semanal y descarte por techo.
