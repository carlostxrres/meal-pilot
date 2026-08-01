# ADR-0022: Historial de comidas editable y repaso guiado de días pendientes

- **Estado**: Aceptada (amplía [ADR-0021](0021-confirmar-comida-descuenta-inventario.md), refina la regla de resolución de [ADR-0019](0019-plan-comprometido-con-horizonte-rodante.md))
- **Fecha**: 2026-08-01

## Contexto

El [ADR-0021](0021-confirmar-comida-descuenta-inventario.md) dejó dos cosas fuera de alcance y señaló una de ellas como el hueco que más presionaba: **no se puede confirmar un día pasado** (el checkbox solo se pinta si el día es hoy), así que una confirmación olvidada deja comida consumida contando como stock indefinidamente. Con el descuento automático activo y con la simulación de consumo del [ADR-0020](0020-funcion-objetivo-con-terminos-que-compiten.md), ese error deja de ser cosmético: decide platos y decide compras.

La otra pieza fuera de alcance era registrar que se comió algo distinto de lo planificado. El usuario pide ahora las dos, más poder consultar el historial.

Dos observaciones sobre el estado actual hacen que esto sea más barato de lo que parece:

- **`meal_log.confirmed` está muerto.** La columna existe (`not null default false`) pero solo puede valer `true`: `setMealConfirmed` borra la fila al desconfirmar, así que "no lo comí" y "no he contestado" son hoy el mismo estado. Poder desmentir le da sentido por primera vez.
- **El historial ya existe** desde el ADR-0019: los `planned_meal` pasados no se borran. El historial es la comparación entre el **compromiso** (`planned_meal`) y el **hecho** (`meal_log`) — no hace falta ninguna tabla nueva para responder "¿cuánto me desvío del plan?".

## Decisión

### El registro pasa a tener tres respuestas posibles

Se amplía `meal_log`: `dish_id` pasa a **nullable**, se añaden `dish_name` y `description text`, y se añade el `unique (owner_id, date, meal_id)` que hoy falta (`setMealConfirmed` lo compensa a mano borrando antes de insertar). La FK a `dish` pasa a `ON DELETE SET NULL` con el nombre congelado, igual que en `planned_meal` (ADR-0019): borrar un plato del catálogo no borra la historia de haberlo comido. Combinaciones válidas, con un CHECK que las fija:

| Estado | Fila | Significado |
|---|---|---|
| **Sin responder** | no hay fila | todavía no se ha preguntado, o se saltó |
| **Seguí el plan** | `confirmed = true`, `dish_name` (y `dish_id` si el plato aún existe) | comí lo comprometido, o otro plato del catálogo |
| **Comí fuera** | `confirmed = true`, `description`, `dish_name` nulo | comí algo que no es ninguna dish (restaurante, casa de alguien) |
| **No comí** | `confirmed = false`, todo nulo | me salté ese meal |

El CHECK se apoya en **`dish_name` / `description`, nunca en `dish_id`**: `confirmed = true` exige exactamente uno de los dos no nulo; `confirmed = false` exige ambos nulos. Es un detalle con consecuencias reales — un CHECK sobre `dish_id` haría **fallar el borrado de cualquier plato**, porque `ON DELETE SET NULL` es un UPDATE y Postgres revalida el CHECK. Y además `dish_id = null` dejaría de discriminar: sería a la vez "comí fuera" y "comí un plato que después borré del catálogo". El nombre congelado resuelve las dos cosas.

**Editar el pasado escribe en `meal_log`, nunca en `planned_meal`.** El compromiso es un hecho histórico: si se reescribiera, se perdería justo la comparación plan-vs-realidad que hace valioso conservarlo. La regla de ADR-0019 "los días pasados no se regeneran nunca" se mantiene y se precisa: **el sistema no replanifica el pasado; el usuario sí puede corregir el registro.**

### Regla de resolución, ahora de cuatro vías

La regla del ADR-0019 ("para cada `(date, meal_id)` manda `meal_log` si existe; si no, `planned_meal`") se refina para diversidad y para el replay del acumulado:

- **Confirmado con `dish_id`** → cuenta los ingredientes y el aporte nutricional de esa dish.
- **Confirmado sin `dish_id` (comí fuera)** → **cuenta 0** en todo: no hay perfil nutricional ni composición que contar. Libera el compromiso sin sustituirlo.
- **Desmentido** → cuenta 0.
- **Sin responder** → cuenta el `planned_meal` (se asume que se siguió el plan).

Que "comí fuera" cuente 0 es la opción honesta y además la segura por ambos lados: infraestima los **techos** mandatory (el sistema podría permitir un poco más de atún del debido, pero no sabemos si comiste atún en el bar) e infraestima los **mínimos** (el sistema empujará a cubrirlos, que es la dirección inofensiva).

### Cuándo se descuenta el inventario: repaso guiado

