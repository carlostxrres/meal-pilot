# ADR-0015: Fuente de datos nutricionales: API externa + capa de normalización + overrides manuales

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

Cada `ingredient` necesita valores nutricionales reales (`*_per_100`, ver [ADR-0006](0006-valores-nutricionales-como-columnas-en-ingredient.md)). Había que decidir si el usuario los introduce siempre a mano, o si el sistema se apoya en una fuente externa.

## Decisión

Los valores nutricionales por defecto se obtienen consultando una API/base de datos nutricional externa (ej. USDA, OpenFoodFacts), a través de una capa de normalización propia que hace de *decoupling* entre el formato de cada fuente externa y las columnas `*_per_100` del esquema. El usuario puede sobreescribir cualquier valor para un ingrediente concreto, o añadir ingredientes que no existan en la fuente externa; esos overrides/altas manuales tienen siempre prioridad sobre lo que traiga la API.

## Alternativas consideradas

- **Todo manual**: sin dependencias externas ni ambigüedad de mapeo, pero mucho trabajo repetitivo para poblar valores nutricionales que ya existen en fuentes públicas de calidad.
- **Solo API externa, sin overrides**: más automático, pero no cubriría ingredientes caseros/de marca no presentes en la fuente externa, ni permitiría corregir valores que el usuario sepa que son más precisos para su caso concreto.

## Consecuencias

- Se necesita una capa de normalización (probablemente parte de la fase 3, el motor en TypeScript/Node) que traduzca la respuesta de la fuente externa elegida al esquema de `ingredient`.
- Los datos semilla de la fase 2c pueden arrancar con valores introducidos a mano para el catálogo inicial conocido (sardinas, aguacate, atún, etc.) sin esperar a que la integración con la API esté construida — ver [ADR-0002](0002-postgres-via-supabase-como-persistencia.md) y el roadmap (fase 2d).
- La elección de la API externa concreta (USDA vs OpenFoodFacts vs otra) queda abierta hasta la fase de integración; no bloquea el esquema ni los datos semilla.
