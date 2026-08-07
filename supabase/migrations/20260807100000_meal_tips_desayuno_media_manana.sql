-- Nuevos consejos de meal_tip (ver 20260728100000_nutrient_sublabels_and_meal_tips.sql):
-- uno más para Desayuno en casa (ya tenía uno, pickDailyTip rota entre varios)
-- y el primero para Snack de media mañana (hasta ahora sin ninguno).
insert into meal_tip (owner_id, meal_id, text) values
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'f0000000-0000-0000-0000-000000000001',
    'En el desayuno, aprovechamos para usar ingredientes y formatos difíciles de transportar, que se toman mejor en casa, como tostadas o yogur.'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'f0000000-0000-0000-0000-000000000002',
    'Priorizamos comidas fáciles de transportar, como bocadillos o manzana.');
