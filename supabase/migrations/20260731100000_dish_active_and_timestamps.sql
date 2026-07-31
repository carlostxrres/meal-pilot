-- Añade a `dish`: activo/desactivado (el usuario puede ocultar un plato del
-- catálogo sin borrarlo) y fecha de creación/última modificación, para poder
-- ordenar el catálogo de Platos por esos criterios.

alter table dish
  add column active boolean not null default true,
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dish_set_updated_at
  before update on dish
  for each row
  execute function set_updated_at();
