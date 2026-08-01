# ADR-0020: Simulación de consumo y función objetivo con términos que compiten

- **Estado**: Aceptada
- **Fecha**: 2026-08-01

## Contexto

El usuario enunció la función objetivo del sistema con estas palabras: *"cubrir las necesidades nutricionales de cada comida, y tener un buen balance entre variedad de ingredientes (cuanto más alta mejor) y cantidad de inventario en stock (cuanto más bajo mejor)"*. Ninguna de las dos últimas partes es hoy expresable, por dos motivos distintos.

**El motor no simula consumo.** El término `inStock` de `scoreIngredient` compara la cantidad que pide la dish contra `office_inventory + home_inventory`, un valor que no cambia a lo largo de la generación. Los mismos 200 g de atún "cubren" hoy, mañana y pasado, y también dos meals del mismo día. Tres consecuencias:

- La promesa *"abro la nevera y tengo todo lo necesario"* **ya falla hoy aunque no compres nada**: el plan puede asignar tres días de un ingrediente del que solo hay para uno.
- "Minimizar stock" es literalmente inexpresable: no existe la noción de stock resultante que minimizar.
- `computeShoppingList` **sí** agrega bien la necesidad de los tres días (`sumUpcomingNeed`), así que la lista de la compra y el plan trabajan con modelos distintos del mismo inventario.

**La variedad no compite.** Los pesos `WEIGHT_IN_STOCK = 100`, `WEIGHT_HELPS_MANDATORY_MIN = 10`, `WEIGHT_NOT_RECENTLY_USED = 1` están espaciados en órdenes de magnitud *a propósito*, con el comentario "para que la suma nunca reordene tiers (son señales 0/1)". Eso es un orden lexicográfico: la variedad solo actúa como desempate entre platos idénticos en las dos primeras señales. Un "buen balance" entre variedad y stock es una **suma ponderada de términos que compiten**. Es un cambio de modelo, no un ajuste de números.

Este ADR va emparejado con el [ADR-0019](0019-plan-comprometido-con-horizonte-rodante.md): congelar un plan calculado sin simular consumo congelaría un plan inviable, que es justo lo contrario de lo que se busca.

## Decisión

### Simulación de consumo

Se introduce un **stock virtual** dentro de la generación: se inicializa con el inventario real y se **decrementa al asignar cada dish**, tanto entre días del horizonte como entre meals del mismo día. El término de disponibilidad se evalúa contra el stock virtual, no contra el inventario nominal.

Esto es lo que hace cierta la promesa de la nevera, lo que alinea el plan con `computeShoppingList`, y lo que hace *expresable* "minimizar stock": consumir lo que ya hay drena el stock, y la lista de la compra pide solo el déficit.

### Puntuación

El scoring deja de ser tiers léxicos y pasa a una **suma ponderada de términos que compiten**:

1. **Coste de compra** — cuántos componentes de la dish **no** cubre el stock virtual. Penaliza; menos es mejor.
2. **Repetición** — cuántos componentes se han usado recientemente. Penaliza; es la norma "Diverso".
3. **Ayuda a un mínimo mandatory global pendiente** — se conserva, a nivel de dish.
4. **Drenaje** — premia consumir ingredientes con más stock acumulado, para vaciarlos antes de abrir otra cosa. Es lo que convierte "minimizar stock" de aspiración en señal.

### Invariante de neutralidad al tamaño

Los dos términos de penalización se miden en **cuentas absolutas, no en fracciones**, y de ahí sale la propiedad que gobierna todo el diseño:

> Un plato sin nada que comprar y sin ingredientes repetidos puntúa **igual** tanto si tiene 1 componente como si tiene 6. Las desviaciones se cuentan en unidades reales: un plato al que le faltan 3 ingredientes cuesta 3 compras, tenga el tamaño que tenga.

Esto no es un detalle de normalización: es lo que permite diseñar el catálogo con libertad. Con la media, un plato de 1 ingrediente alcanzaba el máximo teórico siempre y uno de 6 se degradaba en cuanto **uno solo** se agotaba virtualmente — con "Fruta (pieza)" compitiendo en el Snack de media mañana, el caso malo no era hipotético.

**El término de drenaje debe respetar el invariante.** Es el que más fácilmente lo rompe: formulado como suma sobre componentes favorecería a los platos grandes, y como media favorecería a los pequeños. Es el punto a vigilar al implementarlo, y el invariante de arriba es el criterio de aceptación — se comprueba con un test de propiedad, no a ojo.

**El filtro duro de techos mandatory NO se ablanda.** `violatesMandatoryMaximum` sigue siendo un filtro, no un término penalizado. Dos razones: es lo único que garantiza hoy los requisitos mandatory, y su `unresolvedReason` es **la señal que consume el trigger (c) de inviabilidad** del ADR-0019. Convertirlo en penalización dejaría ese trigger sin entrada.

**Desempates con epsilon.** `pickBestByScore` recoge los candidatos que igualan el máximo comparando con `===` sobre floats. Al medir en cuentas enteras, dos platos igual de cubiertos y de frescos empatan **de verdad** y con frecuencia — el único término continuo es el drenaje, que es el que rompe la mayoría de esos empates. La consecuencia es buena y conviene no perderla de vista: la semilla por fecha **conserva su papel** en la rotación en vez de volverse decorativa, que es lo que habría pasado con una puntuación enteramente continua. Se compara con epsilon para que el drenaje no separe por el último bit del float a dos candidatos que deberían empatar.

