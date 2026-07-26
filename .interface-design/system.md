# comida-diaria — interface system

Fuente completa (intent, exploración de dominio, razonamiento): [`docs/plans/2026-07-26-ui-design-system-and-ia.md`](../docs/plans/2026-07-26-ui-design-system-and-ia.md). Inspirado en [`docs/DESIGN.md`](../docs/DESIGN.md) (Nike), adaptado al dominio real de la app.

## Direction

Ticket de cocina / parte de laboratorio — preciso y tranquilo, no dashboard SaaS ni app de salud gamificada. Un único usuario, vistazos rápidos y de baja atención (antes de salir de casa, en la oficina, tras entrenar). Ejecución, no exploración.

## Depth

Solo bordes (`hairline`), sin sombras. Cards planas (`radius: none`), como papel.

## Spacing

Base 8px: `4 / 8 / 12 / 16 / 24 / 32 / 48`.

## Color tokens

```
ink: #111111        # texto primario, headers del ticket
canvas: #ffffff
paper: #f5f5f4       # superficie base (cálido, no gris frío de retail)
hairline: #d8d5d0
charcoal: #3a3a38    # texto secundario
mute: #6f6b64        # texto terciario / metadata
turmeric: #c9861a    # acento 1 — ritual diario (suplementos)
sardine-teal: #2c6e6b # acento 2 — rotación de proteína
success: #3f7d5c     # dentro de rango (desaturado)
off: #b3453c         # fuera de rango (desaturado)
```

Dos acentos, cada uno con significado fijo — no se usan como color decorativo genérico.

## Typography

- `ticket-header`: uppercase, bold, line-height ~1.05, ~22-26px. Único momento "con voz" del sistema (nombres de meal). No usar para nada más.
- `data-mono`: monospace, tabular-nums. Toda cantidad en gramos/ml/unidades.
- `body`: sans regular.
- `label`: sans medium, ~13-14px.

## Radius

- `none` (0px): cards, filas — todo excepto lo de abajo.
- `pill` (9999px): **solo** en las cápsulas-medidor y controles de acción explícitos.

## Signature component: cápsula con banda de tolerancia

Sustituye a cualquier barra de progreso plana. Muestra `effectiveMinimum`/`effectiveMaximum` (de `tolerance_margin`) como banda, no solo un valor actual vs. 100%. `role="meter"`. Se usa en: tira de requisitos de "Hoy", nivel de stock en "Inventario".

## IA / navegación

Tab bar inferior, 3 secciones (no sidebar — mobile-first):
1. **Hoy** (`/`) — ticket del día + cápsulas de requisitos. Confirmar meal = Radix Checkbox → escribe en `meal_log`.
2. **Inventario** (`/inventory`) — ingredientes agrupados por `storage_type`, edición vía Radix Dialog.
3. **Compra** (`/shopping`) — derivada (stock agotado + necesario para requisito mandatory pendiente), nunca editable a mano. Tachar (Radix Checkbox) repone inventario automáticamente con una cantidad estimada — no existe tabla `shopping_list`, es 100% derivada.

## Radix UI usage

- `Checkbox` — confirmar meal, tachar compra.
- `Dialog` — editar cantidad de inventario.
- No `Tabs` de Radix para la nav principal (tab bar custom); reservar `Tabs` para subvistas futuras si aparecen.

## Reglas

- Nunca mezclar `radius: pill` fuera de medidores/acciones — si algo nuevo "quiere" ser pill, preguntar primero si es realmente una acción/medidor o si debería ser `radius: none`.
- Los dos acentos (`turmeric`, `sardine-teal`) no se reutilizan para otro significado sin actualizar este documento.
- Antes de añadir un tercer acento de color, preguntar — el sistema depende de que sean escasos.
