-- 1. Etiquetas de sub-nutriente estilo etiqueta nutricional europea: "Grasas,
--    de las cuales: saturadas" / "Hidratos, de los cuales: azúcares" — antes
--    "Grasa saturada"/"Azúcares" quedaban como filas hermanas sin relación
--    visual con "Grasas"/"Hidratos". Solo afecta a los 8 requisitos por meal
--    (ADR-0017); los "límite" de día completo (sección 3.3) no cambian.
update dietary_requirement set name = 'de las cuales saturadas'
  where scope_nutrient_column = 'saturated_fat_g_per_100' and meal_id is not null;

update dietary_requirement set name = 'de los cuales azúcares'
  where scope_nutrient_column = 'sugar_g_per_100' and meal_id is not null;

-- 2. meal_tip: consejos cortos asociados a un meal, mostrados uno al azar
-- (semillado por fecha+meal, ver engine/mealTips.ts) en "Hoy". Un meal puede
-- no tener ninguno (la UI simplemente no muestra nada).
create table meal_tip (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  meal_id uuid not null references meal (id) on delete cascade,
  text text not null
);

create index meal_tip_meal_id_idx on meal_tip (meal_id);

alter table meal_tip enable row level security;
create policy meal_tip_owner_all on meal_tip
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Consejos iniciales (contenido real del usuario, 2026-07-28). "Snack de
-- media mañana" se deja sin consejos de partida — el usuario no dio ninguno.
insert into meal_tip (owner_id, meal_id, text) values
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'f0000000-0000-0000-0000-000000000001',
    'Al ser tu primera comida tras el ayuno nocturno, prioriza proteína + fibra + algo de grasa buena; no hace falta cargar hidratos aquí.'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'f0000000-0000-0000-0000-000000000003',
    'Es tu comida principal del día laboral: la más grande en volumen y donde más margen tienes para hidratos complejos y verdura/fibra.'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'f0000000-0000-0000-0000-000000000004',
    'Aquí el azúcar rápido no es problema: ayuda a reponer glucógeno.'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'f0000000-0000-0000-0000-000000000004',
    'Tiene sentido reforzar el sodio aquí. Con 1,5h de entreno de fuerza/calistenia sudas y pierdes sodio; si además ese día corres, aún más. Puedes llegar hasta ~1,5-2 g de sal en este snack sin problema (por ejemplo con un electrolito o algo salado tipo queso/jamón + fruta).'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'f0000000-0000-0000-0000-000000000004',
    'Merece la pena vigilar el potasio en días de carrera larga (10-20km) — plátano, patata, o una bebida con electrolitos cubre esto.'),
  ('fc51fddc-c268-425a-8bbb-b630f5ec66d4', 'f0000000-0000-0000-0000-000000000004',
    'Mantén la grasa y fibra bajas aquí: quieres que la proteína y los hidratos se absorban rápido para la recuperación; no es el momento de la comida más "completa" del día.');