**Los scores solo son comparables dentro de un mismo meal**, nunca entre meals. Y hay que reescribir el comentario de `scoreResolvedDish`: documenta que promediar corrigió el bug de sumar (una dish con más componentes ganaba solo por tener más), pero a partir de ahora no describe ni lo que hace el código ni el trade-off real. Las tres formas se han probado sobre el papel y ninguna de las dos primeras funciona — **sumar** sesga hacia los platos grandes, **promediar** sesga hacia los pequeños, y **contar desviaciones** no sesga hacia ninguno.

**Los pesos concretos nacen provisionales.** El catálogo de platos está pendiente de rediseño (hoy casi todos están fuera de la ventana de su meal), así que la calibración no se puede validar de verdad hasta que exista un catálogo sano. Los pesos viven en un único sitio, con su justificación escrita al lado.

## Alternativas consideradas

- **Mantener los tiers 100/10/1 y solo añadir simulación de consumo**: arregla la viabilidad del plan sin tocar el modelo de puntuación, y es mucho menos arriesgado. Descartado porque deja intacto el problema enunciado por el usuario: con orden lexicográfico, la variedad nunca puede ganar a la disponibilidad, así que "buen balance" es inalcanzable por construcción.
- **Mantener la media sobre componentes** y absorber el sesgo en el catálogo, diseñando cada meal con platos de tamaño parecido: cero código. Descartado porque ata las manos justo en la tarea de rediseño del catálogo, y porque el sesgo seguiría latente para cualquier plato añadido después sin recordar la regla.
- **Ponderar los componentes por cantidad en vez de promediarlos a partes iguales**: corregiría en parte el sesgo. Descartado porque las cantidades no son comparables entre unidades (`g`, `ml`, `unit`), así que la ponderación no significaría lo mismo en dos platos distintos.
- **Modelar la caducidad para el término de drenaje** (`opened_at` por ingrediente, o una tabla de lotes) en vez de la heurística de "vaciar lo que más stock tiene": priorizar por antigüedad real es la formulación correcta de "terminar lo abierto". Aplazado, no descartado — la heurística no toca el esquema y sirve el objetivo de forma aproximada; los lotes son el cambio grande que [ADR-0021](0021-confirmar-comida-descuenta-inventario.md) ya descartó por desproporcionado.
- **Un solver global sobre toda la ventana** en vez del voraz día a día: encontraría el reparto óptimo de requisitos escasos. Sigue fuera de alcance, como ya se asumía.

## Consecuencias

- El plan que se compromete es por fin **servible**: las cantidades del horizonte no exceden lo que hay más lo que la lista de la compra pide.
- **Al final del horizonte el término de stock deja de discriminar**: el stock virtual de todo lo ya usado está a 0, así que el último día lo deciden la variedad y los requisitos. Ese día es precisamente el que entra nuevo con el roll-forward y el que genera la necesidad marginal de la lista de la compra — es decir, **las compras acaban decididas por los términos más débiles del sistema**. Limitación conocida.
- **La semilla por fecha conserva su papel.** Medir en cuentas enteras produce empates reales y frecuentes, así que el azar sembrado por fecha sigue siendo una fuente de rotación efectiva — a diferencia de lo que habría ocurrido con una puntuación enteramente continua, donde el conjunto de empatados sería casi siempre de tamaño 1.
- Los tests actuales (`resolve.test.ts`: prioriza in-stock, prioriza requisito, semilla; `multiDay.test.ts`: rotación entre días) están construidos sobre el orden lexicográfico y pasan a ser **tests de calibración frágiles** ante cualquier retoque de pesos. Conviene reescribirlos como tests de propiedad ("no repite ingrediente dos días seguidos si hay alternativa", "no asigna más cantidad de la disponible más la comprada") en vez de re-verificar los umbrales.
- La justificación escrita en `engine/commute.ts` ("no simula consumo secuencial dentro del día, igual que el resto del motor") **deja de ser cierta**: habrá un motor que simula y un commute que no, en la misma pantalla. Ver el ADR-0021, donde el problema de fondo (no existe evento "ya me lo he llevado") se aborda de frente.
- **El invariante de neutralidad al tamaño es verificable**, y debe existir como test de propiedad desde el primer día: dos platos sin nada que comprar y sin repeticiones puntúan igual, sean de 1 o de 6 componentes. Es la única defensa contra que un retoque de pesos reintroduzca el sesgo sin que nadie lo note — y con el ADR-0019 el sesgo ya no se corregiría solo en el render siguiente, se **congelaría** en un compromiso.
- **La caducidad sigue sin modelarse.** El término de drenaje aproxima "termina lo abierto" con "vacía lo que más stock tiene", que no es lo mismo: no distingue un bote abierto hace tres semanas de uno recién comprado. `ingredient.opened_shelf_life_days` sigue existiendo sin usarse. Es una aproximación deliberada y suficiente para el objetivo declarado, no la solución completa.
