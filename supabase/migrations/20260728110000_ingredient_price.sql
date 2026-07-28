-- Precio aproximado de cada ingrediente, para poder mostrar el precio
-- aproximado de cada dish (suma de sus componentes, ver computeDishPrice en
-- @meal-pilot/core). Sigue la misma convención que las columnas
-- nutricionales: "por 100 base_unit" (100g, 100ml, o 100 unidades) — así
-- `price = price_eur_per_100 * quantity / 100` funciona igual para los tres
-- tipos de unidad, sin casos especiales. EUR es la única moneda del sistema
-- (no hay columna de moneda: asunción de v1, como el resto de asunciones de
-- este catálogo).
alter table ingredient add column price_eur_per_100 numeric;

-- Precios aproximados (mercado español, 2026, estimación a mano — no vienen
-- de ninguna API; ajustables después). Para ingredientes en unidades (huevo,
-- fruta, pastillas...), el valor es el precio de 100 unidades (ej. huevo a
-- 0,25€/unidad -> 25.00).
update ingredient set price_eur_per_100 = v.price
from (values
  ('e0000000-0000-0000-0000-000000000042', 0.70),  -- Aguacate (congelado, racion 100g)
  ('e0000000-0000-0000-0000-000000000026', 0.20),  -- Alubias de bote
  ('e0000000-0000-0000-0000-000000000033', 0.25),  -- Arroz cocido (vasito)
  ('e0000000-0000-0000-0000-000000000018', 0.90),  -- Atun en lata
  ('e0000000-0000-0000-0000-000000000057', 0.20),  -- Bebida isotonica
  ('e0000000-0000-0000-0000-000000000010', 0.60),  -- Brotes (soja, alfalfa)
  ('e0000000-0000-0000-0000-000000000013', 0.80),  -- Cebolla crujiente
  ('e0000000-0000-0000-0000-000000000011', 0.40),  -- Champiñones laminados
  ('e0000000-0000-0000-0000-000000000012', 0.25),  -- Col lombarda / rallada
  ('e0000000-0000-0000-0000-000000000035', 0.30),  -- Cous cous ya preparado
  ('e0000000-0000-0000-0000-000000000041', 0.40),  -- Encurtidos (pepinillos, cebollitas)
  ('e0000000-0000-0000-0000-000000000008', 0.50),  -- Espinacas baby
  ('e0000000-0000-0000-0000-000000000038', 1.20),  -- Frutos secos
  ('e0000000-0000-0000-0000-000000000024', 0.20),  -- Garbanzos de bote
  ('e0000000-0000-0000-0000-000000000045', 0.90),  -- Guacamole
  ('e0000000-0000-0000-0000-000000000020', 25.00), -- Huevo cocido (unit)
  ('e0000000-0000-0000-0000-000000000027', 0.60),  -- Hummus
  ('e0000000-0000-0000-0000-000000000021', 0.90),  -- Jamon cocido en tiras
  ('e0000000-0000-0000-0000-000000000054', 0.09),  -- Leche
  ('e0000000-0000-0000-0000-000000000025', 0.20),  -- Lentejas de bote
  ('e0000000-0000-0000-0000-000000000050', 1.00),  -- Lonchas de pavo
  ('e0000000-0000-0000-0000-000000000049', 0.90),  -- Lonchas de pollo
  ('e0000000-0000-0000-0000-000000000051', 0.80),  -- Lonchas de queso
  ('e0000000-0000-0000-0000-000000000003', 0.20),  -- Maiz cocido (bote)
  ('e0000000-0000-0000-0000-000000000015', 100.00),-- Mango (unit)
  ('e0000000-0000-0000-0000-000000000014', 40.00), -- Manzana (unit)
  ('e0000000-0000-0000-0000-000000000046', 0.40),  -- Mayonesa
  ('e0000000-0000-0000-0000-000000000001', 0.70),  -- Mezclum
  ('e0000000-0000-0000-0000-000000000055', 150.00),-- Pan de maiz (unit)
  ('e0000000-0000-0000-0000-000000000037', 0.30),  -- Pan de pita en trozos
  ('e0000000-0000-0000-0000-000000000048', 0.25),  -- Pan de sandwich
  ('e0000000-0000-0000-0000-000000000053', 0.60),  -- Papilla para bebes
  ('e0000000-0000-0000-0000-000000000060', 30.00), -- Pastillas para el pelo (unit)
  ('e0000000-0000-0000-0000-000000000022', 0.90),  -- Pavo en tiras
  ('e0000000-0000-0000-0000-000000000005', 0.15),  -- Pepino
  ('e0000000-0000-0000-0000-000000000044', 1.00),  -- Pesto
  ('e0000000-0000-0000-0000-000000000032', 0.50),  -- Picatostes
  ('e0000000-0000-0000-0000-000000000006', 0.40),  -- Pimientos en tiras
  ('e0000000-0000-0000-0000-000000000058', 30.00), -- Platano (unit)
  ('e0000000-0000-0000-0000-000000000052', 0.30),  -- Pocion del entrenador
  ('e0000000-0000-0000-0000-000000000061', 40.00), -- Probiotico (unit)
  ('e0000000-0000-0000-0000-000000000059', 2.50),  -- Proteina en polvo
  ('e0000000-0000-0000-0000-000000000056', 0.60),  -- Queso crema
  ('e0000000-0000-0000-0000-000000000040', 1.20),  -- Queso en piezas
  ('e0000000-0000-0000-0000-000000000023', 0.60),  -- Queso fresco (tipo Burgos)
  ('e0000000-0000-0000-0000-000000000034', 0.50),  -- Quinoa cocida
  ('e0000000-0000-0000-0000-000000000007', 0.30),  -- Remolacha cocida
  ('e0000000-0000-0000-0000-000000000009', 0.80),  -- Rucula
  ('e0000000-0000-0000-0000-000000000017', 1.20),  -- Salmon en lata
  ('e0000000-0000-0000-0000-000000000047', 0.40),  -- Salsa de soja o teriyaki
  ('e0000000-0000-0000-0000-000000000031', 0.70),  -- Sardinas en lata
  ('e0000000-0000-0000-0000-000000000039', 1.00),  -- Semillas
  ('e0000000-0000-0000-0000-000000000030', 0.70),  -- Surimi
  ('e0000000-0000-0000-0000-000000000019', 0.80),  -- Tiras de pollo (cocidas)
  ('e0000000-0000-0000-0000-000000000002', 0.30),  -- Tomates cherry
  ('e0000000-0000-0000-0000-000000000036', 0.40),  -- Tortillas de trigo en tiras
  ('e0000000-0000-0000-0000-000000000043', 0.50),  -- Vinagreta preparada
  ('e0000000-0000-0000-0000-000000000004', 0.30)   -- Zanahoria rallada (bolsa)
) as v(id, price)
where ingredient.id = v.id::uuid;
