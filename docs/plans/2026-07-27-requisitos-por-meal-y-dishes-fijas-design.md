# Diseño: requisitos dietéticos por meal + dishes fijas 1:1

> Documento de diseño validado con el usuario el 2026-07-27, sección a sección, antes de implementar nada. Decisiones de arquitectura formalizadas en [ADR-0017](../adrs/0017-requisitos-dieteticos-por-meal-como-mecanismo-principal.md) y [ADR-0018](../adrs/0018-dish-fija-con-meal-unico.md). Cuando se implemente, actualizar `diseno-sistema.md` (secciones 2, 3 y 5) y `status.md`.

## Motivación

Idea del usuario: en lugar de que los requisitos nutricionales vivan sobre todo a nivel de día completo y el generador tenga que resolver huecos flexibles para cumplirlos, **cada meal define su propia ventana nutricional** y **cada dish pertenece a exactamente un meal y la satisface por construcción**. La vista de requisitos diarios de "Hoy" se reorienta a mostrar **qué le queda por cubrir a la cena** ("Prepara tu cena"), que está fuera del alcance de la app (ADR-0001) pero es quien cierra los objetivos de día completo.

Esto convierte en *feature* lo que `status.md` documentaba como advertencia: el acumulado diurno de kcal/proteína queda por debajo de los objetivos de día completo *a propósito* — el residuo es el objetivo de la cena.

**Coherencia numérica verificada**: la suma de las 4 ventanas da 2.200–2.750 kcal y 118–153 g de proteína, frente a los mínimos diarios oficiales de 2.800 kcal y 160 g → la cena debe aportar ~50–600 kcal y ~7–42 g de proteína. Plausible.

## 1. Modelo de datos

- **`dish.meal_id`** (uuid, NOT NULL, FK → `meal`): cada dish pertenece a exactamente un meal. **Se elimina `meal_dish`**.
- **`dish_ingredient` se simplifica a `(dish_id, ingredient_id, quantity)`**: todas las dishes son fijas, así que se eliminan `category_id`, `slot_group`, `required` y `quantity_max` (decisión explícita: borrar en limpio, no dejar columnas dormidas). El perfil nutricional de una dish es una suma estática.
- Desaparece el concepto fija/flexible/semiflexible (sustituye a ADR-0008): toda dish es fija.
- **`ingredient_category` y `ingredient_category_link` se mantienen**: ya no participan en la composición de dishes, pero las usan los `dietary_requirement` por categoría y la futura alta asistida de dishes (fase 5).
- **`dietary_requirement` no cambia de estructura** (reutiliza ADR-0010/0011 tal cual). Cambian los datos:
  - Se cargan ~32 filas nuevas con `meal_id` no nulo, `scope_type = nutrient`, `period = day`, `strictness = mandatory` (8 nutrientes × 4 meals, ver tablas abajo).
  - El requisito semilla "proteína post-entreno ≥ 35 g" **se retira**: lo sustituye la ventana 25–35 g del nuevo set.
  - Los requisitos oficiales de día completo (`meal_id = null`, period=day: 2.800 kcal, 160 g proteína, fibra, etc.) **se mantienen** — son la base de "Prepara tu cena".
  - Los semanales de ingrediente (sardinas, atún) **se mantienen** sin cambios.
- **Validación dish↔meal**: vista `dish_compliance` (o cálculo equivalente en `@meal-pilot/core`) que compara el perfil estático de cada dish con la ventana de su meal, nutriente a nutriente. Es la garantía de "toda dish satisface su meal": se comprueba al crear/editar la dish, no en generación.

### Ventanas nutricionales por meal (datos del usuario)

La sal se almacena como sodio (`sodium_mg_per_100`), conversión 1 g sal ≈ 400 mg sodio.

**Desayuno en casa (08:00)**: energía 550–650 kcal · grasas 16–21 g (sat ≤ 7 g) · hidratos 65–85 g (azúcares ≤ 15 g) · fibra 5–8 g · proteína 25–32 g · sodio 200–400 mg (sal 0,5–1 g).

**Snack de media mañana (10:45)**: energía 350–450 kcal · grasas 11–15 g (sat ≤ 5 g) · hidratos 40–55 g (azúcares ≤ 10 g) · fibra 3–5 g · proteína 18–24 g · sodio 200–480 mg (sal 0,5–1,2 g).

**Almuerzo en el escritorio (14:30)**: energía 950–1.150 kcal · grasas 28–37 g (sat ≤ 10 g) · hidratos 115–155 g (azúcares ≤ 20 g) · fibra 10–15 g · proteína 50–62 g · sodio 600–1.000 mg (sal 1,5–2,5 g).

**Snack post-entreno**: energía 350–500 kcal · grasas 3–8 g (sat ≤ 3 g) · hidratos 45–65 g (azúcares 10–25 g) · fibra ≤ 4 g · proteína 25–35 g · sodio 200–600 mg (sal 0,5–1,5 g).

## 2. Motor de generación

Pierde la resolución de huecos (su parte más compleja) y conserva lo transversal:

- **Candidatas**: `dishes where meal_id = meal`. Una candidata ya es una propuesta completa y válida para su meal (garantizado al crearla).
- **Puntuación entre candidatas** (se conserva, aplicada a dishes enteras): 1) inventario disponible; 2) requisitos globales abiertos (acercarse a mínimos pendientes tipo aguacate/sardinas); 3) diversidad (penalizar ingredientes usados recientemente). La rotación recae por completo en tener varias dishes fijas por meal.
- **Filtro duro**: solo requisitos mandatory de ingrediente/categoría con máximo (ej. techo semanal de atún). Los nutricionales del meal no se filtran en generación: se cumplen por construcción.
- **`generateMultiDayPlan` se conserva** en su papel (arrastrar diversidad y acumulados semanales entre días).
- **Salida nueva — residuo del día**: para cada requisito global diario, `objetivo − suma de las 4 dishes propuestas`. Es lo que consume "Prepara tu cena".
- Tests: se retiran los de resolución de huecos; se adaptan y mantienen los de rotación, encadenado semanal y descarte por techo.

## 3. Web UI

- **Cada meal en "Hoy"**: sección plegable (plegada por defecto) con un `CapsuleMeter` por nutriente — banda de tolerancia de la ventana del meal y aporte de la dish propuesta. Valor de confianza/inspección; el ticket no se ensancha.
- **"Prepara tu cena"** sustituye a "Requisitos diarios": muestra el residuo por requisito global diario ("≥ 50 kcal · ≥ 7 g proteína · ≤ X g grasa saturada…"); los ya cubiertos se marcan como tal. No planifica la cena (coherente con ADR-0001), solo dice qué debe aportar.
- **"Requisitos semanales"** se queda como está.
- **`/dishes`**: cada dish muestra su meal (intrínseco) y un badge de cumplimiento contra la ventana de su meal. El aviso de "dish huérfana" desaparece (`meal_id NOT NULL` lo hace imposible).

## 4. Catálogo y orden de trabajo

- **Catálogo semilla nuevo**: migración que reconstruye las dishes como fijas por meal (las diseña el usuario; el sistema valida cada una contra su ventana con `dish_compliance`). Objetivo mínimo: 4–6 dishes por meal para que la rotación respire.
- **Orden**: 1) migración de esquema; 2) requisitos por meal (datos); 3) motor; 4) UI; 5) catálogo de dishes nuevo — con `npm test` + `next build` en verde en cada paso.
