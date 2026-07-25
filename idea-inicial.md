Quiero crear sistema personal para gestionar parte de mi dieta y todo lo asociado con ella (compra, inventario, conocimiento de qué cantidades de nutrientes estoy tomando, etc).

## Normas básicas

### 1. Sano

Si un bocadillo de jamón no es sano, entonces no lo incorporaremos en este plan. Todo lo que incorporemos debe ser una dieta equilibrada. Somos lo que comemos. Lo que planifiquemos aquí formará parte de mi rutina diaria.

### 2. Homogéneo

La preparación y tipo de comida debe ser igual cada día, para que sea una rutina. Por ejemplo, la comida será siempre una ensalada que me pueda preparar en la oficina sin cocinar.

### 3. Diverso

Los alimentos deben ir variando para mantener una dieta balanceada. Por ejemplo, aunque para comer me haga una ensalada cada día, no debería usar siempre atún (rico en metales pesados), sino que debería ir rotando de ingrediente proteico.

### 4. Preparación mínima

Sencillo y rápido. Nada de cocina. Solo añadir ingredientes (por ejemplo, una ensalada o un bocadillo), o que no haya preparación en absoluto (por ejemplo, una manzana). La máxima preparación aceptada sería pelar un huevo cocido (que lo habría comprado ya cocido) o hacer algo al microondas..

## Conceptos básicos

### Ingrediente

Alimento que se puede comprar, antes de usar en una comida. Cada ingrediente puede tener valores como los siguientes:

- Valores nutricionales
- Tipología por método de almacenamiento
- Tiempo de caducidad una vez abierto
- Tipología por momento del día en que se recomienda tomar
- Inventario actual en la oficina
- Inventario actual en casa

### Comida

Conjunto de 1 o más ingredientes que completan una unidad alimenticia.

Dado que nuestro sistema se basa en no cocinar y preparaciones muy sencillas, las comidas son meros conjuntos de ingredientes.

Dichos conjuntos deben estar pre-diseñados. No podemos combinar cualquier conjunto de ingredientes (por ejemplo, un bocadillo no debería contener anchoas y atún al mismo tiempo). Por supuesto, esto es subjetivo, depende de la cultura y los gustos individuales. Por ello, nuestro sistema no debería inventar comidas desde cero. Así que las comidas deben estar pre-diseñadas.

Algunas sí pueden ser variables porque son muy flexibles. Por ejemplo, para elaborar una ensalada, nos sirve cualquier combinación que incluya 1 o más ingredientes de cada categoría de *ingrediente de ensalada* (Fibra y vitaminas, Proteína, Hidratos, Grasa, Aliños); así que aquí no importa la combinación.

Nuestro sistema debe aceptar tres tipos de comidas:

- Comida fija: por ejemplo, un bocadillo con 4 ingredientes obligatorios sin más.
- Comida flexible: por ejemplo, una ensalada. Sería la combinación de 5 ingredientes de 5 conjuntos respectivamente.
- Comida semiflexible: por ejemplo, un bocadillo puede tener una parte fija y otra flexible, es decir, un ingrediente de un conjunto. Seguramente, la mayoría de comidas serían de este tipo.

Un ejemplo mínimo de comida podría ser este:

```yaml
- Nombre: Bocadillo de pollo/pavo con pimientos
  Ingredientes:
  - Pan (200g)
  - Lonchas de pollo (50g) O Lonchas de pavo (60g)
  - Lonchas de queso (20g)
  - Mezclum (20g)
  - Pimientos asados de bote (10g)
  - Salsa de miel y mostaza (3g)
  Valores nutricionales: (suma de la lista de ingredientes)
  Tipo: Bocadillo
```

(Por supuesto, esto solo es para hacernos una idea del concepto "comida"; una base de datos real haría referencias a foreign keys de ingredientes, etc).

### Meal

Una actividad de comida (en nuestro caso pueden ser cuatri: desayuno, desayuno de media mañana, almuerzo, y snack post-entreno).

Consiste en un conjunto de 1 o más comidas.

Por ejemplo:

- Hora: 8:00
- Comidas:
  - Bocadillo de pollo/pavo con pimientos (1)
  - Manzana (1)
  - Batido de proteína (1)
- Valores nutricionales: (suma de la lista de comidas)

### Suplemento

Los suplementos serían ingredientes que se deben tomar:

- Sin flexibilidad. Es decir, se introducen en la dieta de forma determinista.
- Con una frecuencia estricta (normalmente 1 vez al día, pero a veces en días fijos, por ejemplo, lunes, miércoles y viernes).
- En uno o varios meals concretos
- En un momento definido del meal (por ejemplo: antes de empezar, en ayunas; o justo después de terminar, con el estómago lleno; o dos horas después de terminar)

Los suplementos tienen sus propios valores nutricionales que se deben tener en cuenta en los cálculos.

Los suplementos y sus valores son definidos por el usuario.

Algunos ejemplos de lo que consideramos "suplementos":

- Pastillas de vitamina C
- "La poción de mi entrenador" (agua con cúrcuma, creatina, sal y pimienta)


## Mi problema y "meals" a planificar

