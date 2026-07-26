# ADR-0007: Categorías de ingrediente como entidad abierta y editable por el usuario

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

Las categorías de ingrediente (ej. las 5 de la ensalada: Fibra y vitaminas, Proteína, Hidratos, Grasa, Aliños) son necesarias para resolver comidas flexibles. Había que decidir si son una lista cerrada y fija (solo esas 5, gestionadas como dato semilla) o una entidad que el usuario puede ampliar al diseñar futuras comidas flexibles.

## Decisión

`ingredient_category` es una entidad abierta: el usuario podrá crear categorías nuevas conforme diseñe nuevas dishes flexibles, no solo las 5 iniciales de la ensalada.

## Alternativas consideradas

- **Lista cerrada y fija**: más simple (solo dato semilla, sin necesidad de UI de gestión), pero limitaría al usuario a las categorías previstas hoy si en el futuro diseña una comida flexible nueva con categorías distintas.

## Consecuencias

- `ingredient_category` necesita, en algún momento (fase 4, la web de gestión), una UI mínima de alta/edición — no puede vivir solo en datos semilla para siempre.
- La relación `ingredient_category_link` (N:M) debe soportar añadir categorías nuevas sin migración de esquema, solo con filas nuevas.
