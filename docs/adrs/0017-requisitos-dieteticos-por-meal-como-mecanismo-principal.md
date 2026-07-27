# ADR-0017: Requisitos dietéticos por meal como mecanismo principal, y vista diaria orientada a la cena

- **Estado**: Aceptada
- **Fecha**: 2026-07-27

## Contexto

Hasta ahora los requisitos nutricionales vivían sobre todo a nivel de día completo (`meal_id = null`), y el caso "requisito acotado a un meal" era la excepción ([ADR-0011](0011-requisitos-ligados-a-un-meal-via-meal-id-opcional.md)). Eso tenía dos fricciones documentadas en `status.md`: los objetivos de día completo (kcal, proteína) nunca se alcanzan solo con las 4 comidas diurnas — el hueco lo cubre la cena, que está fuera de alcance por diseño ([ADR-0001](0001-alcance-solo-4-meals-diurnos-sin-cenas.md)) — y el generador debía resolver huecos flexibles intentando acercarse a requisitos diarios que ninguna combinación diurna puede cerrar.

El usuario definió ventanas nutricionales concretas (mín/máx de energía, grasas, saturadas, hidratos, azúcares, fibra, proteína y sal) para cada uno de los 4 meals.

## Decisión

Cada meal tiene su propio conjunto de requisitos nutricionales, cargados como filas de `dietary_requirement` con `meal_id` no nulo (`scope_type = nutrient`, `period = day`, mandatory) — el mecanismo del ADR-0011 pasa de excepción a mecanismo principal, sin cambio de esquema. La sal se almacena como sodio (1 g sal ≈ 400 mg sodio).

Los requisitos globales diarios (`meal_id = null`) se conservan, pero su UI cambia de sentido: en vez de una sección "Requisitos diarios" que casi nunca puede llegar al 100%, la vista "Hoy" muestra **"Prepara tu cena"** — el residuo `objetivo − suma de las 4 dishes del día` por cada requisito global diario, es decir, lo que la cena debe aportar. Los requisitos semanales de ingrediente (sardinas, atún) no cambian.

## Alternativas consideradas

- **Columnas de ventana nutricional en la tabla `meal`**: más directo de consultar, pero duplicaría el modelo de requisitos (tolerancia, strictness, trazabilidad) que `dietary_requirement` ya resuelve, exactamente el motivo por el que ADR-0011 descartó una entidad paralela.
- **Extender el alcance a la cena para poder cerrar los objetivos diarios dentro de la app**: contradice ADR-0001; la cena sigue fuera — la app solo informa del objetivo que le queda.

## Consecuencias

- Se cargan ~32 requisitos nuevos (8 nutrientes × 4 meals); el requisito semilla "proteína post-entreno ≥ 35 g" se retira, sustituido por la ventana 25–35 g del nuevo set.
- El motor calcula un "residuo del día" como salida adicional; la sección "Requisitos diarios" de la web se sustituye por "Prepara tu cena".
- Combinado con [ADR-0018](0018-dish-fija-con-meal-unico.md), los requisitos por meal se cumplen por construcción de las dishes, no por filtrado en generación.