Mi rutina habitual es algo así:

- 8:00. Tomo un café en casa y como algo rápido.
- 8:30. Estoy en la oficina.
- 10:45. Bajo a tomar un café y un bocadillo con las compañeras.
- 14:30. Almuerzo algo en el escritorio de la oficina.
- 15:30. Salgo de la oficina.
- 16:00. Entrenamiento de calistenia con mi entrenador personal.
- 17:30. Termina el entrenamiento. Momento para hacer recados.
- 20:30. Llego a casa y me hago algo rápido de cenar.

Como ves, paso muchas horas fuera de casa y no tengo mucho tiempo de cocinar los cuatro primeros meals (desayuno, comida de media mañana, almuerzo, snack post-entreno), ni tampoco de pensarlo. Al final acabo gastando dinero  y tiempo comprando algo cada día al vuelo, y en conjunto no como de forma saludable.

Así que quiero un sistema para gestionar esos cuatro primeros meals.

No quiero que el sistema planifique mis cenas (ya que ahí sí que cocino, disfruto haciéndolo y ya tengo un buen sistema, además, la adaptaré según lo que haya comido anteriormente en el día, y al ser cocinado, complicaría mucho este sistema). Recuerda, este sistema se basa en comida sin cocinar.

Así que estos son los meals a planificar:

### 1. Desayuno en casa

Es algo que debo tomar muy rápido. No tengo tiempo de sentarme a comer más de 10 minutos.

Actualmente tomo lo siguiente:

- "Poción de mi entrador" (agua con cúrcuma, sal, pimienta y creatina) - en ayunas
- A veces, papilla para bebés diluida en leche
- A veces una fruta
- A veces, una tostada de pan de maíz con queso crema o hummus y una loncha de pavo o queso

### 2. Snack de media mañana (en la oficina)

Aquí tengo unos 20 minutos para comer.

Es el momento en que bajo con mis compañeras al bar a tomar con un café.

Normalmente pido un bocadillo en el bar. Pero puedo traer uno de casa (o algo que no sea un bocadillo, claro).

Este meal me lo puedo preparar rápidamente en casa por la mañana (como un bocadillo), o puede no requerir preparación (como una pieza de fruta).

### 3. Comida al mediodía (en la oficina)

Esto lo tomo en mi escritorio mientras trabajo, y puedo tardar 5-10 minutos en prepararlo, y 30-40 minutos en comerlo, mientras trabajo.

Debe preparar a mi cuerpo para el entreno con mi entrenador personal (mayormente calistenia) que ocurrirá 1 o 2 horas después (puedo comer cuando quiera, así que podemos ajustar este tiempo como queramos).

En la oficina dispongo del siguiente equipamiento de cocina:

- Pequeño armario
- Nevera
- Microondas
- Congelador (pero hay poco espacio, si se puede evitar su uso, mejor)

Para este meal, me gusta el enfoque de preparar una ensalada. Todos sus ingredientes deben estar ya listos para simplemente añadir a un bol y mezclar. Añadiría uno o varios ingredientes de cada una de los siguientes conjuntos:

```
Fibra y vitaminas

- 🥬 Mezclum
- 🍅 Tomates cherry
- 🌽 Maíz
- 🥕 Zanahoria rallada en bolsa
- 🥒 Pepino (mini o ya cortado)
- 🫑 Pimientos en tiras (crudos o de bote)
- 🍠 Remolacha cocida (envasada al vacío)
- 🥬 Espinacas baby
- 🌿 Rúcula
- 🌱 Brotes (soja, alfalfa…)
- 🍄 Champiñones laminados (crudos)
- 🥬 Col lombarda o col rallada tipo “ensalada preparada”
- 🧅 Cebolla crujiente (tipo topping, además suma textura)
- 🍎 Fruta: manzana, mango, granada (contraste brutal)

Proteína

- 🐟 Salmón en lata
- 🐟 Atún en lata
- 🍗 Tiras de pollo
- 🥚 Huevo cocido (lo venden ya cocido, la preparación solo consiste en pelarlo)
- 🍖 Jamón cocido o pavo en tiras
- 🧀 Queso fresco (tipo Burgos)
- 🥫 Legumbres de bote: garbanzos, lentejas, alubias
- 🫛 Hummus
- 🧊 Tofu listo para consumir
- 🫛 Edamame cocido (a veces lo venden listo)
- 🦀 Surimi

Hidratos

- 🥖 Picatostes
- 🍚 Arroz cocido (vasitos o bolsitas)
- 🍚 Quinoa cocida
- 🥣 Cous cous ya preparado (lo venden listo en frío)
- 🌯 Tortillas de trigo cortadas en tiras
- 🫓 Pan de pita en trozos

Grasa

- 🥜 Frutos secos
- 🌰 Semillas (chía, lino, sésamo, calabaza, girasol)
- 🧀 Queso en piezas pequeñas (feta, mozzarella, parmesano)
- 🥒 Encurtidos: pepinillos, cebollitas

Aliños

- 🥗 Vinagretas preparadas (mostaza y miel, balsámica…)
- 🌿 Pesto (como aliño)
- 🥑 Guacamole
- 🍶 Mayonesa
- 🥢 Salsa de soja o teriyaki
```

