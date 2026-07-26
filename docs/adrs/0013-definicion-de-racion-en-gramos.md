# ADR-0013: Definición de "ración" en gramos, independiente del envase de compra

- **Estado**: Aceptada
- **Fecha**: 2026-07-26

## Contexto

Varios requisitos por ingrediente se expresan en "raciones" (ej. "2 latas de sardinas a la semana"). Había que decidir si una ración equivale a una unidad de compra (una lata, un paquete) o a una cantidad fija en gramos/ml/unidades independiente del envase concreto.

## Decisión

Una ración es siempre una cantidad en gramos (o ml/unidades, según `base_unit` del ingrediente), definida de forma independiente del envase de compra. Por ejemplo, "2 latas de sardinas/semana" se traduce a una cantidad fija en gramos (ej. 2 raciones = 240g), no a "2 unidades de compra".

## Alternativas consideradas

- **Ración = unidad de compra**: más intuitivo de expresar en lenguaje natural ("2 latas"), pero frágil: el tamaño real de una lata varía entre marcas/formatos, y el requisito nutricional de fondo es una cantidad de alimento, no un número de envases.

## Consecuencias

- El cálculo de cumplimiento (sección 3.4) compara siempre cantidades en gramos/ml/unidades contra el inventario real, nunca un conteo de envases.
- Al cargar un requisito tipo "X raciones", los datos semilla deben fijar explícitamente el equivalente en gramos, no dejarlo implícito.
