-- Cantidad máxima razonable de un ingrediente en un único plato (ej. nunca
-- tiene sentido 1kg de alubias en un plato — siempre hablamos de raciones
-- individuales). Nullable: un ingrediente sin máximo definido no se avisa
-- ni se excluye de sugerencias (ver engine/suggestions.ts). Usado por el
-- creador de platos para el aviso en rojo de "máximo superado" y para que
-- las sugerencias de "añadir" nunca propongan pasarse de este límite.
alter table ingredient add column max_quantity_per_dish numeric;

-- Valores aproximados a criterio (permisivos pero no ilimitados, mismo
-- espíritu que el resto de asunciones de este catálogo). En base_unit del
-- ingrediente (g, ml, o unidades).
update ingredient set max_quantity_per_dish = v.max_qty
from (values
  ('e0000000-0000-0000-0000-000000000042', 100),  -- Aguacate (congelado, racion 100g)
  ('e0000000-0000-0000-0000-000000000026', 150),  -- Alubias de bote
  ('e0000000-0000-0000-0000-000000000033', 200),  -- Arroz cocido (vasito)
  ('e0000000-0000-0000-0000-000000000018', 160),  -- Atun en lata
  ('e0000000-0000-0000-0000-000000000057', 600),  -- Bebida isotonica
  ('e0000000-0000-0000-0000-000000000010', 60),   -- Brotes (soja, alfalfa)
  ('e0000000-0000-0000-0000-000000000013', 20),   -- Cebolla crujiente
  ('e0000000-0000-0000-0000-000000000011', 100),  -- Champiñones laminados
  ('e0000000-0000-0000-0000-000000000012', 100),  -- Col lombarda / rallada
  ('e0000000-0000-0000-0000-000000000035', 200),  -- Cous cous ya preparado
  ('e0000000-0000-0000-0000-000000000041', 50),   -- Encurtidos (pepinillos, cebollitas)
  ('e0000000-0000-0000-0000-000000000008', 100),  -- Espinacas baby
  ('e0000000-0000-0000-0000-000000000038', 40),   -- Frutos secos
  ('e0000000-0000-0000-0000-000000000024', 150),  -- Garbanzos de bote
  ('e0000000-0000-0000-0000-000000000045', 80),   -- Guacamole
  ('e0000000-0000-0000-0000-000000000020', 3),    -- Huevo cocido (unit)
  ('e0000000-0000-0000-0000-000000000027', 80),   -- Hummus
  ('e0000000-0000-0000-0000-000000000021', 100),  -- Jamon cocido en tiras
  ('e0000000-0000-0000-0000-000000000054', 300),  -- Leche
  ('e0000000-0000-0000-0000-000000000025', 150),  -- Lentejas de bote
  ('e0000000-0000-0000-0000-000000000050', 100),  -- Lonchas de pavo
  ('e0000000-0000-0000-0000-000000000049', 100),  -- Lonchas de pollo
  ('e0000000-0000-0000-0000-000000000051', 80),   -- Lonchas de queso
  ('e0000000-0000-0000-0000-000000000003', 100),  -- Maiz cocido (bote)
  ('e0000000-0000-0000-0000-000000000015', 1),    -- Mango (unit)
  ('e0000000-0000-0000-0000-000000000014', 2),    -- Manzana (unit)
  ('e0000000-0000-0000-0000-000000000046', 40),   -- Mayonesa
  ('e0000000-0000-0000-0000-000000000001', 100),  -- Mezclum
  ('e0000000-0000-0000-0000-000000000055', 2),    -- Pan de maiz (unit)
  ('e0000000-0000-0000-0000-000000000037', 100),  -- Pan de pita en trozos
  ('e0000000-0000-0000-0000-000000000048', 150),  -- Pan de sandwich
  ('e0000000-0000-0000-0000-000000000053', 60),   -- Papilla para bebes
  ('e0000000-0000-0000-0000-000000000060', 2),    -- Pastillas para el pelo (unit)
  ('e0000000-0000-0000-0000-000000000022', 150),  -- Pavo en tiras
  ('e0000000-0000-0000-0000-000000000005', 100),  -- Pepino
  ('e0000000-0000-0000-0000-000000000044', 40),   -- Pesto
  ('e0000000-0000-0000-0000-000000000032', 30),   -- Picatostes
  ('e0000000-0000-0000-0000-000000000006', 100),  -- Pimientos en tiras
  ('e0000000-0000-0000-0000-000000000058', 2),    -- Platano (unit)
  ('e0000000-0000-0000-0000-000000000052', 300),  -- Pocion del entrenador
  ('e0000000-0000-0000-0000-000000000061', 1),    -- Probiotico (unit)
  ('e0000000-0000-0000-0000-000000000059', 40),   -- Proteina en polvo
  ('e0000000-0000-0000-0000-000000000056', 50),   -- Queso crema
  ('e0000000-0000-0000-0000-000000000040', 80),   -- Queso en piezas
  ('e0000000-0000-0000-0000-000000000023', 100),  -- Queso fresco (tipo Burgos)
  ('e0000000-0000-0000-0000-000000000034', 200),  -- Quinoa cocida
  ('e0000000-0000-0000-0000-000000000007', 100),  -- Remolacha cocida
  ('e0000000-0000-0000-0000-000000000009', 60),   -- Rucula
  ('e0000000-0000-0000-0000-000000000017', 160),  -- Salmon en lata
  ('e0000000-0000-0000-0000-000000000047', 30),   -- Salsa de soja o teriyaki
  ('e0000000-0000-0000-0000-000000000031', 160),  -- Sardinas en lata
  ('e0000000-0000-0000-0000-000000000039', 30),   -- Semillas
  ('e0000000-0000-0000-0000-000000000030', 100),  -- Surimi
  ('e0000000-0000-0000-0000-000000000019', 200),  -- Tiras de pollo (cocidas)
  ('e0000000-0000-0000-0000-000000000002', 150),  -- Tomates cherry
  ('e0000000-0000-0000-0000-000000000036', 100),  -- Tortillas de trigo en tiras
  ('e0000000-0000-0000-0000-000000000043', 30),   -- Vinagreta preparada
  ('e0000000-0000-0000-0000-000000000004', 80)    -- Zanahoria rallada (bolsa)
) as v(id, max_qty)
where ingredient.id = v.id::uuid;