Otros tipos de comida podrían hacerse en microondas, como hacer un salmón al vapor con una Lekué.

### 4. Snack post-entreno

Después del entreno, a menudo pasan horas hasta que llego a casa. Pero sé que debo tomar cosas para la salud e hipertrofia, como una bebida isotónica, quizás un plátano, y proteínas de absorción rápida. Deberíamos añadir algo aquí también.

## Objetivos del sistema

### Asegurar la ingesta de requisitos dietéticos

Se deben definir requisitos dietéticos medibles.

Hay que pensar cómo definirlos. Creo que hay que tener en cuenta varios puntos de vista:

- Dos puntos de vista temporales: diario y semanal. Ya que hay ingredientes que deben consumirse diariamente y otros que deben consumirse con menos regularidad (por ejemplo, 2 veces a la semana).
- Dos puntos de vista cualitativos: por alimento y por nutriente. Ya que la ingesta de diferentes tipos de ingredientes no garantiza la de diferentes nutrientes (por ejemplo, haber tomado dos frutas no garantiza la ingesta mínima de vitamina C, así que si ese día no se ha tomado fruta con un aporte mínimo de vitmaina C, se tendrá que obtener de otra fuente escogiendo, per ejemplo, una verdura que sí la aporte).

Por lo tanto, deberíamos establecer las ingestas *mínimas* y *máximas*:

- Ingestas de ingredientes mínimas y máximas diarias (por ejemplo: X a Y piezas de fruta)
- Ingestas de ingredientes mínimas y máximas semanales (por ejemplo: X a Y raciones de pescado blanco)
- Ingestas de nutrientes mínimos y máximos diarias (por ejemplo: X a Y cantidad de vitamina C, X a Y cantidad de ingredientes antiinflamatorios)

A partir de ahí, se puede generar un sistema de creación de combinaciones de comidas / meals que garantice las ingestas mínimas y máximas.

Este sistema no debería ser determinista y debería aceptar márgenes de error.

Por cierto, un requisito que ya te digo que quiero incorporar son 2 latas de sardinas a la semana.

### Integrar todo el ciclo de la alimentación

El sistema debe minimizar la carga mental y la toma de decisiones en el día a día. Para ello, tendrá control de qué tenemos en cada momento, qué conviene comer hoy, etcétera.

El ciclo de la alimentación puede consistir en estas cuatro partes:

- Compra: cada día o varias veces a la semana, puedo ir a comprar lo que mi lista de la compra. El sistema me dice qué comprar, yo no tengo que pensarlo.
- Elaboración de comida: el sistema me dice lo que debo comer cada día, sin que yo tenga que preocuparme de "qué voy a comer hoy". Se debe sentir mágico: el sistema me dice que haga algo, abro la nevera, y tengo todo lo necesario para hacerlo.
- Revisión de "inventario": cada día, tras comer, puedo abrir la nevera en la oficina, revisar qué tengo, y actualizar mis datos inventario en el sistema.
- Elaboración de una lista de la compra dinámica: el sistema mantiene una la lista de la compra actualizada automáticamente a partir de mi "inventario", mis requisitos dietéticos dieta, los tiempos de caducidad de los alimentos una vez abiertos

La lista de la compra y mis siguientes meals se actualizarían solos teniendo en cuenta factores como mi "inventario" actual, los requisitos dietéticos, el tiempo de caducidad de ingredientes abiertos, etcétera.

Ideas adicionales que el sistema puede llegar a añadir eventualmente:

- Un registro de comidas, que podría consistir en la confirmación de si he comido lo que me ha propuesto, además de poder añadir otros items con su hora.

## Algunas posibles herramientas para nuestro sistema

Quizás nuestro sistema deberá hacer uso de herramientas como las siguientes, entre otras.

### Base de datos

Para que el sistema sea potente, se debe basar en datos.

Según el tamaño del sistema, podría ser un simple CSV o una base de datos SQL (o SQLite) con su API.

Algunas tablas importantes serían la de ingredientes y la de comidas (véase el glosario).

### Página web para gestionar mi sistema y estado actual

Un front-end para ver, modificar, o borrar datos como usuario. Mobile-first.

### Uso de IA

Debemos detectar posibles features que se puedan servir de IA y valorar si la incorporamos. Tengo suscripciones y API keys de varias compañías de IA que puedo usar.

## Notas random

### El método del aguacate congelado

Mi entrenador personal me ha dicho que debo tomar un aguacate al día. Esta es mi idea para maximizar la eficiencia:

- Tengo aguacate congelado en casa.
- Cada mañana pongo 100 gramos (equivalente aproximado a la parte comestible de un aguacate) en un pequeño tupper.
- Lo llevo a la oficina.
- Para la hora de comer, el aguacate está ya descongelado, y lo puedo poner como topping en la ensalada.

Este método puede servir para otro tipo de alimentos; no dudes en tenerlo en cuenta para cualquier alimento en que lo veas compatible. Si es necesario puedo llevar más de un tupper con este fin.