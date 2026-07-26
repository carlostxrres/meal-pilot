# ADR-0011: Requisitos ligados a un meal concreto vía `meal_id` opcional, no una entidad nueva

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

Algunos requisitos nutricionales no son sobre el total del día, sino sobre un meal específico — ej. el snack post-entreno necesita cierta proteína en sí mismo (no como parte de una suma diaria que podría venir de cualquier otro meal), o el almuerzo necesita cierta cantidad de hidratos antes del entreno. El usuario pidió pensar "algo elegante y sencillo" para esto, sin tener claro de antemano la solución.

## Decisión

Se añade un único campo opcional `meal_id` (nullable, FK a `meal`) a la tabla `dietary_requirement` ya existente (ver [ADR-0010](0010-modelo-unificado-de-dietary-requirement.md)). Si es `null`, el requisito se evalúa contra el acumulado de todo el periodo, como siempre. Si no es `null`, el acumulado solo considera lo consumido en las ocurrencias de ese meal dentro del periodo.

## Alternativas consideradas

- **Una entidad `meal_requirement` separada de `dietary_requirement`**: modelaría el concepto de forma más explícita, pero duplicaría toda la maquinaria ya construida (tolerance_margin, strictness, resolución de conflictos, trazabilidad semanal) en un segundo modelo en paralelo, para representar lo que en el fondo es la misma idea con un ámbito más estrecho.

## Consecuencias

- El generador de menús (sección 5), al resolver los huecos de una dish para un meal concreto, filtra los `dietary_requirement` con `meal_id` igual a ese meal, más los globales (`meal_id = null`) que sigan abiertos.
- Toda la lógica de 3.2–3.8 (tolerancia, strictness, resolución de conflictos, trazabilidad) se reutiliza sin cambios; `meal_id` solo acota de dónde sale el `accumulated`.
