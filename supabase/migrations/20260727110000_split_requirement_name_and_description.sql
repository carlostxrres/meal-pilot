-- Separa el "description" largo de dietary_requirement en dos: name (corto,
-- se muestra como titulo) y description (detalle, se muestra pequeno/discreto
-- debajo, ya no repite el numero objetivo cuando la UI ya lo va a mostrar
-- aparte como "actual / objetivo").
alter table dietary_requirement add column name text;

update dietary_requirement set name = 'Sardinas semanales', description = '2 latas por semana (~120g/ración asumida)'
  where scope_ingredient_id = 'e0000000-0000-0000-0000-000000000031' and period = 'week';

update dietary_requirement set name = 'Aguacate diario', description = '1 pieza entera (~100g)'
  where scope_ingredient_id = 'e0000000-0000-0000-0000-000000000042' and period = 'day';

update dietary_requirement set name = 'Vitamina C diaria', description = 'NRV UE'
  where scope_nutrient_column = 'vitamin_c_mg_per_100';

update dietary_requirement set name = 'Atún semanal (límite)', description = 'Por acumulación de metales pesados'
  where scope_ingredient_id = 'e0000000-0000-0000-0000-000000000018' and period = 'week';

update dietary_requirement set name = 'Proteína post-entreno', description = 'Según peso corporal del usuario'
  where scope_nutrient_column = 'protein_g_per_100' and meal_id = 'f0000000-0000-0000-0000-000000000004';

update dietary_requirement set name = 'Calorías diarias', description = 'Superávit para hipertrofia (Mifflin-St Jeor + actividad ligera + ~10%, 32a/194cm/88kg)'
  where scope_nutrient_column = 'kcal_per_100';

update dietary_requirement set name = 'Proteína diaria total', description = '~1.8 g/kg de 88kg; ISSN recomienda 1.6-2.2 g/kg para hipertrofia'
  where scope_nutrient_column = 'protein_g_per_100' and meal_id is null;

update dietary_requirement set name = 'Hidratos de carbono', description = '~3.4 g/kg para sostener el volumen de entrenamiento; guía general 45-65% de la energía total'
  where scope_nutrient_column = 'carbs_g_per_100';

update dietary_requirement set name = 'Grasa', description = '20-35% de la energía total (guía EFSA/OMS)'
  where scope_nutrient_column = 'fat_g_per_100';

update dietary_requirement set name = 'Fibra diaria', description = 'Valor de referencia EFSA para adultos'
  where scope_nutrient_column = 'fiber_g_per_100';

update dietary_requirement set name = 'Sodio (límite)', description = 'Recomendación OMS'
  where scope_nutrient_column = 'sodium_mg_per_100';

update dietary_requirement set name = 'Grasa saturada (límite)', description = '<10% de la energía total (guía OMS/EFSA)'
  where scope_nutrient_column = 'saturated_fat_g_per_100';

alter table dietary_requirement alter column name set not null;
