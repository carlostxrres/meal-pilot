-- ADR-0017: cada meal define su propia ventana nutricional, cargada como
-- filas de dietary_requirement con meal_id (mecanismo del ADR-0011, ahora
-- como caso principal). Valores definidos por el usuario (2026-07-27), ver
-- docs/plans/2026-07-27-requisitos-por-meal-y-dishes-fijas-design.md.
--
-- La sal se almacena como sodio (columna sodium_mg_per_100): 1 g sal ~ 400 mg
-- de sodio. Todos son period='day', mandatory: con dishes fijas pre-validadas
-- (ADR-0018) se cumplen por construccion, el motor no los usa para filtrar.

-- El minimo suelto de proteina post-entreno (35g, semilla original) queda
-- sustituido por la ventana completa 25-35g del nuevo set.
delete from dietary_requirement
  where scope_nutrient_column = 'protein_g_per_100'
  and meal_id = 'f0000000-0000-0000-0000-000000000004';

insert into dietary_requirement (owner_id, name, scope_type, scope_nutrient_column, period, meal_id, minimum, maximum, unit, strictness, description) values
  -- 1. Desayuno en casa (08:00)
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Energía',        'nutrient', 'kcal_per_100',            'day', 'f0000000-0000-0000-0000-000000000001', 550, 650,  'kcal', 'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Grasas',         'nutrient', 'fat_g_per_100',           'day', 'f0000000-0000-0000-0000-000000000001', 16,  21,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Grasa saturada', 'nutrient', 'saturated_fat_g_per_100', 'day', 'f0000000-0000-0000-0000-000000000001', null, 7,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Hidratos',       'nutrient', 'carbs_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000001', 65,  85,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Azúcares',       'nutrient', 'sugar_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000001', null, 15,  'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Fibra',          'nutrient', 'fiber_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000001', 5,   8,    'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Proteína',       'nutrient', 'protein_g_per_100',       'day', 'f0000000-0000-0000-0000-000000000001', 25,  32,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Sodio',          'nutrient', 'sodium_mg_per_100',       'day', 'f0000000-0000-0000-0000-000000000001', 200, 400,  'mg',   'mandatory', 'Equivale a 0,5–1 g de sal'),
  -- 2. Snack de media mañana (10:45)
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Energía',        'nutrient', 'kcal_per_100',            'day', 'f0000000-0000-0000-0000-000000000002', 350, 450,  'kcal', 'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Grasas',         'nutrient', 'fat_g_per_100',           'day', 'f0000000-0000-0000-0000-000000000002', 11,  15,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Grasa saturada', 'nutrient', 'saturated_fat_g_per_100', 'day', 'f0000000-0000-0000-0000-000000000002', null, 5,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Hidratos',       'nutrient', 'carbs_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000002', 40,  55,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Azúcares',       'nutrient', 'sugar_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000002', null, 10,  'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Fibra',          'nutrient', 'fiber_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000002', 3,   5,    'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Proteína',       'nutrient', 'protein_g_per_100',       'day', 'f0000000-0000-0000-0000-000000000002', 18,  24,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Sodio',          'nutrient', 'sodium_mg_per_100',       'day', 'f0000000-0000-0000-0000-000000000002', 200, 480,  'mg',   'mandatory', 'Equivale a 0,5–1,2 g de sal'),
  -- 3. Almuerzo de mediodia (14:30)
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Energía',        'nutrient', 'kcal_per_100',            'day', 'f0000000-0000-0000-0000-000000000003', 950, 1150, 'kcal', 'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Grasas',         'nutrient', 'fat_g_per_100',           'day', 'f0000000-0000-0000-0000-000000000003', 28,  37,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Grasa saturada', 'nutrient', 'saturated_fat_g_per_100', 'day', 'f0000000-0000-0000-0000-000000000003', null, 10,  'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Hidratos',       'nutrient', 'carbs_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000003', 115, 155,  'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Azúcares',       'nutrient', 'sugar_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000003', null, 20,  'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Fibra',          'nutrient', 'fiber_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000003', 10,  15,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Proteína',       'nutrient', 'protein_g_per_100',       'day', 'f0000000-0000-0000-0000-000000000003', 50,  62,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Sodio',          'nutrient', 'sodium_mg_per_100',       'day', 'f0000000-0000-0000-0000-000000000003', 600, 1000, 'mg',   'mandatory', 'Equivale a 1,5–2,5 g de sal'),
  -- 4. Snack post-entreno
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Energía',        'nutrient', 'kcal_per_100',            'day', 'f0000000-0000-0000-0000-000000000004', 350, 500,  'kcal', 'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Grasas',         'nutrient', 'fat_g_per_100',           'day', 'f0000000-0000-0000-0000-000000000004', 3,   8,    'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Grasa saturada', 'nutrient', 'saturated_fat_g_per_100', 'day', 'f0000000-0000-0000-0000-000000000004', null, 3,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Hidratos',       'nutrient', 'carbs_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000004', 45,  65,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Azúcares',       'nutrient', 'sugar_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000004', 10,  25,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Fibra',          'nutrient', 'fiber_g_per_100',         'day', 'f0000000-0000-0000-0000-000000000004', null, 4,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Proteína',       'nutrient', 'protein_g_per_100',       'day', 'f0000000-0000-0000-0000-000000000004', 25,  35,   'g',    'mandatory', null),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'Sodio',          'nutrient', 'sodium_mg_per_100',       'day', 'f0000000-0000-0000-0000-000000000004', 200, 600,  'mg',   'mandatory', 'Equivale a 0,5–1,5 g de sal');
