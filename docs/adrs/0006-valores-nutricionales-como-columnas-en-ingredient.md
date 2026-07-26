# ADR-0006: Valores nutricionales como columnas de `ingredient`, no como tabla separada

- **Estado**: Aceptada
- **Fecha**: 2026-07-25

## Contexto

Existían dos formas habituales de modelar los valores nutricionales de un ingrediente: (a) una tabla `ingredient` con una columna por nutriente, o (b) un modelo normalizado con tablas `nutrient` (catálogo de nutrientes) e `ingredient_nutrient`/`valor_nutricional` (valor por ingrediente y nutriente). El usuario pidió explícitamente el enfoque (a) por ser más sencillo.

## Decisión

`ingredient` tiene una columna `*_per_100` por cada nutriente trackeado (`kcal_per_100`, `protein_g_per_100`, `vitamin_c_mg_per_100`, etc. — lista cerrada, ver sección 2 de `../diseno-sistema.md`), en vez de un modelo `nutrient` + tabla puente.

## Alternativas consideradas

- **Modelo normalizado (`nutrient` + `ingredient_nutrient`)**: más flexible para añadir nutrientes sin migraciones de esquema y para hacer queries genéricas "dame todos los nutrientes de X", pero añade una tabla puente y una join extra en cada consulta nutricional, para un beneficio que no aporta valor real en un sistema de un único usuario con una lista de nutrientes conocida y estable.

## Consecuencias

- Añadir un nutriente nuevo requiere un `ALTER TABLE ingredient ADD COLUMN` en vez de una simple fila nueva en un catálogo — asumido conscientemente como coste aceptable dado que la lista de nutrientes se espera estable.
- Las queries de "acumulado de un nutriente en un periodo" (sección 3.4 de `diseno-sistema.md`) leen directamente la columna correspondiente de `ingredient`, sin joins adicionales.
- Los requisitos dietéticos de tipo `nutrient` referencian el nutriente por **nombre de columna** (`scope_ref = 'vitamin_c_mg_per_100'`), no por FK a una fila de catálogo — ver sección 3.2.
