# ADR-0008: `structure_type` de Dish derivado, no almacenado

- **Estado**: Superseded by [ADR-0018](0018-dish-fija-con-meal-unico.md)
- **Fecha**: 2026-07-26

## Contexto

Cada `dish` (bocadillo, ensalada...) es de tipo fija, flexible o semiflexible, según tenga todos, ninguno, o algunos de sus `dish_ingredient` marcados como `required = true`. La primera versión del diseño guardaba esto como una columna `structure_type` propia en `dish`. El usuario señaló que esa columna es redundante: el dato ya está implícito en las filas de `dish_ingredient`.

## Decisión

`dish` no tiene columna `structure_type`. El tipo (fija/flexible/semiflexible) se calcula a partir de `dish_ingredient.required` para esa `dish_id`: ninguna obligatoria → flexible; todas obligatorias → fija; mezcla → semiflexible.

## Alternativas consideradas

- **Columna `structure_type` almacenada**: evita calcularlo en cada consulta, pero introduce un dato derivado que puede desincronizarse del contenido real de `dish_ingredient` si alguien edita los componentes sin actualizar también la columna.

## Consecuencias

- Nunca hay riesgo de inconsistencia entre `structure_type` y los componentes reales de la dish, porque no existe tal columna.
- El motor de generación (sección 5) y cualquier UI que necesite mostrar el tipo deben calcularlo con una query o una vista (`view`) sobre `dish_ingredient`, en vez de leer un campo directo.
