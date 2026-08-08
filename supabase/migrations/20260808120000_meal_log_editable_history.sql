-- ADR-0022: el registro de una comida pasa a tener cuatro estados posibles
-- en vez de solo sí/confirmado:
--   - sin responder:                no hay fila
--   - seguí el plan / comí otro plato: confirmed=true, dish_name (+ dish_id
--     si ese plato sigue existiendo)
--   - comí fuera:                   confirmed=true, description, dish_name null
--   - no comí:                      confirmed=false, todo null
--
-- dish_id pasa a nullable + ON DELETE SET NULL, igual que planned_meal
-- (ADR-0019): borrar un plato del catálogo no debe borrar la historia de
-- haberlo comido. dish_name congela el nombre para cuando eso pase.
--
-- El CHECK se apoya en dish_name/description, nunca en dish_id: ON DELETE
-- SET NULL es un UPDATE, y Postgres revalida los CHECK en cada UPDATE --
-- un CHECK sobre dish_id haría fallar el borrado de cualquier plato que
-- alguna vez se hubiera registrado como comido.
--
-- unique(owner_id, date, meal_id): hoy setMealConfirmed/confirm_meal lo
-- compensan a mano borrando antes de insertar; con el historial editable
-- desde /historial además de desde "Hoy", vale la pena que lo garantice el
-- propio esquema.

alter table meal_log
  drop constraint meal_log_dish_id_fkey,
  alter column dish_id drop not null,
  add column dish_name text,
  add column description text,
  add constraint meal_log_dish_id_fkey foreign key (dish_id) references dish (id) on delete set null;

-- Backfill antes del CHECK: las filas existentes (todas confirmed=true con
-- dish_id, del estado anterior a este ADR) necesitan dish_name para seguir
-- siendo válidas bajo la nueva regla.
update meal_log
set dish_name = dish.name
from dish
where meal_log.dish_id = dish.id and meal_log.dish_name is null;

alter table meal_log
  add constraint meal_log_owner_date_meal_unique unique (owner_id, date, meal_id);

alter table meal_log
  add constraint meal_log_state_valid check (
    (confirmed and (dish_name is not null) <> (description is not null))
    or (not confirmed and dish_name is null and description is null)
  );
