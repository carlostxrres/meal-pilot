-- Alta de 21 ingredientes nuevos (revision manual del usuario, 2026-07-30),
-- todos con el criterio de "listo para comer facilmente" en oficina /
-- on-the-go: se comen solos, o se anaden a ensalada o bocadillo sin
-- preparacion.
--
-- Mismas convenciones que el catalogo semilla (20260726130000 y siguientes):
--   - nutrientes y precio "por 100 base_unit" (para base_unit = 'unit', por
--     100 unidades, como la Manzana).
--   - valores nutricionales y precios estimados a mano (USDA/BEDCA y mercado
--     espanol como referencia aproximada), ajustables despues.
--   - nombres sin tildes, siguiendo el estilo del resto del catalogo.
--
-- Categorias: Uvas y Arandanos NO van en "Fruta variada" (c...009) aunque
-- sean fruta: esa categoria solo tiene ingredientes con base_unit = 'unit'
-- (las dishes que la referencian expresan cantidad en piezas) y estos dos
-- van en gramos. Se quedan solo en "Fibra y vitaminas", como aporte a
-- ensalada. Los snacks de mano (kikos, castanas, barritas...) no encajan en
-- ninguna categoria existente (todas son de ensalada/tostada/sandwich) y se
-- dejan sin categoria, como la Bebida isotonica.

