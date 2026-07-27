# Architecture Decision Records — comida-diaria

Registro de decisiones de arquitectura del proyecto. Cada ADR es un archivo con estado, contexto, decisión, alternativas consideradas y consecuencias. Una vez aceptado, un ADR no se edita para cambiar la decisión — si una decisión cambia, se crea un ADR nuevo que la sustituye y se marca el antiguo como "Superseded by ADR-00XX".

| ADR | Título |
| --- | --- |
| [0001](0001-alcance-solo-4-meals-diurnos-sin-cenas.md) | Alcance de v1 limitado a 4 meals diurnos, cenas fuera de alcance |
| [0002](0002-postgres-via-supabase-como-persistencia.md) | Postgres vía Supabase como capa de persistencia |
| [0003](0003-esquema-y-codigo-en-ingles.md) | Esquema de base de datos y código en inglés |
| [0004](0004-uuid-como-estrategia-de-ids.md) | UUID como estrategia de claves primarias |
| [0005](0005-supabase-auth-y-rls-desde-el-inicio.md) | Supabase Auth + RLS desde el inicio |
| [0006](0006-valores-nutricionales-como-columnas-en-ingredient.md) | Valores nutricionales como columnas de `ingredient` |
| [0007](0007-categorias-de-ingrediente-como-entidad-abierta.md) | Categorías de ingrediente como entidad abierta |
| [0008](0008-structure-type-de-dish-derivado-no-almacenado.md) | `structure_type` de Dish derivado, no almacenado |
| [0009](0009-meal-con-ventana-horaria-en-vez-de-hora-unica.md) | `meal` con ventana horaria en vez de hora única |
| [0010](0010-modelo-unificado-de-dietary-requirement.md) | Modelo unificado de `dietary_requirement` |
| [0011](0011-requisitos-ligados-a-un-meal-via-meal-id-opcional.md) | Requisitos ligados a un meal vía `meal_id` opcional |
| [0012](0012-tolerance-margin-por-defecto-10-por-ciento.md) | `tolerance_margin` por defecto del 10% |
| [0013](0013-definicion-de-racion-en-gramos.md) | Definición de "ración" en gramos |
| [0014](0014-supplements-no-diarios-como-regla-de-calendario.md) | Supplements no diarios como regla de calendario |
| [0015](0015-fuente-de-datos-nutricionales-api-externa-mas-overrides.md) | Fuente de datos nutricionales: API externa + overrides |
| [0016](0016-monorepo-npm-workspaces-para-compartir-engine-y-data.md) | Monorepo npm workspaces para compartir `engine`/`data` (CLI + web) |
| [0017](0017-requisitos-dieteticos-por-meal-como-mecanismo-principal.md) | Requisitos dietéticos por meal como mecanismo principal, vista "Prepara tu cena" |
| [0018](0018-dish-fija-con-meal-unico.md) | Toda dish es fija y pertenece a exactamente un meal (sustituye a 0008) |

## Cómo añadir un ADR nuevo

1. Copiar la estructura de cualquier ADR existente (Estado / Fecha / Contexto / Decisión / Alternativas consideradas / Consecuencias).
2. Numerar con el siguiente índice de 4 dígitos disponible.
3. Añadir la fila correspondiente a la tabla de arriba.
