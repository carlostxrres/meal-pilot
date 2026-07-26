# comida-diaria

Sistema personal para planificar la parte de la dieta que no implica cocinar (desayuno, snack de media mañana, almuerzo de oficina, snack post-entreno), gestionando inventario, requisitos nutricionales y lista de la compra. Las cenas quedan fuera de alcance a propósito (ver ADR-0001).

Aún no hay código — el proyecto está en fase de diseño (fase 1 del roadmap). Antes de escribir cualquier código, lee `docs/diseno-sistema.md`.

## Dónde está el contexto

- `docs/idea-inicial.md` — la visión original del usuario: normas, entidades, objetivos, en su propia voz. No se reescribe, solo se referencia.
- `docs/diseno-sistema.md` — el diseño formal actual: entidades, modelo de requisitos dietéticos, esquema relacional, algoritmo de generación, roadmap. Es la fuente de verdad del "qué" y el "cómo".
- `docs/adrs/` — el "porqué" de cada decisión de arquitectura (un ADR por decisión, con alternativas consideradas). Antes de proponer cambiar algo ya decidido, revisa si existe un ADR al respecto.
- `docs/status.md` — estado de avance actual del roadmap (qué sub-fase está en curso, qué falta). Se actualiza cada sesión; es el único de estos documentos que cambia con frecuencia.

## Convenciones ya fijadas (no reabrir sin motivo)

- Esquema de base de datos y código: **en inglés** (`ingredient`, `dish`, `meal`, `dietary_requirement`...). La prosa de los documentos de `docs/` se mantiene en español.
- Stack: **Postgres vía Supabase**, con Auth + RLS activado desde el inicio y `uuid` como estrategia de PKs (ver ADR-0002, 0004, 0005).
- Motor de generación de menú: TypeScript/Node (fase 3, aún no implementada).
- Cualquier decisión de arquitectura nueva o que cambie una existente se documenta como ADR nuevo en `docs/adrs/` (no se edita un ADR ya aceptado para cambiar la decisión; se crea uno nuevo que lo sustituye).
