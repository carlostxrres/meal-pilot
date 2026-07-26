-- 20260726210000_seed_more_dishes.sql anadio 25 dishes nuevas pero nunca las
-- enlazo a ningun meal via meal_dish (descubierto al depurar por que "Snack
-- de media manana" repetia siempre "Bocadillo de pollo/pavo con pimientos":
-- ese meal solo tenia 2 candidatas registradas en meal_dish, y las otras 25
-- dishes del catalogo eran, a efectos del motor, invisibles).
--
-- De las 25, 4 ya no existen (ver 20260726220000_remove_granada_tofu_edamame.sql).
-- De las 21 restantes:
--   - Bowls/ensaladas/bocadillos/tostadas/pita de tamano "comida" (150-250g de
--     proteina+carbohidrato) van a "Almuerzo de mediodia" (almuerzo de
--     oficina, ensamblado sin coccion, ver comentario de seed_more_dishes.sql).
--   - "Snack de frutos secos y fruta" (025): frutos secos+semillas son
--     recommended_time='midday' y ya comparte categoria de fruta con la
--     unica otra candidata de "Snack de media manana" (Fruta (pieza)).
--   - "Snack de proteina con leche y platano" (031): mismos ingredientes
--     (leche/proteina en polvo/platano, recommended_time='afternoon') que
--     "Snack post-entreno" (d006), es una variante directa de esa dish.
insert into meal_dish (meal_id, dish_id, quantity_units) values
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000007', 1), -- Bowl de arroz con atun y aguacate
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000008', 1), -- Bowl de quinoa con pollo y verduras
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000010', 1), -- Bocadillo de jamon y queso
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000011', 1), -- Bocadillo vegetal de hummus
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000012', 1), -- Tostada de aguacate y huevo
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000013', 1), -- Tostada de pavo y queso crema
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000014', 1), -- Bowl de cous cous con pollo
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000015', 1), -- Ensalada de pollo y frutos secos
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000017', 1), -- Ensalada de lentejas
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000018', 1), -- Ensalada de alubias y atun
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000019', 1), -- Bowl de surimi estilo asiatico
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000020', 1), -- Bocadillo de surimi con mayonesa
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000021', 1), -- Pita rellena de pollo
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000022', 1), -- Bowl de garbanzos con pesto
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000023', 1), -- Ensalada de rucula y jamon con picatostes
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000024', 1), -- Bowl de pavo y col lombarda
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000026', 1), -- Bowl de huevo y aguacate con quinoa
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000027', 1), -- Bowl flexible de proteina y verdura
  ('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000029', 1), -- Bowl mexicano de alubias y guacamole
  ('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000025', 1), -- Snack de frutos secos y fruta
  ('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000031', 1); -- Snack de proteina con leche y platano
