-- Corrige confirm_meal (ADR-0021) tras el CHECK de meal_log_state_valid
-- introducido por ADR-0022: confirmed=true exige dish_name o description no
-- nulos, y la función insertaba solo dish_id. "Hoy" solo confirma el plato
-- ya comprometido (nunca uno distinto ni "comí fuera" -- eso es
-- /historial, ADR-0022), así que dish_name se congela desde el propio
-- nombre de la dish en el momento de confirmar.
create or replace function confirm_meal(
  p_date date,
  p_meal_id uuid,
  p_dish_id uuid,
  p_confirmed boolean
) returns void
language plpgsql
security invoker
as $$
declare
  v_owner_id uuid := auth.uid();
  v_already_confirmed boolean;
  v_home_first boolean;
  v_component record;
  v_dish_name text;
begin
  if v_owner_id is null then
    raise exception 'confirm_meal: no hay usuario autenticado';
  end if;

  select exists (
    select 1 from meal_log
    where date = p_date and meal_id = p_meal_id and confirmed
  ) into v_already_confirmed;

  if p_confirmed = v_already_confirmed then
    if not p_confirmed then
      delete from meal_log where date = p_date and meal_id = p_meal_id;
    end if;
    return;
  end if;

  select (m.id = (select id from meal order by usual_start_time limit 1)) into v_home_first
  from meal m where m.id = p_meal_id;

  for v_component in
    select (c ->> 'ingredientId')::uuid as ingredient_id, (c ->> 'quantity')::numeric as quantity
    from planned_meal pm, jsonb_array_elements(pm.components) as c
    where pm.date = p_date and pm.meal_id = p_meal_id
  loop
    if p_confirmed then
      if v_home_first then
        update ingredient set
          office_inventory = greatest(office_inventory - greatest(v_component.quantity - home_inventory, 0), 0),
          home_inventory = greatest(home_inventory - v_component.quantity, 0)
        where id = v_component.ingredient_id;
      else
        update ingredient set
          home_inventory = greatest(home_inventory - greatest(v_component.quantity - office_inventory, 0), 0),
          office_inventory = greatest(office_inventory - v_component.quantity, 0)
        where id = v_component.ingredient_id;
      end if;
    else
      if v_home_first then
        update ingredient set home_inventory = home_inventory + v_component.quantity
        where id = v_component.ingredient_id;
      else
        update ingredient set office_inventory = office_inventory + v_component.quantity
        where id = v_component.ingredient_id;
      end if;
    end if;
  end loop;

  delete from meal_log where date = p_date and meal_id = p_meal_id;

  if p_confirmed then
    select name into v_dish_name from dish where id = p_dish_id;
    insert into meal_log (owner_id, date, meal_id, dish_id, dish_name, confirmed)
    values (v_owner_id, p_date, p_meal_id, p_dish_id, v_dish_name, true);
  end if;
end;
$$;

grant execute on function confirm_meal(date, uuid, uuid, boolean) to authenticated;
