-- Orden de los componentes de un plato (arrastrar para reordenar en el
-- creador). Backfill determinista para las filas existentes: como no había
-- ningún orden persistido hasta ahora, se usa el id como desempate estable
-- (no representa el orden real en que se crearon, pero deja cada plato con
-- una secuencia 0..n-1 coherente para empezar a reordenar desde ya).
alter table dish_ingredient add column position int not null default 0;

with ordered as (
  select id, row_number() over (partition by dish_id order by id) - 1 as rn
  from dish_ingredient
)
update dish_ingredient di
set position = ordered.rn
from ordered
where di.id = ordered.id;

create index dish_ingredient_dish_id_position_idx on dish_ingredient (dish_id, position);
