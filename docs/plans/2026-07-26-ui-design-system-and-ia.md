# Diseño de interfaz: sistema visual + IA para inventario/compra/registro

> Resultado de una sesión con el skill `interface-design`, inspirada en [`DESIGN.md`](../DESIGN.md) (sistema estilo Nike) pero adaptada al dominio real de esta app — no es un e-commerce de fotografía de producto, es una herramienta personal de rutina diaria.

## Intent

- **Quién**: el propio usuario, mirando el móvil en momentos de baja atención (antes de salir de casa, en la cocina de la oficina, recién salido del entreno). No es una sesión de exploración, es un vistazo rápido para decidir/ejecutar.
- **Qué tiene que lograr**: "qué toca ahora / qué tengo en stock / qué me falta comprar" — ejecución, no exploración.
- **Cómo debe sentirse**: preciso y tranquilo — más ticket de cocina o parte de laboratorio que dashboard SaaS o app de salud gamificada. Encaja con las normas del propio sistema (homogéneo, sin decisiones).

## Exploración de dominio

- **Conceptos**: el tupper con la ración exacta (aguacate 100g), la lata de conserva apilada en despensa, la báscula de cocina, la "poción del entrenador" (cúrcuma+sal+pimienta+creatina), la lista de la compra tachada a mano, el ticket de pedido de cocina, la rotación de proteína semanal.
- **Mundo de color**: papel/tinta casi monocromo (base del DESIGN.md) + **dorado cúrcuma** (único ingrediente con color propio en la rutina real del usuario) + **teal apagado de lata de conserva** (rotación de proteína). Dos acentos, cada uno con significado — no decoración.
- **Signature**: la píldora deja de ser un botón decorativo (como en Nike) y pasa a ser **un medidor con banda de tolerancia** — visualiza `tolerance_margin` real, no un porcentaje plano. Aparece en: la tira de requisitos de "Hoy", el nivel de stock en "Inventario", y (opcional, iteración futura) el indicador de urgencia en "Compra".
- **Defaults rechazados**: sidebar + grid de stat-cards → tab bar inferior + "ticket del día" vertical; iconos redondeados de app de salud → cards planas sin sombra (`radius: 0`); barra de progreso plana → cápsula con banda de tolerancia.

## Tokens (adaptados de `DESIGN.md`, no copiados literalmente)

```
color:
  ink: #111111        # texto primario, headers del ticket
  canvas: #ffffff
  paper: #f5f5f4       # superficie base — tono cálido de papel, no gris frío de retail
  hairline: #d8d5d0    # bordes — tinte cálido a juego con "paper"
  charcoal: #3a3a38    # texto secundario
  mute: #6f6b64        # texto terciario / metadata
  turmeric: #c9861a    # acento 1: ritual diario (poción, suplementos)
  sardine-teal: #2c6e6b # acento 2: rotación de proteína / pescado
  success: #3f7d5c     # dentro de rango (desaturado, no el verde vivo de Nike)
  off: #b3453c         # fuera de rango (desaturado)

spacing: 4 / 8 / 12 / 16 / 24 / 32 / 48   # base 8px, igual que DESIGN.md

radius:
  none: 0px    # cards, filas de ticket — "papel", esquinas rectas
  pill: 9999px # SOLO en las cápsulas-medidor y controles de acción

typography:
  ticket-header: uppercase, bold, tight line-height (~1.05), ~22-26px
    # "DESAYUNO EN CASA" — el único momento tipográfico "con voz" del sistema
  data-mono: monospace, tabular-nums   # cantidades en gramos/ml — lectura de báscula
  body: sans regular
  label: sans medium, ~13-14px

depth: solo bordes (hairline), sin sombras — dense tool, no premium card feel
```

## Información / navegación

**Tab bar inferior con 3 secciones** (mobile-first, sin sidebar):

1. **Hoy** (pantalla tras login, sustituye a la actual `/`): el "ticket" del día — los 4 meals con su dish resuelta, cada uno confirmable (checkbox Radix). Debajo/encima, la tira de cápsulas de tolerancia de los 5 `dietary_requirement` (sustituye al listado ✓/✗ actual).
2. **Inventario**: ingredientes agrupados por `storage_type` (despensa/nevera/congelador), cantidad editable inline (Radix Dialog para el editor de cantidad).
3. **Compra**: derivada (no editable a mano) — ingredientes bajo umbral + los que hacen falta para un `dietary_requirement` mandatory pendiente. Se tachan con Radix Checkbox.

**Relación entre pantallas**:
- Inventario es la fuente de verdad → determina qué puede generar "Hoy" y qué aparece en "Compra".
- Confirmar un meal en "Hoy" escribe en `meal_log` (solo sí/no en este v1, sin editar desviaciones) y eso alimenta `requirement_log`.
- Tachar en "Compra" marca el ítem como comprado **y actualiza el inventario automáticamente** con una cantidad de reposición estimada (editable después en "Inventario" si no cuadra).

## Radix UI: qué primitivo para qué

- `Checkbox` — confirmar meal, tachar ítem de compra.
- `Dialog` — editar cantidad de un ingrediente en Inventario.
- `Tabs` — no para la navegación principal (esa es la tab bar custom de 3 iconos); solo si aparece alguna subvista con pestañas internas más adelante.
- Cápsula con banda de tolerancia — **no existe en Radix**, componente propio con `role="meter"` para accesibilidad.

## Pendiente antes de implementar

- Los tokens actuales de `apps/web/app/globals.css` (`--bg`, `--fg`, `--muted`...) son genéricos — se renombran a los tokens de este sistema (`--ink`, `--paper`, `--turmeric`...) al implementar, no se mantienen en paralelo.
- Cantidad de reposición estimada al tachar en Compra: usar la `quantity` (o `quantity_max`) del `dish_ingredient` correspondiente como estimación por defecto — afinar durante la implementación.
