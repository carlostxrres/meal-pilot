# Estado del proyecto

> Documento vivo: se actualiza cada sesión conforme avanza el trabajo. Para el diseño estable, ver [`diseno-sistema.md`](diseno-sistema.md); para el porqué de cada decisión, [`adrs/`](adrs/README.md).

**Última actualización**: 2026-07-26

## Fase actual

Fase 1 (documento de diseño) completada. Lista para arrancar **fase 2a**.

## Progreso por fase

| Fase | Descripción | Estado |
| --- | --- | --- |
| 1 | Documento de diseño (`diseno-sistema.md`) | ✅ Hecho |
| 2a | Proyecto Supabase base (Auth, convención UUID + RLS) | ⬜ Pendiente |
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

Arrancar fase 2a: crear el proyecto en Supabase y activar Auth.
