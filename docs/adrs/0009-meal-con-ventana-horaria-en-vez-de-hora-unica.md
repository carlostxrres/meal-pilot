# ADR-0009: `meal` con ventana horaria (`usual_start_time`/`usual_end_time`) en vez de una hora única

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

La primera versión modelaba el horario habitual de un `meal` como un único campo `hora_habitual` (ej. 08:00). El usuario indicó que en la práctica cada meal ocupa un rango de tiempo (ej. "entre las 08:00 y las 08:10"), no un instante puntual, y que el modelo debería reflejarlo así.

## Decisión

`meal` tiene dos columnas, `usual_start_time` y `usual_end_time` (tipo `time`), en vez de una única `hora_habitual`.

## Alternativas consideradas

- **Hora única + duración**: equivalente en información (`start_time` + `duration` = `end_time`), pero se prefirió el par de horas explícito por ser más directo de leer y de comparar contra el reloj real ("¿ya pasó la ventana de este meal?").

## Consecuencias

- El catálogo semilla de los 4 meals (sección 2 de `diseno-sistema.md`) define ambos extremos para cada meal, no un instante.
- El algoritmo de generación (sección 5) puede usar la ventana completa para decidir si aún hay tiempo de preparación disponible, en vez de solo comparar contra un instante exacto.
