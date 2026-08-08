-- ADR-0019: el plan de comidas deja de recalcularse en cada render y pasa a
-- ser un compromiso persistido, con horizonte rodante (PLANNING_HORIZON_DAYS,
-- hoy + 2 días). planned_meal es el compromiso; meal_log sigue siendo el
-- hecho (lo que el usuario confirma haber comido).
--
-- dish_id es nullable: resolveMeal puede no tener ninguna candidata válida
-- (unresolved_reason, ver 3.7/5.2 de diseno-sistema.md), y con NOT NULL ese
-- slot nunca podría comprometerse -- el trigger de "hueco" lo reintentaría
-- en cada render sin llegar a persistir nunca el día.
--
-- ON DELETE SET NULL, con dish_name y components (jsonb) congelados aparte:
-- limpiar el catálogo de dishes no debe costar historia. components congela
-- también las cantidades, para que editar una dish después de comprometerla
-- (updateDish borra y reinserta todo dish_ingredient) no altere lo ya
-- prometido ni lo que hay que comprar, y para que el descuento de inventario
-- del ADR-0021 sea reversible con exactitud.
--
-- Deliberadamente sin CHECK de consistencia entre dish_id/dish_name/
-- unresolved_reason: un CHECK apoyado en dish_id fallaría al borrar
-- cualquier dish alguna vez comprometida, porque ON DELETE SET NULL es un
-- UPDATE y Postgres revalida los CHECK en cada UPDATE (la misma trampa que
-- ADR-0022 documenta para meal_log). La combinación correcta de columnas la
-- garantiza el único escritor (el roll-forward perezoso de la capa de
-- datos), no el esquema.

create table planned_meal (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  date date not null,
  meal_id uuid not null references meal (id),
  dish_id uuid references dish (id) on delete set null,
  dish_name text,
  unresolved_reason text,
  components jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  unique (owner_id, date, meal_id)
);

create index planned_meal_owner_id_idx on planned_meal (owner_id);
create index planned_meal_date_idx on planned_meal (date);

alter table planned_meal enable row level security;
create policy planned_meal_owner_all on planned_meal
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
