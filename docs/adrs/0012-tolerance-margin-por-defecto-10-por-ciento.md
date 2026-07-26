# ADR-0012: `tolerance_margin` por defecto del 10%

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

Cada `dietary_requirement` lleva un `tolerance_margin` porque el sistema no debe exigir exactitud (norma explícita de la idea original: "el sistema no debería ser determinista"). Faltaba fijar un valor por defecto razonable para no tener que definirlo requisito a requisito desde el primer día de datos semilla.

## Decisión

El valor por defecto de `tolerance_margin` es **10%**, aplicado como `effective_minimum = minimum * (1 - 0.10)` y `effective_maximum = maximum * (1 + 0.10)` salvo que se indique otro valor explícito para un requisito concreto.

## Alternativas consideradas

- **Sin valor por defecto (obligar a definirlo siempre)**: más explícito, pero añade fricción a la hora de cargar datos semilla o crear requisitos nuevos, para un caso donde el 10% es una elección razonable en la inmensa mayoría de casos.

## Consecuencias

- Los requisitos nuevos pueden omitir `tolerance_margin` en los datos semilla y heredar el 10% salvo que se decida ajustarlo caso a caso.
- Si un requisito concreto necesita ser más estricto (ej. 0% de margen) o más laxo, se fija explícitamente en su fila, sobreescribiendo el default.
