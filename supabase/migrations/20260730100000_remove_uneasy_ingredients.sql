-- Revision manual del catalogo (feedback directo del usuario): se retiran
-- ingredientes que no cumplen el criterio de "listo para comer facilmente"
-- en oficina / on-the-go: Mango (hay que pelarlo con cuchillo, pringoso),
-- Remolacha cocida (mancha, incomoda fuera de casa), Brotes (soja, alfalfa),
-- Champinones laminados y Pepino.
--
-- Verificado antes de escribir esta migracion (query directa contra la base
-- remota): ninguno aparece en supplement ni dietary_requirement. Mango,
-- Remolacha y Champinones tampoco aparecen en dish_ingredient (solo en
-- categorias, que se limpian solas via "on delete cascade" de
-- ingredient_category_link). Pepino y Brotes aparecen como acompanamiento en
-- tres dishes que mantienen su identidad sin ellos, asi que se borran solo
-- esas filas de dish_ingredient (sin cascade en ingredient_id) y las dishes
-- se conservan:
--   - "Bocadillo vegetal de hummus": pierde Pepino y Brotes (le quedan
--     hummus, pan y zanahoria).
--   - "Pita rellena de pollo": pierde Pepino (le quedan pollo, pita,
--     guacamole y mezclum).
--   - "Bowl de pavo y col lombarda": pierde Brotes (le quedan pavo, col,
--     arroz y salsa).

delete from dish_ingredient
where ingredient_id in (
  'e0000000-0000-0000-0000-000000000005', -- Pepino
  'e0000000-0000-0000-0000-000000000010'  -- Brotes (soja, alfalfa)
);

delete from ingredient
where id in (
  'e0000000-0000-0000-0000-000000000005', -- Pepino
  'e0000000-0000-0000-0000-000000000007', -- Remolacha cocida (envasada al vacio)
  'e0000000-0000-0000-0000-000000000010', -- Brotes (soja, alfalfa)
  'e0000000-0000-0000-0000-000000000011', -- Champinones laminados
  'e0000000-0000-0000-0000-000000000015'  -- Mango
);
