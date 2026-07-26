# ADR-0005: Supabase Auth + RLS desde el inicio, pese a ser un sistema de un único usuario

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

El sistema es, hoy, de un único usuario (el propio dueño del proyecto). Había que decidir si modelar el acceso a datos de forma simplificada (sin autenticación, usando directamente una service role key) o adoptar desde ya el modelo estándar de Supabase con Auth y Row Level Security (RLS).

## Decisión

Se usa Supabase Auth (un usuario real en `auth.users`) y RLS activado en todas las tablas de datos, cada una con una columna `owner_id uuid references auth.users` y una policy `owner_id = auth.uid()` para todas las operaciones.

## Alternativas consideradas

- **Single-user sin RLS, con service role key**: más simple de arrancar (no hay que gestionar login ni `owner_id`), pero obligaría a una migración de esquema (añadir `owner_id` a todas las tablas, activar RLS, reescribir policies) el día en que se acceda desde varios dispositivos o se comparta el sistema con alguien más.

## Consecuencias

- Todas las tablas de datos (no las de solo-lectura/catálogo si se decidiera compartirlas) llevan `owner_id`, aunque en la práctica hoy sea siempre el mismo valor.
- La fase 2a del roadmap incluye configurar Auth (email/password o magic link) desde el primer momento, no como algo añadido después.
- Cualquier cliente (web, futuras apps) debe autenticarse contra Supabase Auth para poder leer/escribir datos — no hay acceso anónimo a los datos personales del usuario.
