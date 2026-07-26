# ADR-0010: Modelo unificado de `dietary_requirement` (ejes ingrediente/nutriente × día/semana)

- **Estado**: Aceptada
- **Fecha**: 2026-07-25

## Contexto

La idea original dejaba explícitamente sin resolver "cómo definir los requisitos dietéticos", señalando dos ejes relevantes: temporal (diario/semanal) y cualitativo (por ingrediente/por nutriente), con mínimos y máximos, y pidiendo que el sistema no fuera determinista. Había que decidir si modelar cada combinación de eje como un tipo de requisito distinto (con sus propias tablas) o con una única estructura genérica.

## Decisión

Existe una única tabla `dietary_requirement` que cruza ambos ejes mediante los campos `scope_type` (`ingredient`/`ingredient_category`/`nutrient`) y `period` (`day`/`week`), más `minimum`/`maximum`, `tolerance_margin` y `strictness` (`mandatory`/`advisory`). Cualquier requisito, sin importar en cuál de las 4 combinaciones caiga, se representa con la misma estructura.

## Alternativas consideradas

- **Una tabla por combinación de ejes** (`daily_ingredient_requirement`, `weekly_nutrient_requirement`, etc.): más explícito por combinación, pero cuadruplica el modelo y el motor de generación tendría que consultar 4 tablas distintas en vez de una sola con un filtro.

## Consecuencias

- El motor de generación y el cálculo de cumplimiento (sección 3.4) solo necesitan razonar sobre una tabla y un procedimiento de acumulado, parametrizado por `scope_type`/`period`.
- Añadir una nueva combinación de eje (si apareciera) no requeriría una tabla nueva, solo una fila nueva con los valores de `scope_type`/`period` adecuados.
- Este modelo genérico es la base sobre la que se apoya también [ADR-0011](0011-requisitos-ligados-a-un-meal-via-meal-id-opcional.md).