insert into ingredient (
  id, owner_id, name, base_unit, storage_type, opened_shelf_life_days,
  recommended_time, kcal_per_100, protein_g_per_100, carbs_g_per_100,
  sugar_g_per_100, fiber_g_per_100, fat_g_per_100, saturated_fat_g_per_100,
  sodium_mg_per_100, vitamin_c_mg_per_100, iron_mg_per_100, calcium_mg_per_100,
  omega3_g_per_100, price_eur_per_100, max_quantity_per_dish
) values
  -- fruta para comer sola
  ('e0000000-0000-0000-0000-000000000062', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Mandarina / clementina', 'unit', 'pantry', null, 'any', 4000, 60, 1000, 800, 130, 20, 5, 100, 2000, 10, 2500, 1, 25.00, 3),
  ('e0000000-0000-0000-0000-000000000063', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Uvas', 'g', 'fridge', 5, 'any', 69, 0.7, 18, 16, 0.9, 0.2, 0.1, 2, 3.2, 0.4, 10, 0.01, 0.35, 150),
  ('e0000000-0000-0000-0000-000000000064', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Arandanos', 'g', 'fridge', 5, 'any', 57, 0.7, 14.5, 10, 2.4, 0.3, 0.0, 1, 9.7, 0.3, 6, 0.01, 1.50, 125),
  ('e0000000-0000-0000-0000-000000000065', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Fruta deshidratada (orejones, datiles, pasas, higos secos)', 'g', 'pantry', 60, 'any', 280, 2.5, 65, 55, 7, 0.5, 0.1, 10, 2, 2.0, 55, 0.01, 0.90, 40),
  ('e0000000-0000-0000-0000-000000000066', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Chips de manzana o platano (deshidratados)', 'g', 'pantry', 30, 'any', 450, 2, 60, 35, 6, 20, 15, 10, 2, 1.0, 20, 0.01, 1.20, 30),
  ('e0000000-0000-0000-0000-000000000067', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Compota de fruta (pouch)', 'g', 'pantry', 2, 'any', 60, 0.3, 14, 12, 1.2, 0.2, 0.0, 5, 15, 0.2, 5, 0.001, 0.45, 120),
  -- snacks de mano
  ('e0000000-0000-0000-0000-000000000068', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Castañas peladas asadas (envasadas)', 'g', 'pantry', 3, 'any', 200, 3.0, 40, 10, 5, 2.0, 0.4, 5, 20, 1.0, 30, 0.05, 2.00, 80),
  ('e0000000-0000-0000-0000-000000000069', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Kikos (maiz tostado)', 'g', 'pantry', 30, 'any', 435, 9, 70, 1.5, 8, 12, 1.5, 700, 0, 2.0, 10, 0.05, 0.60, 30),
  ('e0000000-0000-0000-0000-000000000070', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Tortitas de arroz o maiz', 'unit', 'pantry', 30, 'any', 3000, 70, 650, 30, 30, 25, 5, 500, 0, 10, 10, 0.5, 10.00, 4),
  ('e0000000-0000-0000-0000-000000000071', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Barrita de cereales', 'unit', 'pantry', null, 'any', 10000, 150, 1700, 700, 150, 300, 100, 3000, 0, 30, 300, 5, 40.00, 2),
  ('e0000000-0000-0000-0000-000000000072', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Crema de cacahuete', 'g', 'pantry', 60, 'any', 600, 25, 12, 6, 8, 50, 9, 15, 0, 1.7, 45, 0.03, 0.70, 30),
  -- para ensalada sin preparacion
  ('e0000000-0000-0000-0000-000000000073', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Canonigos', 'g', 'fridge', 4, 'midday', 21, 2.0, 3.6, 0.7, 1.5, 0.4, 0.0, 4, 38, 2.2, 38, 0.2, 0.80, 100),
  ('e0000000-0000-0000-0000-000000000074', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Alcachofas en conserva (corazones)', 'g', 'pantry', 4, 'midday', 30, 2.5, 4, 1, 4, 0.2, 0.0, 300, 5, 1.0, 20, 0.01, 1.00, 120),
  ('e0000000-0000-0000-0000-000000000075', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Esparragos blancos en conserva', 'g', 'pantry', 4, 'midday', 15, 1.7, 2, 1.5, 1.5, 0.1, 0.0, 290, 10, 0.6, 20, 0.01, 1.20, 120),
  ('e0000000-0000-0000-0000-000000000076', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Tomate seco en aceite', 'g', 'pantry', 30, 'midday', 213, 5, 23, 16, 6, 14, 2.0, 260, 40, 2.7, 47, 0.1, 1.50, 40),
  ('e0000000-0000-0000-0000-000000000077', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Caballa en lata', 'g', 'pantry', 3, 'midday', 205, 24, 0, 0, 0, 12, 3.0, 400, 0, 1.6, 15, 2.5, 1.10, 130),
  ('e0000000-0000-0000-0000-000000000078', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Mejillones en lata', 'g', 'pantry', 2, 'midday', 170, 18, 4, 0, 0, 9, 1.5, 500, 0, 6.0, 60, 0.7, 2.20, 80),
  -- para bocadillo sin preparacion
  ('e0000000-0000-0000-0000-000000000079', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Jamon serrano en lonchas', 'g', 'fridge', 5, 'any', 240, 31, 0.5, 0, 0, 13, 4.5, 1800, 0, 2.3, 12, 0.1, 3.00, 60),
  ('e0000000-0000-0000-0000-000000000080', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Lomo embuchado en lonchas', 'g', 'fridge', 5, 'any', 280, 38, 1, 0, 0, 13, 5.0, 2000, 0, 1.5, 10, 0.05, 3.50, 50),
  ('e0000000-0000-0000-0000-000000000081', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Anchoas o boquerones en vinagre', 'g', 'fridge', 3, 'midday', 150, 15, 0.5, 0, 0, 10, 1.5, 800, 0, 1.0, 30, 1.2, 3.00, 50),
  ('e0000000-0000-0000-0000-000000000082', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Biscotes / regañas / picos', 'g', 'pantry', 30, 'any', 400, 11, 72, 3, 4, 6, 1.0, 500, 0, 2.0, 40, 0.05, 0.50, 60);

insert into ingredient_category_link (ingredient_id, category_id) values
  -- Fruta variada (solo 'unit', ver nota de cabecera)
  ('e0000000-0000-0000-0000-000000000062', 'c0000000-0000-0000-0000-000000000009'), -- Mandarina / clementina
  -- Fibra y vitaminas
  ('e0000000-0000-0000-0000-000000000062', 'c0000000-0000-0000-0000-000000000001'), -- Mandarina / clementina
  ('e0000000-0000-0000-0000-000000000063', 'c0000000-0000-0000-0000-000000000001'), -- Uvas
  ('e0000000-0000-0000-0000-000000000064', 'c0000000-0000-0000-0000-000000000001'), -- Arandanos
  ('e0000000-0000-0000-0000-000000000073', 'c0000000-0000-0000-0000-000000000001'), -- Canonigos
  ('e0000000-0000-0000-0000-000000000074', 'c0000000-0000-0000-0000-000000000001'), -- Alcachofas en conserva
  ('e0000000-0000-0000-0000-000000000075', 'c0000000-0000-0000-0000-000000000001'), -- Esparragos blancos
  ('e0000000-0000-0000-0000-000000000076', 'c0000000-0000-0000-0000-000000000001'), -- Tomate seco en aceite
  -- Grasa (ensalada)
  ('e0000000-0000-0000-0000-000000000076', 'c0000000-0000-0000-0000-000000000004'), -- Tomate seco en aceite
  -- Proteina (ensalada)
  ('e0000000-0000-0000-0000-000000000077', 'c0000000-0000-0000-0000-000000000002'), -- Caballa en lata
  ('e0000000-0000-0000-0000-000000000078', 'c0000000-0000-0000-0000-000000000002'), -- Mejillones en lata
  ('e0000000-0000-0000-0000-000000000081', 'c0000000-0000-0000-0000-000000000002'), -- Anchoas o boquerones
  -- Hidratos (ensalada)
  ('e0000000-0000-0000-0000-000000000082', 'c0000000-0000-0000-0000-000000000003'), -- Biscotes / regañas / picos
  -- Tostada: untable
  ('e0000000-0000-0000-0000-000000000072', 'c0000000-0000-0000-0000-000000000007'), -- Crema de cacahuete
  -- Tostada: proteina
  ('e0000000-0000-0000-0000-000000000079', 'c0000000-0000-0000-0000-000000000008'), -- Jamon serrano
  ('e0000000-0000-0000-0000-000000000080', 'c0000000-0000-0000-0000-000000000008'), -- Lomo embuchado
  ('e0000000-0000-0000-0000-000000000081', 'c0000000-0000-0000-0000-000000000008'); -- Anchoas o boquerones
