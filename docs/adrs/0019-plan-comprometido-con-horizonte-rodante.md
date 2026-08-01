# ADR-0019: El plan de comidas es un compromiso persistido, con horizonte rodante de 3 días

- **Estado**: Aceptada
- **Fecha**: 2026-08-01

## Contexto

Hasta ahora el plan de comidas no se persiste en ninguna tabla: se regenera entero en cada render de `/` y `/shopping` (`generateProposalsForDates` → `generateMultiDayPlan`). Es una **opinión momentánea**, no un compromiso. Como el inventario es una de las entradas de la puntuación (`scoreIngredient`, término `inStock`), y comprar escribe en el inventario (`markPurchasedAction` → `addToHomeInventory`), el sistema tiene un bucle de retroalimentación:

```
plan ──deriva──> lista de la compra ──comprar──> inventario ──puntúa──> plan
```

El síntoma que lo destapó: **al marcar cosas como compradas, las comidas planeadas cambian**. El usuario compra exactamente lo que el sistema le pide para unas comidas concretas y, al volver, esas comidas ya no son las mismas. Eso rompe de raíz las dos frases que definen el producto en `idea-inicial.md` (sección "Integrar todo el ciclo de la alimentación"): *"abro la nevera y tengo todo lo necesario"* y *"compro lo que el sistema me dice, sin ni siquiera tener que saber para qué receta es"*.

Ninguna de las dos se puede sostener sobre un plan que se recalcula: la primera exige que lo prometido ayer siga en pie hoy; la segunda exige que la compra sea la contrapartida de un plan que no se va a mover. `diseno-sistema.md` no cubría el asunto (su sección 5 decía "para cada día a planificar", sin decir cuántos días ni cuándo), y `PLANNING_HORIZON_DAYS = 3` era una constante suelta en `packages/core/src/data/multiDay.ts` sin ADR que la respaldara. Este ADR cubre ese hueco.

Hay además un problema de fondo que este ADR **no** resuelve por sí solo y que se decide en el [ADR-0020](0020-funcion-objetivo-con-terminos-que-compiten.md): el motor no simula consumo, así que los mismos 200 g de atún "cubren" los tres días del horizonte. Congelar un plan sin simular consumo congelaría un plan inviable. Los dos ADRs son necesarios juntos.

## Decisión

**El contrato**: lo que el sistema dice que comerás en los próximos días es un compromiso; la lista de la compra es exactamente lo que falta para cumplirlo; **comprar nunca cambia el compromiso**.

Consecuencia directa y deseada: la lista de la compra pasa a ser el **mecanismo de reparación** del sistema. Cualquier divergencia del inventario (se estropeó algo, te lo comiste sin registrarlo, vaciaste una balda) aparece como ítem de compra — nunca como un cambio del plan.

### Persistencia

Tabla nueva **`planned_meal`**: `id`, `owner_id`, `date`, `meal_id`, `dish_id` (**nullable**), `dish_name`, `unresolved_reason text`, `components jsonb`, `generated_at`, con `unique (owner_id, date, meal_id)` y policy RLS directa `owner_id = auth.uid()` (patrón de [ADR-0005](0005-supabase-auth-y-rls-desde-el-inicio.md); la capa de datos nunca filtra por `owner_id`, confía en RLS).

**`ON DELETE SET NULL` en la FK a `dish`**, junto con congelar `dish_name` además de `components`: borrar un plato del catálogo no debe costar historia. Borrar ocurre de verdad — ya han hecho falta dos migraciones de limpieza (`remove_uneasy_ingredients`, `remove_granada_tofu_edamame`) — y con `CASCADE` cada limpieza reescribiría el pasado en silencio, mientras que con `RESTRICT` el catálogo acumularía fósiles imposibles de retirar. Con `SET NULL` + nombre congelado, un día pasado sigue diciendo qué comiste aunque ese plato ya no exista. La duplicación de `dish_name` es el precio, y es barato.

- **`dish_id` nullable no es opcional**: `resolveMeal` puede devolver `resolved: null` con un `unresolvedReason` (sin candidatas, o todas violan un techo mandatory). Con `NOT NULL` ese slot no se podría persistir, el trigger de "hueco" lo reintentaría en cada render, volvería a fallar, y **el día no llegaría a comprometerse nunca**. La regla es: *la presencia de filas para una fecha significa que ese día está comprometido*, tenga o no plato cada slot.
- **`components jsonb` congela los componentes y cantidades** de la dish en el momento de comprometer. Resuelve de una vez tres problemas: editar un plato después de comprometerlo no altera lo ya prometido ni lo que hay que comprar; el descuento de inventario del [ADR-0021](0021-confirmar-comida-descuenta-inventario.md) es reversible con exactitud aunque el plato se edite entremedias; y `updateDish` (que borra y reinserta todos los `dish_ingredient`) deja de ser peligroso para el historial.

