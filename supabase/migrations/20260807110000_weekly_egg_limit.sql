-- Límite semanal de huevos (mismo patrón que el límite semanal de atún en
-- 20260726130000_seed_initial_catalog.sql): único ingrediente de huevo hoy
-- es "Huevo cocido" (e0000000-...020, base_unit 'unit').
insert into dietary_requirement
  (owner_id, scope_type, scope_ingredient_id, scope_category_id, scope_nutrient_column, period, week_reset_day, meal_id, minimum, maximum, unit, strictness, name, description)
values
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'ingredient', 'e0000000-0000-0000-0000-000000000020', null, null, 'week', 'mon', null, null, 7, 'unit', 'mandatory', 'Huevos semanales (límite)', 'Máximo 7 huevos a la semana');
