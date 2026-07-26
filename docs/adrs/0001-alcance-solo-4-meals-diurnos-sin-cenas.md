# ADR-0001: Alcance de v1 limitado a 4 meals diurnos, cenas fuera de alcance

- **Estado**: Aceptada
- **Fecha**: 2026-07-25

## Contexto

El usuario pasa fuera de casa la mayor parte del día y no tiene tiempo ni ganas de pensar qué comer en el desayuno, el snack de media mañana, el almuerzo de oficina y el snack post-entreno. Las cenas, en cambio, las cocina, disfruta haciéndolo, ya tiene un sistema propio para ellas, y su composición depende de lo que se haya comido durante el día — lo que rompería la asunción central del sistema de que las comidas son atómicas y predecibles.

## Decisión

El sistema (v1) planifica únicamente los 4 meals diurnos sin cocina: desayuno en casa, snack de media mañana, almuerzo de mediodía y snack post-entreno. Las cenas quedan explícitamente fuera de alcance.

## Alternativas consideradas

- **Incluir las cenas como un quinto meal**: descartado porque implican cocina (viola la norma de "preparación mínima") y dependerían de lo consumido en el resto del día, complicando mucho el modelo de generación.

## Consecuencias

- El modelo de datos y el algoritmo de generación (sección 5 de `diseno-sistema.md`) solo necesitan razonar sobre comidas atómicas sin ajuste dinámico intra-día basado en cocina.
- Cualquier extensión futura a cenas debería tratarse como un subsistema aparte, no integrarse como un quinto meal igual a los otros cuatro.
