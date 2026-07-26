# Diseño del sistema "comida-diaria"

> Este documento aterriza la idea original (`idea-inicial.md`) en un diseño formal: entidades con sus campos, un modelo concreto de requisitos dietéticos y validación, un boceto de esquema relacional, el algoritmo de generación a alto nivel, y un roadmap por fases. No contiene código todavía — esa es la fase 2 (ver [Roadmap](#7-roadmap-por-fases)).
>
> Los nombres de entidades, tablas y campos ya se dan en inglés, porque es el idioma en el que se implementará el código y la base de datos (Postgres vía Supabase). La prosa explicativa se mantiene en español.
>
> El razonamiento detallado (contexto, alternativas consideradas, consecuencias) de cada decisión relevante de este documento vive como Architecture Decision Record en [`adrs/`](adrs/README.md), no aquí — este documento describe el diseño resultante, los ADRs explican el porqué.

## 1. Resumen y alcance

### Qué es

Un sistema personal para gestionar la parte de la dieta que se puede planificar sin cocinar: qué comer, qué comprar, qué hay en inventario, y si se están cumpliendo los requisitos nutricionales — minimizando la carga mental de decidir cada día.

### Las 4 normas (heredadas de la idea original, sin cambios)

1. **Sano**: toda comida incorporada debe encajar en una dieta equilibrada. No se planifican caprichos.
2. **Homogéneo**: el tipo de preparación de cada meal es fijo día a día (ej. "la comida es siempre una ensalada"), para que sea rutina y no una decisión.
3. **Diverso**: dentro de ese tipo fijo, los ingredientes concretos rotan (ej. no siempre atún) para variar nutrientes y evitar acumulación de metales pesados u otros riesgos.
4. **Preparación mínima**: nada de cocina. Como mucho, pelar un huevo cocido o usar el microondas.

### Alcance de v1

El sistema planifica **4 meals**:

1. Desayuno en casa
2. Snack de media mañana (oficina)
3. Almuerzo de mediodía (oficina)
4. Snack post-entreno

**Las cenas quedan explícitamente fuera de alcance**: se cocinan, el usuario ya tiene su propio sistema para ellas, y al implicar cocina y ajuste según lo comido durante el día, complicarían mucho el modelo de este sistema (que asume comidas atómicas y predecibles). Esto no es una limitación técnica sino una decisión de diseño: cualquier futura extensión a cenas debería tratarse como un subsistema aparte, no como un quinto meal igual a los otros cuatro.

---

## 2. Glosario de entidades

Se listan los campos como si fueran columnas de tabla (nombre — tipo — ejemplo), para que sirvan directamente de referencia en la fase de esquema Postgres (Supabase). Todas las PKs son `uuid` (`default gen_random_uuid()`), y todas las tablas llevan además una columna `owner_id uuid references auth.users` con RLS activado — no se repite en cada tabla de este glosario para no saturarlo; el modelo completo de Auth/RLS se explica una sola vez en la sección 4.

### Ingredient

Alimento comprable, unidad mínima del sistema.

| Campo                | Tipo                                                      | Ejemplo             |
| --------------------- | ---------------------------------------------------------- | -------------------- |
| id                       | uuid (PK), default `gen_random_uuid()`                     | a1b2c3...            |
| name                     | string                                                     | "Atún en lata"       |
| base_unit                | enum(g, ml, unit)                                          | g                    |
| storage_type             | enum(pantry, fridge, freezer)                              | fridge               |
| opened_shelf_life_days   | int, nullable                                              | 3                    |
| recommended_time         | enum/lista(morning, midday, afternoon, any)                | any                  |
| office_inventory         | int/decimal (cantidad actual)                              | 200 (g)              |
| home_inventory           | int/decimal (cantidad actual)                              | 0 (g)                |
| categories               | relación N:M con `ingredient_category` (ver más abajo)     | Protein (salad)      |
| kcal_per_100             | decimal                                                    | —                    |
| protein_g_per_100        | decimal                                                    | —                    |
| carbs_g_per_100          | decimal                                                    | —                    |
| sugar_g_per_100          | decimal                                                    | —                    |
| fiber_g_per_100          | decimal                                                    | —                    |
| fat_g_per_100            | decimal                                                    | —                    |
| saturated_fat_g_per_100  | decimal                                                    | —                    |
| sodium_mg_per_100        | decimal                                                    | —                    |
| vitamin_c_mg_per_100     | decimal                                                    | —                    |
| iron_mg_per_100          | decimal                                                    | —                    |
| calcium_mg_per_100       | decimal                                                    | —                    |
| omega3_g_per_100         | decimal                                                    | —                    |

Todos los `*_per_100` son "por 100 `base_unit`" (100g, 100ml, o 100 unidades, según el ingrediente).

**Lista de nutrientes** *(cerrada para arrancar la fase 2)*: macros completos (kcal, proteína, hidratos, azúcar, fibra, grasa, grasa saturada) + los micronutrientes que ya aparecían mencionados en la idea original o en las normas del sistema — sodio (norma "sano", relevante en conservas/embutidos), vitamina C y hierro (mencionados explícitamente), calcio, y omega-3 (relevante por el consumo de pescado azul). No es una lista cerrada para siempre: si en el futuro hace falta trackear otro nutriente, se añade con un `ALTER TABLE` — no bloquea el resto del esquema.

**Fuente de datos nutricionales** *(resuelto)*: los valores por defecto se obtienen consultando una API/base de datos nutricional externa (USDA, OpenFoodFacts...) a través de una capa de normalización propia, que hace de *decoupling* entre el formato de cada fuente externa y nuestras columnas `*_per_100` (mapea nombres de nutrientes y unidades heterogéneas a nuestro esquema). El usuario puede sobreescribir cualquier valor para un ingrediente concreto, o añadir ingredientes que no existan en la fuente externa — esos overrides/altas manuales tienen siempre prioridad sobre lo que traiga la API.

**Categoría de ingrediente**: agrupación reutilizable para comidas flexibles (ej. las 5 categorías de la ensalada: Fibra y vitaminas, Proteína, Hidratos, Grasa, Aliños). Un ingrediente puede pertenecer a varias categorías (ej. "Queso fresco" es Proteína, pero "Queso en trozos" es Grasa). *(Resuelto)*: las categorías no son una lista cerrada — el usuario podrá crear categorías nuevas conforme diseñe futuras comidas flexibles, así que `ingredient_category` necesita, en algún momento (fase 4), una UI de gestión mínima además de vivir en datos semilla.

### Dish

Conjunto de 1+ ingredientes que forma una unidad alimenticia pre-diseñada (nunca generada libremente por el sistema). Es el equivalente en inglés de lo que la idea original llama "comida" (ej. un bocadillo, una ensalada) — se renombra para no chocar con `Meal`.

| Campo      | Tipo               | Ejemplo                                  |
| ----------- | -------------------- | ------------------------------------------ |
| id         | uuid (PK)       | 3                                          |
| name       | string              | "Bocadillo de pollo/pavo con pimientos"    |
| dish_type  | string/enum libre   | Sandwich                                   |
| components | ver `dish_ingredient` | —                                        |

**`structure_type` ya no es una columna** *(cambio de este ciclo)*: es una propiedad implícita, derivada de las filas de `dish_ingredient` asociadas a la comida, según cuántas tengan `required = true`:

- Ninguna obligatoria → **flexible**.
- Todas obligatorias → **fija**.
- Alguna sí y alguna no → **semiflexible**.

No hace falta almacenarlo ni mantenerlo sincronizado; se calcula con una query o una vista cuando haga falta.

**Tres subtipos** (igual que en la idea original, ahora derivados en vez de un campo propio):

- **Fija**: lista cerrada de ingredientes concretos, sin alternativas ni grupos. Ej: un bocadillo con 4 ingredientes obligatorios.
- **Flexible**: N grupos (categorías), y hay que tomar 1+ ingrediente de cada grupo, sin importar cuál. Ej: la ensalada, con sus 5 categorías.
- **Semiflexible**: mezcla de ambas — algunos ingredientes fijos + al menos un componente que se resuelve eligiendo dentro de un grupo/categoría. Ej: el bocadillo de pollo/pavo, donde pan/queso/mezclum/pimientos/salsa son fijos pero pollo-o-pavo es una elección dentro de un grupo de 2.

**Componente de comida** (`dish_ingredient`): cada fila liga una dish con un ingredient o una category, e indica si es obligatorio, alternativa dentro de un grupo, o parte de un grupo flexible, más la cantidad (fija o rango).

| Campo        | Tipo                                                 | Ejemplo   |
| ------------- | ------------------------------------------------------ | ----------- |
| dish_id      | FK                                                    | 3         |
| ingredient_id| FK, nullable si se referencia una category            | 8 (Pollo) |
| category_id  | FK, nullable si se referencia un ingredient concreto   | null      |
| slot_group   | int (agrupa alternativas del mismo hueco)             | 1         |
| quantity     | decimal + unidad                                      | 50g       |
| required     | bool                                                  | true      |

### Meal

Una actividad de comida en un momento del día. Consiste en 1+ Dishes.

| Campo             | Tipo                                                                     | Ejemplo             |
| ------------------ | --------------------------------------------------------------------------| ---------------------|
| id                | uuid (PK)                                                            | 1                    |
| name              | string                                                                   | "Desayuno en casa"   |
| usual_start_time  | time                                                                     | 08:00                |
| usual_end_time    | time                                                                     | 08:10                |
| dishes            | relación N:M con `Dish` (vía `meal_dish`, con cantidad de unidades)      | —                    |

`usual_start_time`/`usual_end_time` sustituyen a la antigua `hora_habitual` única: cada meal tiene una **ventana horaria habitual** (ej. "entre las 08:00 y las 08:10"), no un instante exacto — encaja mejor con cómo describe el usuario sus horarios reales (ver catálogo abajo) y es lo que usará el generador para, por ejemplo, decidir si aún hay tiempo de preparación disponible.

**Catálogo inicial de los 4 meals** (contexto real del usuario, sirve de dato semilla para la fase 2):

1. **Desayuno en casa** — 08:00–08:10, máx. 10 min. Actualmente: "poción del entrenador" (agua + cúrcuma + sal + pimienta + creatina, en ayunas) siempre; y de forma variable, papilla para bebés diluida en leche, una fruta, o una tostada de pan de maíz con queso crema/hummus + pavo/queso.
2. **Snack de media mañana (oficina)** — 10:45–11:05, 20 min disponibles. Normalmente un bocadillo (comprado en el bar o traído de casa) o una pieza de fruta.
3. **Almuerzo de mediodía (oficina)** — 14:30–15:10, 5-10 min de preparación + 30-40 min comiendo en el escritorio. Debe preparar el cuerpo para el entreno de calistenia 1-2h después. Formato preferido: ensalada con las 5 categorías de ingredientes descritas en la idea original (Fibra y vitaminas, Proteína, Hidratos, Grasa, Aliños), con equipamiento disponible de armario + nevera + microondas + congelador (evitar congelador si se puede).
4. **Snack post-entreno** — desde ~15:30 en adelante, con horas hasta llegar a casa. Debe incluir reposición: bebida isotónica, posible plátano, proteína de absorción rápida.

### Supplement

Ingrediente que se toma de forma determinista (sin flexibilidad), con frecuencia y momento estrictos.

| Campo           | Tipo                                                                    | Ejemplo                  |
| ---------------- | -------------------------------------------------------------------------| --------------------------|
| id              | uuid (PK)                                                           | 1                        |
| name            | string                                                                  | "Poción del entrenador"  |
| ingredient_id   | FK (el supplement tiene sus propios valores nutricionales, como cualquier ingredient) | — |
| frequency       | enum(daily) o lista de días de la semana                               | daily                    |
| meal_id         | FK — en qué meal(s) se toma                                             | Desayuno en casa         |
| relative_timing | enum(before_fasting_ends, right_after_meal, x_hours_after)              | before_fasting_ends      |

---

## 3. Modelo de requisitos dietéticos y validación

Esta es la pieza central que la idea original dejaba esbozada ("hay que pensar cómo definirlos") y que aquí se formaliza, porque de ella depende directamente el motor de generación de menús de la fase 3.

### 3.1 Ejes de clasificación

Todo requisito se clasifica cruzando dos ejes, tal como proponía la idea original:

|                     | **Diario**                   | **Semanal**                                 |
| ------------------- | ---------------------------- | -------------------------------------------- |
| **Por ingrediente** | Ej: 1 aguacate (~100g)/día   | Ej: 2 latas de sardinas/semana               |
| **Por nutriente**   | Ej: mínimo de vitamina C/día | Ej: máximo de mercurio/semana (vía pescado)  |

Esto da 4 combinaciones posibles, y un requisito siempre cae en una de ellas. Además de estos dos ejes, un requisito puede opcionalmente **acotarse a un meal concreto** — ver 3.9.

### 3.2 Estructura de un requisito

| Campo             | Tipo                                                                                                                   | Notas                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------| ----------------------------------------------------------------------|
| id                | uuid (PK)                                                                                                          |                                                                       |
| scope_type        | enum(ingredient, ingredient_category, nutrient)                                                                       | Qué se mide                                                          |
| scope_ref         | FK a `ingredient`/`ingredient_category`, o nombre de la columna nutricional de `ingredient` (ej. `vitamin_c_mg_per_100`) | Según `scope_type`                                                   |
| period            | enum(day, week)                                                                                                        |                                                                       |
| week_reset_day    | enum(mon..sun), solo si period=week                                                                                    | Para saber cuándo arranca cada ventana semanal                       |
| meal_id           | FK a `meal`, nullable                                                                                                  | Si no es null, acota el requisito a ese meal concreto — ver 3.9      |
| minimum           | decimal, nullable                                                                                                      | Nullable si el requisito solo pone techo (ej. máximo de mercurio)    |
| maximum           | decimal, nullable                                                                                                      | Nullable si el requisito solo pone suelo (ej. mínimo de vitamina C)  |
| unit              | string                                                                                                                 | g, mg, servings...                                                   |
| tolerance_margin  | decimal (%), default 10%                                                                                              | Ver 3.5                                                              |
| strictness        | enum(mandatory, advisory)                                                                                             | Ver 3.6                                                              |
| description       | string libre                                                                                                          | Para trazabilidad humana                                             |

### 3.3 Ejemplos concretos ya conocidos, formalizados

| Descripción                      | scope_type                                       | scope_ref             | period | meal_id             | mínimo                     | máximo                            | strictness |
| --------------------------------- | --------------------------------------------------- | ------------------------ | -------- | ---------------------- | ---------------------------- | ------------------------------------ | ------------ |
| 2 latas de sardinas a la semana   | ingredient                                         | Sardinas en lata         | week   | —                      | 2 servings (240g)          | 2 servings (o sin techo)            | mandatory  |
| 1 aguacate (~100g) al día         | ingredient                                         | Aguacate                 | day    | —                      | 100g                        | —                                    | mandatory  |
| Mínimo de vitamina C diario       | nutrient                                           | `vitamin_c_mg_per_100`      | day    | —                      | 80mg (NRV UE)               | —                                    | mandatory  |
| Limitar atún por metales pesados  | ingredient (o category "pescado azul grande")      | Atún en lata             | week   | —                      | —                            | 2 servings (240g)                   | mandatory  |
| Mínimo de proteína post-entreno   | nutrient                                           | `protein_g_per_100`        | day    | Snack post-entreno    | 35g                          | —                                    | mandatory  |

El caso del atún es interesante porque combina la norma de **diversidad** (rotar proteína) con un requisito de **máximo semanal**: el sistema no solo debe evitar servir atún todos los días por variedad, sino que además nunca debe superar el techo semanal aunque el usuario quisiera repetirlo.

**Definición de "ración" / `servings`** *(resuelto)*: una ración es siempre una cantidad en gramos (o ml/unidades, según `base_unit`), independiente del envase de compra — "2 latas de sardinas" no equivale mecánicamente a "2 unidades de compra", sino a una cantidad fija en gramos (ej. 2 raciones = 240g) que puede no coincidir con el tamaño exacto de una lata concreta. Esto es lo que se compara contra el inventario real, no el número de envases.

### 3.4 Cálculo de cumplimiento

Para cada requisito activo, el sistema mantiene un **acumulado del periodo vigente** (día actual, o semana actual desde `week_reset_day`):

```
accumulated(requirement, current_period) =
  suma de (cantidad aportada por cada ingredient consumido en ese periodo
            que coincide con scope_ref del requirement
            y, si meal_id no es null, que se consumió dentro de ese meal)
```

- Si `scope_type = ingredient` o `ingredient_category`: se suman directamente las cantidades/raciones de ese ingrediente (o de cualquier ingrediente de esa categoría) consumidas en el periodo.
- Si `scope_type = nutrient`: se suman los valores nutricionales de **todos** los ingredientes consumidos en el periodo, multiplicando por su cantidad. Esto es clave porque, como señala la idea original, un requisito por nutriente puede satisfacerse desde fuentes distintas cada día (dos piezas de fruta no garantizan vitamina C si no es la fruta adecuada; pero una verdura rica en vitamina C sí puede sustituirla). El requisito nunca está ligado a un ingrediente fijo, sino al total nutricional del periodo.
- Si el requisito tiene `meal_id`: la suma solo considera lo consumido en las ocurrencias de ese meal dentro del periodo (normalmente una ocurrencia diaria), no el total del día — ver 3.9.

Un requisito está **cumplido** en un instante dado si:

```
minimum (si existe) <= accumulated <= maximum (si existe)
```

y **en riesgo de incumplirse** si, dado lo que queda de periodo (horas del día, o días de la semana) y lo que aún se puede planificar, ya no es alcanzable llegar al mínimo o ya no se puede evitar superar el máximo.

### 3.5 Márgenes de tolerancia

Cada requisito lleva un `tolerance_margin` (%) porque, como pide la idea original, el sistema **no debe ser determinista ni exigir exactitud**. El valor por defecto es **10%** *(resuelto)*, para no tener que definirlo requisito a requisito desde el primer día; se puede ajustar caso a caso. En la práctica:

```
effective_minimum = minimum * (1 - tolerance_margin)
effective_maximum = maximum * (1 + tolerance_margin)
```

El generador de menús (fase 3) considera "válida" cualquier combinación que caiga dentro de `[effective_minimum, effective_maximum]`, no solo la que da en el clavo. Esto evita que el sistema descarte una propuesta razonable por quedarse a un 2% de un mínimo, y le da margen para variar (norma de diversidad) sin sacrificar cumplimiento.

### 3.6 Strictness: mandatory vs advisory

- **Mandatory**: el generador nunca puede proponer un plan que lo incumpla (fuera del margen de tolerancia). Ej: el máximo semanal de un metal pesado.
- **Advisory**: el generador intenta cumplirlo y lo reporta, pero puede incumplirlo si entra en conflicto con un requisito mandatory o con las restricciones de preparación (norma de "preparación mínima"). Ej: un mínimo de fibra que sería deseable pero no crítico un día concreto.

Esta distinción es la que permite resolver conflictos (ver 3.7) sin que el sistema se bloquee cuando no existe ninguna combinación perfecta.

### 3.7 Resolución de conflictos

Cuando no existe combinación de comidas que satisfaga todos los requisitos del día/semana a la vez:

1. Se satisfacen primero todos los requisitos **mandatory**.
2. Entre los **advisory**, se prioriza por cercanía al vencimiento del periodo (un advisory semanal que ya lleva 6 de 7 días sin cumplirse pesa más que uno que acaba de reiniciarse).
3. Si un requisito semanal (mandatory o advisory) no se puede cumplir hoy pero quedan días de la semana, **se aplaza** — no se marca como incumplido hasta que se cierra la ventana semanal sin haberlo alcanzado.
4. Solo si un mandatory diario es matemáticamente imposible de cumplir con el inventario/opciones actuales, el sistema debe **señalarlo explícitamente** (no fallar en silencio) para que el usuario decida (ej. añadirlo a la lista de la compra urgente, o aceptar el incumplimiento puntual).

### 3.8 Trazabilidad semanal

El sistema mantiene un `requirement_log` (ver esquema, sección 4) que guarda, para cada requisito y cada periodo (día o semana concretos), el acumulado en tiempo real. Esto permite responder en cualquier momento preguntas como "¿cuántas latas de sardinas llevo esta semana?" y es la entrada directa que usa tanto el generador de menús como la lista de la compra dinámica (sección 6).

### 3.9 Requisitos ligados a un meal concreto

**Problema**: algunos requisitos nutricionales no son sobre el total del día, sino sobre un meal específico. Ej: el snack post-entreno necesita cierta cantidad de proteína **en sí mismo** (para la ventana de recuperación), no como parte de una suma diaria de proteína que podría venir de cualquier otro meal; el almuerzo necesita cierta cantidad de hidratos antes del entreno.

**Solución elegida**: no crear un tipo de entidad nueva, sino añadir un único campo opcional, `meal_id` (nullable), a `dietary_requirement` (ver 3.2):

- Si `meal_id` es `null` (caso general, todo lo descrito en 3.1–3.8): el requisito se evalúa contra el acumulado de **todo** el periodo (día o semana), sin importar en qué meal se consumió cada cosa. Es el comportamiento de siempre.
- Si `meal_id` no es `null`: el requisito se evalúa **solo** contra lo consumido en las ocurrencias de ese meal dentro del periodo — normalmente `period = day` y una única ocurrencia diaria de ese meal. El resto del modelo (scope_type/scope_ref, tolerance_margin, strictness, resolución de conflictos) funciona exactamente igual; `meal_id` solo acota de dónde sale el `accumulated`.

Esto es deliberadamente mínimo: reutiliza toda la maquinaria ya definida (3.2–3.8) en vez de introducir un segundo modelo de requisitos en paralelo. El generador, al resolver los huecos flexibles/semiflexibles de una dish para un meal concreto (sección 5), simplemente filtra primero los requisitos con `meal_id` igual al meal que está resolviendo, además de los requisitos globales (`meal_id = null`) que sigan abiertos ese día.

**Ejemplo**: "el snack post-entreno debe aportar ≥ 25g de proteína" → `dietary_requirement { scope_type: nutrient, scope_ref: protein_g_per_100, period: day, meal_id: <Snack post-entreno>, minimum: 25, unit: g, strictness: mandatory }`.

---

## 4. Boceto de esquema relacional (referencia)

Solo tablas, campos clave y relaciones — sin DDL SQL todavía (eso es fase 2). Pensado para Postgres (Supabase).

### 4.1 Modelo de acceso: Auth + RLS

Aunque es un sistema de un único usuario, se decide usar **Supabase Auth + Row Level Security desde el principio** (no un modelo simplificado sin auth), para no tener que migrar el esquema más adelante si el sistema se usa desde varios dispositivos o, eventualmente, alguien más lo usa:

- Cada tabla de datos (todas las listadas abajo) lleva una columna `owner_id uuid references auth.users`, no repetida fila a fila en el glosario de la sección 2.
- RLS activado en todas las tablas, con una policy básica por tabla: `owner_id = auth.uid()` para `select`/`insert`/`update`/`delete`.
- Todas las PKs son `uuid default gen_random_uuid()` (convención estándar de Supabase), no enteros autoincrementales.
- En la práctica hoy solo existe un `auth.users` (el propio usuario), así que `owner_id` es constante — pero el esquema ya queda preparado sin coste extra real.

### 4.2 Tablas

- **ingredient** (id, owner_id, name, base_unit, storage_type, opened_shelf_life_days, recommended_time, office_inventory, home_inventory, kcal_per_100, protein_g_per_100, carbs_g_per_100, sugar_g_per_100, fiber_g_per_100, fat_g_per_100, saturated_fat_g_per_100, sodium_mg_per_100, vitamin_c_mg_per_100, iron_mg_per_100, calcium_mg_per_100, omega3_g_per_100 — todos "por 100 base_unit")
- **ingredient_category** (id, owner_id, name) — ej. "Protein (salad)"
- **ingredient_category_link** (ingredient_id → ingredient, category_id → ingredient_category) — N:M
- **dish** (id, owner_id, name, dish_type) — sin `structure_type`, se deriva de `dish_ingredient` (ver sección 2)
- **dish_ingredient** (dish_id → dish, ingredient_id → ingredient nullable, category_id → ingredient_category nullable, slot_group, quantity, required)
- **meal** (id, owner_id, name, usual_start_time, usual_end_time)
- **meal_dish** (meal_id → meal, dish_id → dish, quantity_units)
- **supplement** (id, owner_id, ingredient_id → ingredient, frequency, meal_id → meal, relative_timing)
- **supplement_day** (supplement_id → supplement, day_of_week) — solo si la frecuencia es de días fijos (lunes/miércoles/viernes)
- **dietary_requirement** (id, owner_id, scope_type, scope_ref_id, period, week_reset_day, meal_id nullable → meal, minimum, maximum, unit, tolerance_margin, strictness, description)
- **requirement_log** (requirement_id → dietary_requirement, period_start, period_end, accumulated, fulfilled bool)
- **meal_log** (id, owner_id, date, meal_id → meal, dish_id → dish, confirmed bool) — para el "registro de comidas" mencionado como idea adicional en la idea original

---

## 5. Algoritmo de generación de menú (alto nivel)

Descripción en pseudocódigo/prosa, sin implementación:

```
para cada día a planificar:
  entrada:
    - inventario actual (home + office)
    - dietary requirements activos y su acumulado (requirement_log)
    - caducidades de ingredientes abiertos
    - catálogo de dishes pre-diseñadas, agrupadas por meal

  para cada uno de los 4 meals del día (en orden horario):
    candidatos = dishes del catálogo asociadas a ese meal
    requisitos_aplicables = dietary requirements con meal_id = este meal,
      más los requisitos globales (meal_id = null) aún abiertos ese periodo
    para cada candidato:
      si es fija -> composición ya determinada
      si es flexible/semiflexible -> resolver huecos:
        priorizar ingredientes:
          1. que ya están en inventario (evitar compra impulsiva)
          2. que ayudan a acercarse a un requisito mandatory no cumplido
             (de requisitos_aplicables, incluidos los propios de este meal)
          3. que caducan antes (evitar desperdicio)
          4. que no se hayan usado recientemente (norma de diversidad)
    filtrar candidatos que violen algún requisito mandatory (fuera de margen)
    elegir de entre los candidatos válidos (no determinista: puede haber empate,
      se puede introducir variación aleatoria controlada entre opciones igual de buenas)

  aplicar supplements correspondientes a cada meal, en su relative_timing

  actualizar requirement_log con lo generado (aún no consumido; se confirma
    después vía "registro de comidas")

  si algún requisito mandatory diario queda sin combinación válida ->
    señalar explícitamente al usuario (no fallar en silencio, ver 3.7)
```

El resultado por día es una propuesta concreta de las 4 comidas + supplements, ya lista para "abrir la nevera y tener todo lo necesario" (objetivo de "sentirse mágico" de la idea original).

---

## 6. Ciclo completo de alimentación

Las 4 fases de la idea original, conectadas explícitamente con el modelo de requisitos:

1. **Compra**: la lista de la compra (fase 4) se deriva de lo que falta en inventario para cubrir los próximos meals generados, priorizado por los requisitos mandatory pendientes (sección 3.7) y por caducidad.
2. **Elaboración de comida**: el sistema entrega la propuesta diaria del algoritmo de la sección 5; el usuario solo ejecuta (preparación mínima).
3. **Revisión de inventario**: tras comer, el usuario actualiza cantidades restantes en `ingredient.office_inventory` / `home_inventory`. Esto retroalimenta tanto el generador del día siguiente como la lista de la compra.
4. **Lista de la compra dinámica**: se recalcula a partir de (a) inventario actual, (b) dietary requirements con acumulado pendiente en su periodo vigente, y (c) caducidades — de forma que se compra lo justo y a tiempo, sin que el usuario tenga que pensarlo.

Este ciclo es circular: cada revisión de inventario alimenta la siguiente generación de menú y la siguiente lista de la compra, sin intervención manual más allá de confirmar datos.

---

## 7. Roadmap por fases

1. **Este documento de diseño** (actual).
2. **Modelo de datos + esquema Postgres (Supabase)**, dividido en sub-fases para no abordarlo como un único bloque monolítico:
   - **2a. Proyecto Supabase base**: crear el proyecto, activar Auth (email/password o magic link, con uno basta) y dejar confirmada la convención UUID + RLS de la sección 4.1.
   - **2b. DDL del esquema**: `CREATE TABLE` de las tablas de la sección 4.2, con `owner_id`/RLS/UUIDs, como migración SQL versionada (carpeta `supabase/migrations/`).
   - **2c. Datos semilla**: cargar el catálogo real ya descrito en este documento — los 4 meals, las dishes conocidas (bocadillo de pollo/pavo, ensalada con sus 5 categorías, etc.), los ingredientes de la ensalada, los supplements, y los `dietary_requirement` formalizados en 3.3 (los valores numéricos aún pendientes se cargan como placeholder explícito, no inventado).
   - **2d. Valores nutricionales reales**: rellenar los `*_per_100` de los ingredientes semilla, a mano para empezar — la integración con la API externa (sección 2) es posterior y no bloquea 2b/2c.
3. **Motor de generación de menú diario en TypeScript/Node**, implementando el algoritmo de la sección 5 sobre el esquema de Supabase de la fase 2.
4. **Web mobile-first** para gestión: ver/editar inventario, ver la propuesta del día, ver y tachar la lista de la compra.
5. **(Opcional, futuro) Uso de IA** donde aporte valor real — ver sección 8 para el listado de ideas concretas.

---

## 8. Ideas de uso de IA (fases futuras)

No entran en el alcance de v1, pero conviene dejarlas anotadas porque encajan de forma natural con este sistema y pueden orientar decisiones de diseño (ej. no cerrar puertas en el esquema). Ninguna de estas ideas sustituye al motor de generación determinista de la sección 5 — la norma de "nunca inventar comidas desde cero en tiempo real" se mantiene siempre.

1. **Sugerencia de nuevas dishes**: dado el catálogo existente y las categorías de ingredientes, un modelo puede proponer combinaciones nuevas (ej. variantes de ensalada o bocadillo) que el usuario revisa y aprueba antes de que entren al catálogo real — el sistema nunca las improvisa en producción, solo en este flujo de "alta asistida".
2. **Registro de comidas en lenguaje natural**: el usuario escribe algo como "me he comido el bocadillo y una manzana" y un modelo lo traduce a filas de `meal_log`, en vez de rellenar un formulario.
3. **Normalización de datos nutricionales externos**: al integrar la API/base de datos nutricional (sección 2), usar un modelo para resolver casos ambiguos de mapeo (nombres de nutrientes distintos, unidades no directas) que una capa de normalización puramente basada en reglas no cubra bien.
4. **Detección de patrones de incumplimiento**: analizar el `requirement_log` histórico para detectar incumplimientos recurrentes (ej. "llevas 3 semanas seguidas sin llegar al mínimo de fibra los viernes") y sugerir ajustes al catálogo o a los requisitos, en vez de que el usuario tenga que notarlo por sí mismo.
5. **Chat conversacional sobre el estado del sistema**: preguntas tipo "¿qué me falta esta semana?" o "cámbiame el snack de mañana por otra opción con menos hidratos", resueltas contra el estado real (inventario, requirement_log, catálogo) en vez de una UI de formularios para todo.

---

## 9. Decisiones tomadas y preguntas abiertas

### Resueltas en este ciclo

- **Fuente de datos nutricionales**: API/base de datos externa (USDA, OpenFoodFacts) + capa de normalización propia, con overrides/altas manuales del usuario con prioridad. Ver sección 2.
- **Categorías de ingrediente**: entidad abierta, el usuario podrá crear categorías nuevas. Ver sección 2.
- **Supplements en días no diarios**: se gestionan solo como regla de calendario (`supplement_day`), sin generar un `dietary_requirement` asociado — quedan fuera del motor de requisitos.
- **`tolerance_margin` por defecto**: 10%. Ver 3.5.
- **Definición de "ración"**: cantidad en gramos (o ml/unidades) independiente del envase de compra. Ver 3.3.
- **`structure_type` de Dish**: eliminado como columna, se deriva de `dish_ingredient.required`. Ver sección 2.
- **Horario de Meal**: rango (`usual_start_time`/`usual_end_time`) en vez de instante único. Ver sección 2.
- **Requisitos ligados a un meal concreto**: campo opcional `meal_id` en `dietary_requirement`. Ver 3.9.
- **Stack de persistencia**: Postgres vía Supabase (en vez de SQLite).
- **Lista cerrada de micronutrientes a trackear**: macros completos + sodio, vitamina C, hierro, calcio y omega-3. Ver sección 2 y 4.1.
- **Modelo de acceso**: Supabase Auth + RLS desde el principio (`owner_id` en todas las tablas), aunque hoy solo haya un usuario. Ver 4.1.
- **Estrategia de IDs**: `uuid` con `gen_random_uuid()` en todas las PKs, no enteros autoincrementales. Ver sección 2 y 4.1.
- **División de la fase 2**: en sub-fases 2a–2d (proyecto Supabase, DDL, datos semilla, valores nutricionales reales). Ver [Roadmap](#7-roadmap-por-fases).
- **Vitamina C mínima diaria**: 80mg (NRV UE para adultos). Ver 3.3.
- **Proteína mínima post-entreno**: 35g, calculado como 0,3–0,4 g/kg de peso corporal del usuario. Ver 3.3.
- **Equivalencia ración → gramos** (necesaria para cargar sardinas/atún como datos semilla): 1 ración de pescado en lata = 120g (asunción tomada al escribir la fase 2c, ajustable). Ver `supabase/migrations/20260726130000_seed_initial_catalog.sql`.

### Aún abiertas

- **Alcance de la fase 5 (IA)**: de las 5 ideas de la sección 8, cuál (si alguna) se aborda primero — no es necesario decidirlo ahora, solo antes de empezar esa fase.
- **Gramos de hidratos en el almuerzo**: mencionado como idea en la sección 9 original, pero nunca se formalizó como fila en 3.3 — no bloquea nada, se puede añadir como `dietary_requirement` nuevo cuando se decida.
