# ADR-0014: Supplements con frecuencia no diaria como regla de calendario, sin `dietary_requirement` asociado

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

Un `supplement` puede tener frecuencia diaria o de días fijos de la semana (ej. lunes/miércoles/viernes). El modelo de requisitos (ver [ADR-0010](0010-modelo-unificado-de-dietary-requirement.md)) está pensado para periodos día/semana con acumulados, no para "toca este día concreto sí o sí". Había que decidir si un supplement de días fijos debía generar también un `dietary_requirement` para que el generador "supiera" que ese día toca, o gestionarse aparte.

## Decisión

Los supplements de frecuencia no diaria se gestionan **solo** como una regla de calendario, mediante la tabla `supplement_day` (qué días de la semana toca). No generan ningún `dietary_requirement` asociado; quedan fuera del motor de requisitos/cumplimiento.

## Alternativas consideradas

- **Generar un `dietary_requirement` implícito por cada supplement de días fijos**: unificaría el tratamiento con el resto de reglas nutricionales y lo haría visible en el `requirement_log`, pero mezclaría dos conceptos distintos (una regla de calendario determinista vs. un requisito nutricional con acumulado y margen de tolerancia) en el mismo modelo, complicando la resolución de conflictos de la sección 3.7 sin necesidad real.

## Consecuencias

- El algoritmo de generación (sección 5) trata la aplicación de supplements como un paso aparte ("aplicar supplements correspondientes a cada meal"), no como parte de la resolución de `dietary_requirement`.
- No hay trazabilidad de cumplimiento de supplements en `requirement_log`; si en el futuro hiciera falta (ej. "¿tomé la vitamina C el miércoles?"), se resolvería con `meal_log`, no con el motor de requisitos.