`planned_meal` es el **compromiso**; `meal_log` sigue siendo el **hecho** (lo que el usuario confirmó haber comido). Para evitar el doble conteo en diversidad y acumulados, la regla de lectura es: **para cada `(date, meal_id)` manda `meal_log` si existe; si no, `planned_meal`**. *(Refinada a cuatro vías por el [ADR-0022](0022-historial-de-comidas-editable-y-repaso-guiado.md), que añade los estados "comí fuera" y "no comí".)*

### Horizonte y disparo

- **Horizonte comprometido rodante de 3 días** (hoy + 2). Se conserva `PLANNING_HORIZON_DAYS`, ahora con la semántica explícita de *horizonte comprometido*. La lista de la compra cubre exactamente ese horizonte, por construcción — es la misma ventana, no dos configuraciones que puedan divergir.
- **Roll-forward perezoso**: al cargar `/` o `/shopping` se generan solo los `(date, meal_id)` que falten, encadenados detrás de los días ya comprometidos. Sin cron ni infraestructura nueva. Al pasar el día entra un día nuevo por el extremo y hoy/mañana no se tocan.
- **Triggers de (re)generación — lista cerrada**:
  - (a) **hueco**: no existe fila para ese `(date, meal_id)`;
  - (b) **acción explícita del usuario**: cambiar un plato, regenerar un día, regenerar todo el horizonte;
  - (c) **reparación por inviabilidad**: el compromiso ha dejado de poder servirse (plato desactivado o borrado, ingrediente borrado, requisito nuevo que lo invalida).
- **No regeneran nada**: marcar comprado, editar inventario a mano, confirmar un meal. Son exactamente las acciones que hoy causan el síntoma.
- **Excepción nombrada al "los días comprometidos no se regeneran"**: solo el trigger (c) puede tocar un día ya comprometido, y **solo hacia adelante**. Cambiar el plato del día D obliga a **revalidar el sufijo [D+1..fin]** contra `violatesMandatoryMaximum`, porque el acumulado encadenado de esos días se calculó sobre un prefijo distinto; si el sufijo deja de ser válido, se repara y se avisa. Sin esta regla, cambiar un plato podría hacer que el horizonte supere un techo semanal sin que nadie lo detecte.
- **"Cambiar plato" = elegir la mejor candidata distinta de la actual.** No se re-siembra el PRNG: evita tener que inventar una semilla estable para regeneraciones parciales, y es lo que el usuario espera al pulsar ("dame otra cosa").
- **Los días pasados no se regeneran nunca.** El roll-forward solo mira fechas ≥ hoy; lo que sale de la ventana queda como histórico (plan comprometido vs. lo realmente comido). *Precisión del [ADR-0022](0022-historial-de-comidas-editable-y-repaso-guiado.md): inmutable para el **sistema**, no para el usuario — el `planned_meal` pasado nunca se reescribe, pero el usuario sí puede corregir el registro de lo que comió, y eso se escribe en `meal_log`.*

### Acumulados y diversidad al generar de forma perezosa

- **El acumulado semanal se siembra replayando `planned_meal` + `meal_log` desde `weekPeriodStart`**, no desde `contexts[0]`. Hoy `generateMultiDayPlan` lo siembra desde `requirement_log`, **que ninguna línea del repo escribe**. Eso es tolerable mientras los 3 días se regeneran juntos, pero con ventana rodante y generación perezosa el día nuevo se encadena detrás de 2 días comprometidos, no detrás del inicio de la semana (que puede estar hasta 6 días atrás). Sin el replay, un requisito `period = week` con techo **se resetearía de facto cada día que rueda la ventana** y el filtro mandatory quedaría peor que ahora. `requirement_log` sigue sin usarse: el replay es la fuente, y no se introduce una segunda verdad.
- **La diversidad se siembra también desde `planned_meal`.** `getRecentlyUsedIngredientIds` lee solo `meal_log`; hoy funciona porque los 3 días se generan juntos y la rotación intra-ventana la lleva un acumulador en memoria dentro de `generateMultiDayPlan`. Al generar un solo día ese acumulador desaparece, y con él la propiedad que motivó el plan encadenado.

### Precondiciones

