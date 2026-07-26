# Diseño: fase 3 — motor de generación de menú diario

> Resultado del brainstorming previo a implementar la fase 3. Complementa (no sustituye) la sección 5 de [`../diseno-sistema.md`](../diseno-sistema.md), que describe el algoritmo a alto nivel; aquí se cierran las decisiones de implementación que ese documento deja abiertas a propósito.

## Contexto

El modelo de datos (fases 2a–2d) ya está completo en Supabase: esquema con RLS, y el catálogo real (59 ingredientes, 6 dishes, 4 meals, 1 supplement, 5 dietary_requirement). La fase 3 implementa el motor que, para un día dado, genera una propuesta concreta de las 4 comidas. La sección 5 del diseño da el algoritmo en pseudocódigo pero deja sin cerrar: cómo se invoca, si escribe en BD, cómo se resuelve "diversidad", cómo se decide entre candidatos empatados, y la estrategia de testing.

## Decisiones

1. **Invocación**: CLI (`npm run generate`), no una librería/API pensada para la fase 4 todavía. Imprime en terminal; la web futura reutilizará las mismas funciones del motor.
2. **Escritura en BD**: ninguna. El CLI es de solo lectura — no toca `requirement_log` ni `meal_log`. Eso llega con el flujo de confirmación real (fase 4).
3. **Tipos**: generados con `supabase gen types typescript --linked` (verificado que funciona contra el proyecto real sin necesitar contraseña, solo el access token), no mantenidos a mano.
4. **Diversidad**: se implementa ya (consulta `meal_log` de los últimos **3 días**), aunque hoy sea un no-op porque `meal_log` está vacío (nada escribe ahí todavía). Funcionará en cuanto exista historial real.
5. **Aleatoriedad controlada**: semilla por fecha (`date` del día generado) — misma fecha, mismo resultado; distinta fecha, puede variar. Facilita depurar.
6. **Testing**: unit tests con `vitest` sobre `src/engine/` usando fixtures en memoria (no contra Supabase real). `src/data/` (acceso real) se valida solo ejecutando el CLI.

## Estructura del proyecto

```
package.json, tsconfig.json          -- raíz del repo, sin monorepo
src/
  cli.ts                             -- entrypoint de `npm run generate`
  data/
    database.types.ts                -- generado, no editar a mano
    fetchDailyContext.ts              -- única función de acceso a Supabase
  engine/
    resolve.ts                       -- resolución de huecos + filtrado por requisitos
    diversity.ts                     -- consulta meal_log últimos 3 días
    random.ts                        -- random con semilla por fecha
    types.ts                         -- tipos de dominio (DailyContext, MealProposal...)
  engine/*.test.ts                   -- unit tests (vitest)
```

Dependencias: `@supabase/supabase-js`, `typescript`, `tsx` (ejecución), `vitest` (tests). Acceso a Supabase vía `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (ya en `.env`) — sin login de Auth, porque es un script personal de un único usuario; se revisará en la fase 4, que sí necesitará sesión real vía `anon key`.

## Algoritmo de resolución (`engine/resolve.ts`)

Para cada uno de los 4 meals, en orden horario:

1. **Candidatos** = dishes ligadas vía `meal_dish`. Fija → composición ya determinada. Flexible/semiflexible → cada `dish_ingredient` con `category_id` es un hueco a resolver.
2. **Resolución de un hueco**: los ingredientes de esa categoría se ordenan por 3 niveles de prioridad (orden, no descarte duro): (a) en inventario ≥ cantidad necesaria, (b) ayuda a un `dietary_requirement` *mandatory* aún no cumplido (propio del meal vía `meal_id`, o global), (c) no aparece en `meal_log` de los últimos 3 días. Empate exacto → random con semilla de fecha.
3. **Limitación conocida y aceptada**: no se prioriza por caducidad. El esquema guarda `opened_shelf_life_days` pero no la fecha real de apertura de cada ingrediente, así que no hay caducidad real que calcular todavía. Queda fuera de esta fase.
4. **Filtrado final por dish**: se suma el aporte total de la dish resuelta y se compara contra los `dietary_requirement` *mandatory* aplicables (con `tolerance_margin`); si lo violaría, se descarta como candidata.
5. Si un meal se queda sin candidata válida, no se elige "lo menos malo" — se marca explícitamente en el output con el motivo.

## Output del CLI

Por cada meal (en orden horario): nombre, ventana horaria, dish elegida con ingredientes y cantidades resueltas, supplement aplicable si lo hay. Si no hay candidata válida: aviso explícito con motivo, no se omite. Al final, resumen de los `dietary_requirement` del día (o de la semana con su acumulado), su valor tras la propuesta, y si cae dentro de `[effective_minimum, effective_maximum]`. Formato texto plano en terminal — sin JSON ni tablas, es una herramienta personal.

## Testing y manejo de errores

- Unit tests (vitest) sobre `engine/` con fixtures pequeños en memoria: resolución de hueco flexible, priorización (inventario/requisito/diversidad), empate resuelto por semilla, dish descartada por violar un requisito mandatory, meal sin candidata válida.
- `data/` no lleva unit tests; se verifica ejecutando el CLI real.
- Fallos de conexión/variables de entorno: el CLI falla rápido con mensaje claro, sin reintentos ni fallback silencioso.
- "Meal sin propuesta válida" no es una excepción — es un resultado válido del algoritmo que el CLI imprime como aviso.

## Verificación

- `npm test` (vitest) en verde para los casos de `engine/` listados arriba.
- `npm run generate` ejecutado contra el proyecto real `meal-pilot` produce una propuesta completa de los 4 meals de hoy, con el resumen de requisitos, sin errores.
