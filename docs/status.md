# Estado del proyecto

> Documento vivo: se actualiza cada sesión conforme avanza el trabajo. Para el diseño estable, ver [`diseno-sistema.md`](diseno-sistema.md); para el porqué de cada decisión, [`adrs/`](adrs/README.md).

**Última actualización**: 2026-07-26

## Fase actual

Fase 2a (proyecto Supabase base) completada. Lista para arrancar **fase 2b** (DDL del esquema).

## Proyecto Supabase

- **Nombre**: `meal-pilot`, org `carlostxrres's Org`, región `eu-central-1` (Frankfurt).
- **Project ref**: `mpcembushoagmskcqajd` (ver `.env`, no versionado — plantilla en `.env.example`).
- **Auth**: email/password activo por defecto (`external_email_enabled = true`, `disable_signup = false`, confirmación por email requerida). No ha hecho falta tocar nada — es el estado por defecto de todo proyecto Supabase nuevo.
- **CLI local**: repo linkado (`supabase link`) contra este proyecto; `supabase/config.toml` scaffoldeado con `supabase init` (aún no se ha hecho `supabase config push` — el `site_url`/`additional_redirect_urls` de ese archivo son placeholders de `localhost` para desarrollo local, hay que revisarlos antes de ir a producción en la fase 4).

## Progreso por fase

| Fase | Descripción | Estado |
| --- | --- | --- |
| 1 | Documento de diseño (`diseno-sistema.md`) | ✅ Hecho |
| 2a | Proyecto Supabase base (Auth, convención UUID + RLS) | ✅ Hecho |
| 2b | DDL del esquema (`supabase/migrations/`) | ⬜ Pendiente |
| 2c | Datos semilla (catálogo de meals/dishes/ingredients/supplements/requisitos) | ⬜ Pendiente |
| 2d | Valores nutricionales reales de los ingredientes semilla | ⬜ Pendiente |
| 3 | Motor de generación de menú diario (TypeScript/Node) | ⬜ Pendiente |
| 4 | Web mobile-first de gestión | ⬜ Pendiente |
| 5 | Usos de IA (opcional, ver sección 8 de `diseno-sistema.md`) | ⬜ Pendiente |

## Decisiones aún abiertas

(copiado de la sección 9 de `diseno-sistema.md` — actualizar ahí primero si se resuelven, y reflejarlo aquí)

- **Valores concretos de los requisitos nuevos**: gramos exactos de proteína en el snack post-entreno, gramos de hidratos en el almuerzo, RDA de vitamina C. Se resolverán como parte de la fase 2c (como placeholders explícitos hasta entonces).
- **Alcance de la fase 5 (IA)**: cuál de las 5 ideas de la sección 8 abordar primero, si alguna. No bloquea nada antes de la fase 5.

## Próximo paso concreto

Arrancar fase 2b: escribir el DDL de las tablas de la sección 4.2 de `diseno-sistema.md` como migración SQL en `supabase/migrations/`.
