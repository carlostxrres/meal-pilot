-- Requisitos dieteticos "oficiales" (calorias, macros, fibra, sodio) segun
-- el perfil del usuario: hombre, 32 anos, 194cm, 88kg, hipertrofia, entrena
-- 3 dias/semana, trabajo sedentario. Calculo (Mifflin-St Jeor):
--   BMR  = 10*88 + 6.25*194 - 5*32 + 5 = 1937.5 kcal
--   TDEE = BMR * 1.375 (ligeramente activo: sedentario + 3 entrenos/semana) = ~2664 kcal
--   Objetivo hipertrofia = TDEE + ~10% = ~2930 kcal -> se redondea a 2800 como suelo
--
-- kcal y proteina van como "mandatory" (son las dos palancas reales para
-- hipertrofia: comer suficiente y suficiente proteina). El resto son guias
-- generales de organismos oficiales (OMS/EFSA/ISSN) y van como "advisory":
-- no bloquean la generacion, solo se muestran para seguimiento.
insert into dietary_requirement (owner_id, scope_type, scope_ingredient_id, scope_category_id, scope_nutrient_column, period, week_reset_day, meal_id, minimum, maximum, unit, strictness, description) values
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'nutrient', null, null, 'kcal_per_100', 'day', null, null, 2800, null, 'kcal', 'mandatory', 'Superavit calorico para hipertrofia (Mifflin-St Jeor + actividad ligera + ~10%, 32a/194cm/88kg)'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'nutrient', null, null, 'protein_g_per_100', 'day', null, null, 160, null, 'g', 'mandatory', 'Proteina diaria total para hipertrofia (~1.8 g/kg de 88kg; ISSN recomienda 1.6-2.2 g/kg)'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'nutrient', null, null, 'carbs_g_per_100', 'day', null, null, 300, null, 'g', 'advisory', 'Hidratos orientativos para sostener el volumen de entrenamiento (~3.4 g/kg; guia general 45-65% de la energia total)'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'nutrient', null, null, 'fat_g_per_100', 'day', null, null, 70, 115, 'g', 'advisory', 'Grasa orientativa (20-35% de la energia total, guia EFSA/OMS)'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'nutrient', null, null, 'fiber_g_per_100', 'day', null, null, 25, null, 'g', 'mandatory', 'Ingesta adecuada de fibra (25 g/dia, valor de referencia EFSA para adultos)'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'nutrient', null, null, 'sodium_mg_per_100', 'day', null, null, null, 2000, 'mg', 'advisory', 'Limite orientativo de sodio (<2000 mg/dia, recomendacion OMS)'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'nutrient', null, null, 'saturated_fat_g_per_100', 'day', null, null, null, 32, 'g', 'advisory', 'Limite orientativo de grasa saturada (<10% de la energia total, guia OMS/EFSA)');