**El inventario sigue moviéndose solo con una afirmación explícita del usuario** — el sistema nunca inventa consumo, que es la decisión del ADR-0021 y se mantiene. Lo que cambia es que **el sistema persigue esa afirmación en vez de esperarla**: al abrir la app, si quedan comidas sin responder de días anteriores, se pregunta **una por una** si se hizo cada una.

Esto es lo que hace viable "descontar solo al confirmar". Sin el repaso, esa política exigía disciplina diaria y el stock derivaba hacia arriba en silencio; con él, el estado "sin responder" tiende a vaciarse solo sin que el usuario tenga que acordarse de nada.

Reglas del repaso:

- **Siempre saltable.** Un muro entre el usuario y su app es lo contrario del objetivo del producto. Saltar deja el meal como "sin responder".
- **Backlog acotado a los mismos 3 días** de `PLANNING_HORIZON_DAYS`. Más atrás, la corrección de inventario ya es irrelevante (la lista de la compra lleva días reparando la diferencia) y preguntar 56 cosas tras dos semanas fuera sería hostil. Lo que cae fuera de la ventana se queda "sin responder" para siempre y solo se puede tocar desde el historial.
- **Asimetría deliberada de lo que se asume**: para diversidad y acumulados, "sin responder" se cuenta como "seguiste el plan"; para inventario, no se descuenta nada. El sistema asume lo que es barato equivocar y se recalcula solo, y exige confirmación para lo que es un hecho material. Equivocarse en un requisito semanal se corrige la semana siguiente; equivocarse en el stock te manda a la nevera vacía o te hace comprar de más.

### Superficies

- **Repaso en "Hoy"**: el bloque de puesta al día vive al principio de "Hoy", que es donde el usuario sí va a verlo, y es la presentación del flujo una-por-una descrito arriba. No son dos mecanismos: es el mismo.
- **`/historial`**: ruta propia para consultar y editar cualquier día pasado, incluidos los que cayeron fuera de la ventana del repaso. Muestra compromiso vs. hecho. No entra en la tab bar de 4 pestañas (decisión de diseño deliberada): se llega desde `UserMenu`, junto a Configuración.

## Alternativas consideradas

- **Descontar al cerrar el día asumiendo que se siguió el plan**, con el historial como corrección: fricción cero y muy alineado con "el sistema piensa por ti". Tiene un argumento fuerte a favor — el error derivaría hacia abajo, y eso se autocorrige porque aparece en la lista de la compra, mientras que derivar hacia arriba es silencioso. Descartado porque el sistema pasaría a afirmar hechos materiales que nadie le ha confirmado; el repaso guiado consigue casi el mismo efecto sin esa concesión.
- **Solo confirmar o desmentir, sin registrar qué se comió**: conserva una propiedad de seguridad valiosa — el acumulado replayado solo podría *bajar* respecto al plan, así que tocar el pasado nunca podría invalidar un día comprometido, y no haría falta revalidar nada. Descartado porque desmentir sin poder decir qué comiste deja el inventario a medias, que es justo lo que se venía a arreglar.
- **Registrar la comida de fuera con ingredientes estructurados** en vez de texto libre: permitiría contarla en requisitos e inventario. Descartado por desproporcionado — nadie va a desglosar un menú del día — y porque contar 0 es honesto y seguro.
- **Ampliar el `DayTabs` de "Hoy" hacia atrás** (Ayer, Anteayer) en vez de una ruta propia: lo más barato, reutiliza el componente tal cual. Descartado porque dos días de margen no son un historial consultable.

## Consecuencias

- **Se pierde la propiedad de seguridad** que daba el "solo desmentir": al poder registrar otro plato del catálogo, el acumulado replayado puede **subir**, así que editar el pasado puede hacer que un día ya comprometido rompa un techo mandatory. Es un caso del **trigger (c)** del ADR-0019, y obliga a revalidar el sufijo del horizonte tras editar el pasado. La maquinaria ya existe; lo que hace falta es no olvidar conectarla.
- **`getRecentlyUsedIngredientIds` filtra hoy por nada**: recorre todas las filas de `meal_log` sin mirar `confirmed`, y hace `dishIngredientsByDishId.get(log.dish_id)`. En cuanto existan filas desmentidas o sin `dish_id`, contaría comidas que no ocurrieron y reventaría con el null. Es el punto concreto que hay que tocar.
- `fetchDailyContext` ya filtra por `log.confirmed` al calcular `confirmedMealIds`, así que esa parte está preparada sin cambios.
- El estado "sin responder" deja de ser el estado por defecto permanente y pasa a ser transitorio. A cambio, aparece una superficie nueva que puede sentirse como deuda pendiente si el repaso se presenta con demasiada insistencia — de ahí que sea saltable y acotado.
- El historial hace por fin medible "¿cuánto me desvío del plan?", que es la pregunta que da sentido a conservar los `planned_meal` pasados y una entrada natural para la fase 5 (IA).
- **Fuera de alcance**: cantidades parciales ("me comí media ensalada"); registrar comidas fuera de los 4 meals del sistema (ADR-0001 deja las cenas fuera a propósito); y deducir valor nutricional del texto libre de `description`.
