# ADR-0002: Postgres vía Supabase como capa de persistencia

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

La primera versión del documento de diseño asumía SQLite como motor de base de datos, pensando en una app local sencilla. Al revisar el diseño, el usuario indicó que prefiere usar Supabase por ser la herramienta que mejor conoce, lo que implica Postgres como motor subyacente.

## Decisión

El sistema usa Postgres gestionado a través de Supabase como única capa de persistencia, en vez de SQLite.

## Alternativas consideradas

- **SQLite**: más simple para una app 100% local de un único usuario, pero el usuario ya tiene experiencia con Supabase y quiere aprovecharla (Auth, API auto-generada, hosting gestionado).

## Consecuencias

- El esquema (sección 4 de `diseno-sistema.md`) se diseña en términos de Postgres (tipos `uuid`, `text`, RLS, etc.), no de SQLite.
- Se habilitan gratis funcionalidades de Supabase: Auth (ver [ADR-0005](0005-supabase-auth-y-rls-desde-el-inicio.md)), API REST/Realtime auto-generada, y un panel de administración para inspeccionar datos sin escribir SQL a mano.
- La fase 2a del roadmap incluye crear un proyecto Supabase real como primer paso.