- **Arreglar la zona horaria de `upcomingDates` antes de la primera escritura.** Hoy parte de un instante local y lo formatea en UTC (`toISOString().slice(0, 10)`; el mismo patrón está en `apps/cli/src/cli.ts`). En Europe/Madrid, entre medianoche y las 01:00/02:00, "hoy" es ayer. Mientras el plan es efímero eso es cosmético; con el plan persistido pasa a **comprometer el día equivocado**, y arreglarlo después movería la fecha bajo datos ya escritos.
- **El CLI pasa a solo lectura.** Usa `service_role` sin sesión, así que no puede escribir filas con un `owner_id` coherente.

### Escritura durante el render de un Server Component

Se acepta (el roll-forward convierte un GET en escritura), con dos reglas:

- Upsert `on conflict do nothing` + **releer y pintar lo leído, nunca lo generado en memoria**: el render que pierde la carrera tendría en pantalla un plan distinto del persistido.
- No se puede llamar `revalidatePath` durante el render, así que crear un día desde `/` no invalida `/shopping`: las dos vistas pueden ir desincronizadas un instante. Es el riesgo que el comentario de `multiDay.ts` pedía evitar, y se asume a cambio de no montar un cron.

## Alternativas consideradas

- **Statu quo efímero**: el plan es siempre coherente con el estado actual y no hay esquema nuevo. Es exactamente lo que produce el bug reportado, y hace imposible el contrato de la compra.
- **Congelar el inventario de entrada en vez del plan** (guardar el snapshot de stock con el que se generó y regenerar a partir de él): mantiene el plan derivado, pero persiste bastantes más datos que el propio plan y no evita que el resultado cambie si cambia el catálogo. Más máquina, menos garantía.
- **Horizonte de compromiso de 7 días mostrando 3**: la lista de la compra llegaría a cero y se quedaría ahí varios días, que es el momento más satisfactorio posible. Descartado por ahora: con 4–6 platos por meal, 7 días comprometidos se ven repetitivos, y lo fresco (`storage_type = fridge`) no se compra con 7 días de antelación. El horizonte es una constante: subirlo más adelante es barato.
- **Ciclo de compra explícito** (el usuario pulsa "voy a comprar" y el sistema congela un bloque hasta la siguiente compra): lo más fiel a "sentirse cubierto", y probablemente el destino final. Descartado ahora por añadir un concepto nuevo al modelo (la cadencia de compra) antes de haber validado el compromiso.
- **Reutilizar `meal_log` con `confirmed = false` como "planificado"**: sin tabla nueva. Descartado: conflaría compromiso y hecho en una sola fila, y `getRecentlyUsedIngredientIds` empezaría a contar como "ya comido" comidas futuras.

## Consecuencias

- La lista de la compra se vuelve estable dentro del día y deja de contradecirse a sí misma. A cambio, con el horizonte rodante **casi nunca queda vacía del todo**: cada día entra un día nuevo con su necesidad marginal. Es pequeña, pero el "ya no tienes que comprar nada en días" solo llega con el horizonte de 7 o con el ciclo explícito.
- `computeDinnerTargets` consume `proposal.requirementStatuses`, hoy un subproducto de generar. Con el plan persistido hay que **recalcular los statuses al leer** (replayando los platos comprometidos con el prefijo semanal correcto), o "Prepara tu cena" ([ADR-0017](0017-requisitos-dieteticos-por-meal-como-mecanismo-principal.md)) mostraría el residuo de la última generación y no el del plan vigente.
- `checkDishCompliance` filtra por `req.meal_id === resolved.dish.meal_id`, pero `updateDish` permite cambiar el `meal_id` de un plato. Un `planned_meal` comprometido puede quedar apuntando a un plato que ya pertenece a otro meal: se pintaría bajo el slot comprometido y se validaría contra la ventana del meal nuevo, así que el chip de cumplimiento mentiría. Hoy es imposible porque la generación refiltra candidatas en cada render. Es un caso del trigger (c).
- Los tests del motor que asumen "generar los 3 días de una vez" (`multiDay.test.ts`) pasan a necesitar el caso "generar 1 día encadenado detrás de 2 comprometidos", que es el camino real a partir de ahora.
- `docs/status.md` deja de poder afirmar que el motor no escribe en base de datos.
- **Fuera de alcance, anotado como limitación conocida**: historial/undo del plan (por qué se eligió X, revertir una regeneración); congelar la lista de la compra mientras dura una sesión de compra (hoy `ShoppingList` es optimista y una fila puede cambiar de cantidad si la ventana rueda mientras estás en el súper); y la brecha ración/envase de [ADR-0013](0013-definicion-de-racion-en-gramos.md), que sigue haciendo que comprar el déficit exacto (70 g) no se parezca a comprar una lata (120 g).
