# ADR-0021: Confirmar una comida descuenta inventario automáticamente

- **Estado**: Aceptada
- **Fecha**: 2026-08-01

## Contexto

El ciclo de la alimentación que describe `idea-inicial.md` es circular: generar → comer → revisar inventario → comprar → generar. Hoy está **roto por el medio a propósito**: confirmar un meal escribe una fila en `meal_log` y no toca el inventario; la única escritura automática de inventario en toda la app es `addToHomeInventory` al marcar algo como comprado. El inventario, por tanto, solo sube solo. Baja únicamente si el usuario lo edita a mano en `/inventory`.

Mientras el inventario era una señal binaria de ranking, eso era una simplificación tolerable. Con el [ADR-0020](0020-funcion-objetivo-con-terminos-que-compiten.md) deja de serlo: la simulación de consumo y el objetivo "cantidad de inventario en stock, cuanto más bajo mejor" se apoyan en que el stock de la base de datos se parezca al stock de la nevera. Si el sistema cree que sigues teniendo los 200 g de atún que te comiste el lunes, ni la simulación ni la lista de la compra significan nada, y **"minimizar stock" no es medible**.

El usuario decidió cerrar el ciclo: confirmar descuenta, y además la app recuerda revisar el inventario real al final del día.

## Decisión

- **Confirmar un meal descuenta del inventario las cantidades congeladas en `planned_meal.components`** ([ADR-0019](0019-plan-comprometido-con-horizonte-rodante.md)), no las del `dish_ingredient` vigente. Desconfirmar las devuelve. Usar el snapshot y no el plato vivo es lo que hace la operación exactamente reversible aunque el plato se edite entremedias — `updateDish` borra y reinserta todos sus componentes.
- **Clamp a 0, nunca negativo.** El generador **no exige stock**: la disponibilidad puntúa pero no filtra. Confirmar un plato del que no tienes todos los ingredientes es por tanto el caso **normal**, no el raro, y el `constraint ingredient_inventory_non_negative check (office_inventory >= 0 and home_inventory >= 0)` del esquema inicial reventaría con un 23514. El fallo además sería invisible: `MealConfirmCheckbox` es optimista (`setChecked(next)` antes de la acción, dentro de `startTransition`) y no maneja errores, así que el usuario vería "Comido" y en base de datos no habría ni descuento ni fila.
- **Atomicidad**: la escritura en `meal_log` y el descuento van en una única función SQL, y el ajuste se expresa como `update ... set x = x - $1`, no como el read-modify-write actual de `addToHomeInventory` (dos viajes: `select` y luego `update`), que pierde incrementos concurrentes. `markPurchasedAction` se migra al mismo patrón por coherencia.
- **De qué lado se descuenta**: primero el lado que corresponde al meal (oficina para los meals de oficina), cayendo al otro. **La separación oficina/casa queda informativa**, y conviene decirlo sin adornos: no existe ningún evento "ya me lo he llevado". `addToHomeInventory` siempre suma a casa y `office_inventory` no sube nunca solo, así que descontar de oficina lo lleva a 0 de forma permanente y `computeHomeToOfficeCarry` acabaría diciendo "llévate todo de casa" siempre, mientras `computeOfficeToStreetGrab` se queda vacío para siempre. Ninguna asignación de lados es correcta hasta que exista el evento de traslado; lo honesto es que las cifras por lado sirvan de orientación y que el total sea lo que manda.
- **Recordatorio de fin de día**: tras el último meal del día, un aviso con enlace a `/inventory` para revisar el stock real. Es el punto 3 del ciclo de `idea-inicial.md` (*"tras comer, puedo abrir la nevera en la oficina, revisar qué tengo, y actualizar mis datos"*) convertido en algo que el sistema pide en vez de esperar. Solo un aviso: sin flujo de conteo guiado.
- **Chips de stock**: `IngredientRow` marca `short` cuando `office_inventory + home_inventory < neededQuantity`. Con descuento automático, el plato que acabas de confirmar pintaría sus propios ingredientes en rojo justo después de comértelo. Se apaga el chip en los meals ya confirmados.

## Alternativas consideradas

- **Seguir 100% manual** (statu quo): mantiene el inventario como verdad introducida por el usuario, sin riesgo de que el sistema lo corrompa. Descartado porque el stock deriva sin control y deja sin base tanto la simulación de consumo como el objetivo de minimizar stock — se optimizaría contra datos que no describen la nevera.
- **Descuento automático sin recordatorio**: menos fricción diaria. Descartado por el usuario: el descuento estima, no mide, y sin un momento de reconciliación el error se acumula indefinidamente.
- **Un ledger de movimientos de inventario** (tabla de entradas/salidas en vez de dos columnas escalares): daría trazabilidad completa, reversibilidad exacta y la fecha de apertura que hace falta para priorizar por caducidad. Descartado por ahora por desproporcionado; congelar los componentes en `planned_meal` cubre la reversibilidad, que es lo que bloquea. Es el candidato natural si más adelante hace falta la caducidad.
- **Descontar al generar en vez de al confirmar**: el inventario reflejaría el plan sin depender de que el usuario confirme. Descartado: convertiría una previsión en un hecho, y un día no comido dejaría el stock permanentemente por debajo de la realidad.

## Consecuencias

- El ciclo generar → comer → descontar → comprar queda cerrado por primera vez. La lista de la compra pasa a reflejar consumo real y no solo compras registradas.
- **La corrección del inventario depende de que el usuario confirme 4/4 cada día, y hoy eso no se puede hacer**: el checkbox solo se pinta si el día es hoy (`isToday` en `DayProposalView`). Una confirmación olvidada deja comida consumida contando como stock **indefinidamente**, y con el ADR-0020 ese error ya no es cosmético: decide platos y decide compras. Permitir confirmar días pasados queda pendiente y es la pieza que más presiona. → **Resuelto por el [ADR-0022](0022-historial-de-comidas-editable-y-repaso-guiado.md)**: el descuento sigue exigiendo confirmación explícita (esta decisión no cambia), pero el sistema la persigue con un repaso guiado de los días pendientes en vez de esperarla.
- `docs/status.md` deja de poder afirmar que confirmar un meal no toca nada más que `meal_log`.
- **Fuera de alcance, anotado explícitamente**:
  - ~~**Confirmar "he comido otra cosa"**: se mantiene el sí/no de v1, y se descuenta lo planificado.~~ → **Revisitado por el [ADR-0022](0022-historial-de-comidas-editable-y-repaso-guiado.md)**, que entra en alcance: se puede registrar otro plato del catálogo o una comida de fuera.
  - **Reconciliación guiada de inventario**: el recordatorio es solo un aviso. Sigue fuera de alcance — el repaso del ADR-0022 pregunta por *comidas*, no por cantidades de stock.
  - **Suplementos**: consumen inventario real (`supplement.ingredient_id` es NOT NULL contra `ingredient`) pero no entran en `ResolvedDish.components`, ni en `sumUpcomingNeed`, ni en el descuento. Además `fetchDailyContext` los adjunta filtrando solo por `meal_id`, **ignorando `frequency` y `supplement_day`** — ninguna línea del repo lee `supplement_day`. Es decir: la proteína en polvo y el probiótico nunca bajan de stock ni aparecen en la compra. Hoy queda escrito; antes estaba oculto.
  - **Envase vs. ración** ([ADR-0013](0013-definicion-de-racion-en-gramos.md)): marcar comprado suma el déficit exacto, no el tamaño real del envase, así que el inventario subestima sistemáticamente lo que hay en casa. Con el descuento activo, ese error ahora se compone con el del consumo en direcciones opuestas.
