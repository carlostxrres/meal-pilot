-- ADR-0018: toda dish es fija y pertenece a exactamente un meal.
--   - dish.meal_id (NOT NULL) sustituye a la relacion N:M meal_dish.
--   - dish_ingredient pierde la maquinaria flexible (category_id, slot_group,
--     required, quantity_max): un componente es siempre (ingredient, quantity).
--   - ingredient_category / ingredient_category_link se conservan: las usan
--     los dietary_requirement por categoria y la futura alta asistida (fase 5).
--
-- Conversion mecanica del catalogo existente (placeholder deliberado, NO un
-- rediseño): el catalogo real de dishes fijas por ventana nutricional lo
-- disenara el usuario despues (paso 5 del plan, ver
-- docs/plans/2026-07-27-requisitos-por-meal-y-dishes-fijas-design.md).
--   - Cada hueco flexible se resuelve al ingrediente de menor id de su
--     categoria (deterministico), con la cantidad minima del slot. Las dishes
--     resultantes pueden quedar fuera de la ventana de su meal: la pagina
--     /dishes las marcara hasta que se rediseñen.
--   - "Fruta (pieza)" estaba enlazada a dos meals (Desayuno y Snack de media
--     mañana); se asigna al Snack de media mañana ("un bocadillo o una pieza
--     de fruta", ver catalogo de meals en diseno-sistema.md) — como desayuno
--     completo nunca podria cumplir la ventana nutricional nueva.

-- 1. dish.meal_id
alter table dish add column meal_id uuid references meal (id);

update dish set meal_id = 'f0000000-0000-0000-0000-000000000002'
  where id = 'd0000000-0000-0000-0000-000000000005'; -- Fruta (pieza)

update dish set meal_id = md.meal_id
  from meal_dish md
  where md.dish_id = dish.id and dish.meal_id is null;

-- Falla en voz alta si quedara alguna dish sin meal (no deberia: todas las
-- huerfanas se enlazaron en 20260726230000_link_orphan_dishes_to_meals.sql).
alter table dish alter column meal_id set not null;

create index dish_meal_id_idx on dish (meal_id);

-- 2. Resolver huecos flexibles a un ingrediente concreto (ver cabecera).
update dish_ingredient di
  set ingredient_id = (
    select l.ingredient_id
    from ingredient_category_link l
    where l.category_id = di.category_id
    order by l.ingredient_id
    limit 1
  ),
  category_id = null
  where di.category_id is not null;

-- 3. Retirar la maquinaria flexible de dish_ingredient.
alter table dish_ingredient drop constraint dish_ingredient_exactly_one_reference;
alter table dish_ingredient drop constraint dish_ingredient_quantity_positive;
alter table dish_ingredient
  drop column category_id,
  drop column slot_group,
  drop column required,
  drop column quantity_max;
alter table dish_ingredient alter column ingredient_id set not null;
alter table dish_ingredient add constraint dish_ingredient_quantity_positive check (quantity > 0);

-- 4. Adios meal_dish (la policy RLS cae con la tabla).
drop table meal_dish;
