-- El usuario no quiere Granada, Tofu listo para consumir ni Edamame cocido en
-- su catalogo de ingredientes (feedback directo). Se retiran junto con todo lo
-- que dependia de ellos:
--   - dish_ingredient / ingredient_category_link: se limpian solos via
--     "on delete cascade" al borrar el ingredient (ver 20260726120546_initial_schema.sql),
--     salvo dish_ingredient.ingredient_id, que NO tiene cascade -> hay que
--     borrar esas filas (o la dish entera) a mano antes de borrar el ingredient.
--   - Verificado antes de escribir esta migracion (query directa contra la
--     base remota): ninguno de los tres aparece en dietary_requirement,
--     supplement, meal_dish ni meal_log, asi que no hace falta tocar esas
--     tablas.
--
-- Dishes cuyo nombre e identidad dependian de uno de estos ingredientes como
-- componente obligatorio se eliminan enteras (no tiene sentido dejarlas a
-- medias): "Bowl de salmon, aguacate y edamame", "Bowl proteico de tofu y
-- edamame", "Bocadillo de queso fresco y granada", "Ensalada de espinacas,
-- granada y queso". "Bowl de surimi estilo asiatico" solo pierde el
-- componente edamame (el resto de la dish sigue teniendo sentido sin el).
-- "Snack de frutos secos y fruta" y "Fruta (pieza)" usan la categoria
-- "Fruta variada" (flexible), no el ingrediente en concreto, asi que no
-- necesitan cambios: la granada desaparece sola de esa categoria via cascade.

delete from dish
where id in (
  'd0000000-0000-0000-0000-000000000009', -- Bowl de salmon, aguacate y edamame
  'd0000000-0000-0000-0000-000000000016', -- Bowl proteico de tofu y edamame
  'd0000000-0000-0000-0000-000000000028', -- Bocadillo de queso fresco y granada
  'd0000000-0000-0000-0000-000000000030'  -- Ensalada de espinacas, granada y queso
);

delete from dish_ingredient
where dish_id = 'd0000000-0000-0000-0000-000000000019' -- Bowl de surimi estilo asiatico
  and ingredient_id = 'e0000000-0000-0000-0000-000000000029'; -- Edamame cocido

delete from ingredient
where id in (
  'e0000000-0000-0000-0000-000000000016', -- Granada
  'e0000000-0000-0000-0000-000000000028', -- Tofu listo para consumir
  'e0000000-0000-0000-0000-000000000029'  -- Edamame cocido
);
