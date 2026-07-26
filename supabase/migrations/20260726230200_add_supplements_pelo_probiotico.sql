-- Dos suplementos diarios nuevos (feedback directo del usuario):
--   - "2 pastillas para el pelo", con el desayuno cada manana.
--   - "Probiotico", en ayunas cada manana (antes de romper el ayuno, igual
--     que "Pocion Ricardo").
-- supplement.ingredient_id es NOT NULL (ver initial_schema.sql), asi que cada
-- suplemento necesita su propia fila en ingredient, siguiendo el patron ya
-- usado para "Pocion Ricardo" / e0000000-...-052.
insert into ingredient (id, owner_id, name, base_unit, storage_type, opened_shelf_life_days, recommended_time) values
  ('e0000000-0000-0000-0000-000000000060', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Pastillas para el pelo', 'unit', 'pantry', null, 'morning'),
  ('e0000000-0000-0000-0000-000000000061', 'fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Probiotico', 'unit', 'pantry', null, 'morning');

insert into supplement (owner_id, name, ingredient_id, frequency, meal_id, relative_timing) values
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Pastillas para el pelo (2 uds.)', 'e0000000-0000-0000-0000-000000000060', 'daily', 'f0000000-0000-0000-0000-000000000001', 'right_after_meal'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Probiotico', 'e0000000-0000-0000-0000-000000000061', 'daily', 'f0000000-0000-0000-0000-000000000001', 'before_fasting_ends');
