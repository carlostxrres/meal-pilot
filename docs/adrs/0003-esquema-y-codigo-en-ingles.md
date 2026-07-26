# ADR-0003: Esquema de base de datos y código en inglés

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

La primera versión del glosario de entidades usaba nombres de tabla y campo en español (`ingrediente`, `comida`, `unidad_base`, `caducidad_una_vez_abierto_dias`...). El usuario pidió que tanto el código como la base de datos (tablas y columnas) estén en inglés, que es el idioma en el que se implementará todo.

## Decisión

Todos los identificadores técnicos (nombres de tabla, columna, enum, función) se definen en inglés: `ingredient`, `dish`, `meal`, `base_unit`, `dietary_requirement`, etc. La prosa explicativa del documento de diseño se mantiene en español, ya que es para consumo humano del propio usuario.

## Alternativas consideradas

- **Todo en español**: descartado explícitamente por el usuario, quiere el código en inglés (convención habitual en desarrollo de software, más fácil de integrar con librerías/herramientas externas en inglés).
- **Mezcla ad-hoc** (como estaba parcialmente antes, con `Meal` en inglés y el resto en español): descartado por inconsistente.

## Consecuencias

- Cualquier entidad nueva que se añada al esquema debe nombrarse en inglés desde el principio, no traducirse después.
- El glosario de `diseno-sistema.md` (sección 2) sirve como diccionario español↔inglés de facto: la prosa explica en español qué es cada entidad, pero la tabla de campos ya usa los nombres reales en inglés.
