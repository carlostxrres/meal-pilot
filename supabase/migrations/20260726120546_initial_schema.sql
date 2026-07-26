-- Esquema inicial de comida-diaria (fase 2b).
-- Realiza en Postgres las tablas descritas en docs/diseno-sistema.md, sección 4.2.
-- El porqué de cada decisión de fondo (Auth+RLS, UUID, nutrientes como columnas,
-- meal_id opcional en dietary_requirement, etc.) vive en docs/adrs/, no aquí.
--
-- Notas de implementación (traducción de modelo conceptual -> columnas físicas,
-- no son decisiones de arquitectura nuevas):
--   - `dietary_requirement.scope_ref` (conceptual, sección 3.2) se realiza como
--     tres columnas nullable (scope_ingredient_id / scope_category_id /
--     scope_nutrient_column) + un CHECK que exige que solo la que corresponda
--     a `scope_type` esté rellena. Evita una FK polimórfica en una sola columna.
--   - `dish_ingredient.quantity` (sección 2: "cantidad fija o rango") se realiza
--     como `quantity` (mínimo/fijo) + `quantity_max` nullable (solo si es rango).
--   - `supplement.relative_timing` (sección 2: incluye "X horas después") se
--     realiza como un enum de 3 casos + `relative_timing_hours` nullable, solo
--     usado cuando el caso es `hours_after`.
--   - Las tablas puente/hijas (ingredient_category_link, dish_ingredient,
--     meal_dish, supplement_day, requirement_log) no llevan su propio
--     `owner_id`: su RLS se resuelve vía EXISTS contra el owner_id de la tabla
--     padre, para no duplicar la columna en cada fila hija.

create extension if not exists "pgcrypto";

-- ============================================================================
-- Enums
-- ============================================================================

create type base_unit as enum ('g', 'ml', 'unit');
create type storage_type as enum ('pantry', 'fridge', 'freezer');
create type time_of_day as enum ('morning', 'midday', 'afternoon', 'any');
create type supplement_frequency as enum ('daily', 'specific_days');
create type relative_timing_type as enum ('before_fasting_ends', 'right_after_meal', 'hours_after');
create type weekday as enum ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
create type requirement_scope_type as enum ('ingredient', 'ingredient_category', 'nutrient');
create type requirement_period as enum ('day', 'week');
create type requirement_strictness as enum ('mandatory', 'advisory');

-- ============================================================================
-- ingredient
-- ============================================================================

create table ingredient (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null,
  base_unit base_unit not null,
  storage_type storage_type not null,
  opened_shelf_life_days int,
  recommended_time time_of_day not null default 'any',
  office_inventory numeric not null default 0,
  home_inventory numeric not null default 0,
  -- valores nutricionales, todos "por 100 base_unit" (ver docs/diseno-sistema.md sección 2)
  kcal_per_100 numeric,
  protein_g_per_100 numeric,
  carbs_g_per_100 numeric,
  sugar_g_per_100 numeric,
  fiber_g_per_100 numeric,
  fat_g_per_100 numeric,
  saturated_fat_g_per_100 numeric,
  sodium_mg_per_100 numeric,
  vitamin_c_mg_per_100 numeric,
  iron_mg_per_100 numeric,
  calcium_mg_per_100 numeric,
  omega3_g_per_100 numeric,
  constraint ingredient_inventory_non_negative
    check (office_inventory >= 0 and home_inventory >= 0)
);

create index ingredient_owner_id_idx on ingredient (owner_id);

-- ============================================================================
-- ingredient_category (+ link N:M)
-- ============================================================================

create table ingredient_category (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null
);

create index ingredient_category_owner_id_idx on ingredient_category (owner_id);

create table ingredient_category_link (
  ingredient_id uuid not null references ingredient (id) on delete cascade,
  category_id uuid not null references ingredient_category (id) on delete cascade,
  primary key (ingredient_id, category_id)
);

create index ingredient_category_link_category_id_idx on ingredient_category_link (category_id);

-- ============================================================================
-- dish (+ componentes)
-- ============================================================================

create table dish (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null,
  dish_type text not null
);

create index dish_owner_id_idx on dish (owner_id);

create table dish_ingredient (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references dish (id) on delete cascade,
  ingredient_id uuid references ingredient (id),
  category_id uuid references ingredient_category (id),
  slot_group int not null default 1,
  quantity numeric not null,
  quantity_max numeric,
  required boolean not null default true,
  constraint dish_ingredient_exactly_one_reference
    check (
      (ingredient_id is not null and category_id is null)
      or (ingredient_id is null and category_id is not null)
    ),
  constraint dish_ingredient_quantity_positive
    check (quantity > 0 and (quantity_max is null or quantity_max >= quantity))
);

create index dish_ingredient_dish_id_idx on dish_ingredient (dish_id);
create index dish_ingredient_ingredient_id_idx on dish_ingredient (ingredient_id);
create index dish_ingredient_category_id_idx on dish_ingredient (category_id);

-- ============================================================================
-- meal (+ dishes que lo componen)
-- ============================================================================

create table meal (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null,
  usual_start_time time not null,
  usual_end_time time not null,
  constraint meal_time_window_valid check (usual_end_time > usual_start_time)
);

create index meal_owner_id_idx on meal (owner_id);

create table meal_dish (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meal (id) on delete cascade,
  dish_id uuid not null references dish (id),
  quantity_units numeric not null default 1,
  unique (meal_id, dish_id)
);

create index meal_dish_meal_id_idx on meal_dish (meal_id);
create index meal_dish_dish_id_idx on meal_dish (dish_id);

-- ============================================================================
-- supplement (+ calendario de días fijos)
-- ============================================================================

