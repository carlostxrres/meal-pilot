# ADR-0004: UUID como estrategia de claves primarias

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

El documento de diseño dejaba las PKs como "int/uuid" sin decidir. Al pasar a Postgres/Supabase (ver [ADR-0002](0002-postgres-via-supabase-como-persistencia.md)) hacía falta cerrar esto antes de poder escribir el DDL real de la fase 2b.

## Decisión

Todas las claves primarias son `uuid`, generadas con `default gen_random_uuid()`, en vez de enteros autoincrementales (`serial`/`bigint`).

## Alternativas consideradas

- **`bigint`/`serial`**: IDs numéricos más fáciles de leer y depurar a mano en el editor de Supabase, pero menos idiomático en el ecosistema Supabase y peor si en el futuro hay sincronización offline (ej. app móvil) donde generar IDs sin colisión sin ida y vuelta al servidor importa.

## Consecuencias

- Todas las FKs del esquema (sección 4.2 de `diseno-sistema.md`) son de tipo `uuid`.
- Encaja de forma natural con `auth.users.id` (también `uuid`), necesario para las columnas `owner_id` de [ADR-0005](0005-supabase-auth-y-rls-desde-el-inicio.md).
- Los IDs no son legibles a simple vista en herramientas de depuración manual; se compensa con los campos `name`/`description` de cada tabla para identificación humana.
