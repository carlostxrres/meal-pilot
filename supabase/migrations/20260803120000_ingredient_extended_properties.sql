-- Propiedades ampliadas de ingredient (ver docs/adrs/0023-propiedades-ampliadas-de-ingredient.md):
-- descripción libre, conservación por método de almacenamiento (sustituye a
-- opened_shelf_life_days), habilitado/deshabilitado con created_at/updated_at,
-- y links de compra online por supermercado.

create type supermarket as enum ('mercadona');

alter table ingredient
  add column description text,
  add column pantry_shelf_life_days int,
  add column fridge_shelf_life_days int,
  add column freezer_shelf_life_days int,
  add column enabled boolean not null default true,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

-- Reubica el valor existente de opened_shelf_life_days en la columna que
-- corresponda según el storage_type de cada fila, antes de borrarla.
update ingredient set
  pantry_shelf_life_days = case when storage_type = 'pantry' then opened_shelf_life_days else pantry_shelf_life_days end,
  fridge_shelf_life_days = case when storage_type = 'fridge' then opened_shelf_life_days else fridge_shelf_life_days end,
  freezer_shelf_life_days = case when storage_type = 'freezer' then opened_shelf_life_days else freezer_shelf_life_days end
where opened_shelf_life_days is not null;

alter table ingredient drop column opened_shelf_life_days;

-- set_updated_at() ya existe (creada en 20260731100000_dish_active_and_timestamps.sql para dish).
create trigger ingredient_set_updated_at
  before update on ingredient
  for each row
  execute function set_updated_at();

create table ingredient_purchase_link (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references ingredient (id) on delete cascade,
  supermarket supermarket not null,
  url text not null
);

create index ingredient_purchase_link_ingredient_id_idx on ingredient_purchase_link (ingredient_id);

alter table ingredient_purchase_link enable row level security;
create policy ingredient_purchase_link_owner_all on ingredient_purchase_link
  for all
  using (exists (select 1 from ingredient i where i.id = ingredient_id and i.owner_id = auth.uid()))
  with check (exists (select 1 from ingredient i where i.id = ingredient_id and i.owner_id = auth.uid()));