create table supplement (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  name text not null,
  ingredient_id uuid not null references ingredient (id),
  frequency supplement_frequency not null,
  meal_id uuid not null references meal (id),
  relative_timing relative_timing_type not null,
  relative_timing_hours numeric,
  constraint supplement_hours_only_when_hours_after
    check (
      (relative_timing = 'hours_after' and relative_timing_hours is not null)
      or (relative_timing <> 'hours_after' and relative_timing_hours is null)
    )
);

create index supplement_owner_id_idx on supplement (owner_id);
create index supplement_ingredient_id_idx on supplement (ingredient_id);
create index supplement_meal_id_idx on supplement (meal_id);

create table supplement_day (
  supplement_id uuid not null references supplement (id) on delete cascade,
  day_of_week weekday not null,
  primary key (supplement_id, day_of_week)
);

-- ============================================================================
-- dietary_requirement (+ log de cumplimiento)
-- ============================================================================

create table dietary_requirement (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  scope_type requirement_scope_type not null,
  scope_ingredient_id uuid references ingredient (id),
  scope_category_id uuid references ingredient_category (id),
  scope_nutrient_column text,
  period requirement_period not null,
  week_reset_day weekday,
  meal_id uuid references meal (id),
  minimum numeric,
  maximum numeric,
  unit text not null,
  tolerance_margin numeric not null default 0.10,
  strictness requirement_strictness not null,
  description text,
  constraint dietary_requirement_scope_matches_type check (
    (scope_type = 'ingredient' and scope_ingredient_id is not null and scope_category_id is null and scope_nutrient_column is null)
    or (scope_type = 'ingredient_category' and scope_category_id is not null and scope_ingredient_id is null and scope_nutrient_column is null)
    or (scope_type = 'nutrient' and scope_nutrient_column is not null and scope_ingredient_id is null and scope_category_id is null)
  ),
  constraint dietary_requirement_nutrient_column_known check (
    scope_nutrient_column is null or scope_nutrient_column in (
      'kcal_per_100', 'protein_g_per_100', 'carbs_g_per_100', 'sugar_g_per_100',
      'fiber_g_per_100', 'fat_g_per_100', 'saturated_fat_g_per_100', 'sodium_mg_per_100',
      'vitamin_c_mg_per_100', 'iron_mg_per_100', 'calcium_mg_per_100', 'omega3_g_per_100'
    )
  ),
  constraint dietary_requirement_week_reset_day_matches_period check (
    (period = 'week' and week_reset_day is not null)
    or (period = 'day' and week_reset_day is null)
  ),
  constraint dietary_requirement_has_min_or_max check (minimum is not null or maximum is not null),
  constraint dietary_requirement_tolerance_non_negative check (tolerance_margin >= 0)
);

create index dietary_requirement_owner_id_idx on dietary_requirement (owner_id);
create index dietary_requirement_meal_id_idx on dietary_requirement (meal_id);

create table requirement_log (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references dietary_requirement (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  accumulated numeric not null default 0,
  fulfilled boolean not null default false,
  unique (requirement_id, period_start, period_end)
);

create index requirement_log_requirement_id_idx on requirement_log (requirement_id);

-- ============================================================================
-- meal_log (registro de comidas)
-- ============================================================================

create table meal_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  date date not null,
  meal_id uuid not null references meal (id),
  dish_id uuid not null references dish (id),
  confirmed boolean not null default false
);

create index meal_log_owner_id_idx on meal_log (owner_id);
create index meal_log_meal_id_idx on meal_log (meal_id);
create index meal_log_dish_id_idx on meal_log (dish_id);

-- ============================================================================
-- Row Level Security (ver docs/adrs/0005-supabase-auth-y-rls-desde-el-inicio.md)
-- ============================================================================

-- Tablas con owner_id propio: policy directa.
alter table ingredient enable row level security;
create policy ingredient_owner_all on ingredient
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table ingredient_category enable row level security;
create policy ingredient_category_owner_all on ingredient_category
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table dish enable row level security;
create policy dish_owner_all on dish
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table meal enable row level security;
create policy meal_owner_all on meal
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table supplement enable row level security;
create policy supplement_owner_all on supplement
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table dietary_requirement enable row level security;
create policy dietary_requirement_owner_all on dietary_requirement
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table meal_log enable row level security;
create policy meal_log_owner_all on meal_log
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Tablas puente/hijas sin owner_id propio: policy vía el owner de la tabla padre.
alter table ingredient_category_link enable row level security;
create policy ingredient_category_link_owner_all on ingredient_category_link
  for all
  using (exists (select 1 from ingredient i where i.id = ingredient_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from ingredient i where i.id = ingredient_id and i.owner_id = auth.uid()));

alter table dish_ingredient enable row level security;
create policy dish_ingredient_owner_all on dish_ingredient
  for all
  using (exists (select 1 from dish d where d.id = dish_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from dish d where d.id = dish_id and d.owner_id = auth.uid()));

alter table meal_dish enable row level security;
create policy meal_dish_owner_all on meal_dish
  for all
  using (exists (select 1 from meal m where m.id = meal_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from meal m where m.id = meal_id and m.owner_id = auth.uid()));

alter table supplement_day enable row level security;
create policy supplement_day_owner_all on supplement_day
  for all
  using (exists (select 1 from supplement s where s.id = supplement_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from supplement s where s.id = supplement_id and s.owner_id = auth.uid()));

alter table requirement_log enable row level security;
create policy requirement_log_owner_all on requirement_log
  for all
  using (exists (select 1 from dietary_requirement r where r.id = requirement_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from dietary_requirement r where r.id = requirement_id and r.owner_id = auth.uid()));
