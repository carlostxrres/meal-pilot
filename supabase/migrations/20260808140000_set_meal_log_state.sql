-- ADR-0022: /historial y el repaso guiado necesitan escribir cualquiera de
-- los cuatro estados de meal_log, no solo el sí/no de confirm_meal
-- (ADR-0021, pensado para el checkbox de "Hoy"). set_meal_log_state cubre
-- los cuatro: seguí el plan / comí otro plato (followed_plan), comí fuera
-- (ate_out), no comí (denied, fila explícita con confirmed=false, distinta
-- de "sin responder" que es la ausencia de fila) y sin responder
-- (unanswered, borra la fila).
--
-- Alcance del inventario en esta función, decisión explícita: como
-- confirm_meal descuenta solo si el dish_id coincide con el
-- comprometido en planned_meal, esta función replica exactamente esa
-- misma condición para decidir si descuenta o devuelve -- así que
-- "followed_plan" con el plato ya comprometido descuenta igual que el
-- checkbox de Hoy, pero "followed_plan" con un plato DISTINTO
-- ("comí otro plato") y "ate_out" nunca descuentan nada nuevo. Si el
-- estado anterior sí tenía descuento (porque era followed_plan con el
-- plato comprometido) y el nuevo estado ya no lo mantiene, se devuelve
-- antes de aplicar el cambio. La alternativa -- descontar también por el
-- plato registrado en "comí otro plato", usando su dish_ingredient vigente
-- -- se descarta aquí porque no hay snapshot congelado para ese plato
-- (a diferencia de planned_meal.components), así que revertirlo más tarde
-- si se vuelve a editar la entrada no sería exacto.

create or replace function apply_planned_meal_deduction(
  p_date date,
  p_meal_id uuid,
  p_sign int -- -1 descuenta, +1 devuelve
) returns void
language plpgsql
security invoker
as $$
declare
  v_home_first boolean;
  v_component record;
begin
  select (m.id = (select id from meal order by usual_start_time limit 1)) into v_home_first
  from meal m where m.id = p_meal_id;

  for v_component in
    select (c ->> 'ingredientId')::uuid as ingredient_id, (c ->> 'quantity')::numeric as quantity
    from planned_meal pm, jsonb_array_elements(pm.components) as c
    where pm.date = p_date and pm.meal_id = p_meal_id
  loop
    if p_sign < 0 then
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
end;
$$;

-- confirm_meal (ADR-0021) reescrita para compartir apply_planned_meal_deduction
-- -- mismo comportamiento que antes, sin duplicar el reparto oficina/casa.
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

  perform apply_planned_meal_deduction(p_date, p_meal_id, case when p_confirmed then -1 else 1 end);

  delete from meal_log where date = p_date and meal_id = p_meal_id;

  if p_confirmed then
    select name into v_dish_name from dish where id = p_dish_id;
    insert into meal_log (owner_id, date, meal_id, dish_id, dish_name, confirmed)
    values (v_owner_id, p_date, p_meal_id, p_dish_id, v_dish_name, true);
  end if;
end;
$$;

create or replace function set_meal_log_state(
  p_date date,
  p_meal_id uuid,
  p_state text, -- 'followed_plan' | 'ate_out' | 'denied' | 'unanswered'
  p_dish_id uuid default null,
  p_description text default null
) returns void
language plpgsql
security invoker
as $$
declare
  v_owner_id uuid := auth.uid();
  v_planned_dish_id uuid;
  v_dish_name text;
  v_existing record;
  v_had_deduction boolean;
  v_will_deduct boolean;
begin
  if v_owner_id is null then
    raise exception 'set_meal_log_state: no hay usuario autenticado';
  end if;
  if p_state not in ('followed_plan', 'ate_out', 'denied', 'unanswered') then
    raise exception 'set_meal_log_state: estado desconocido %', p_state;
  end if;
  if p_state = 'followed_plan' and p_dish_id is null then
    raise exception 'set_meal_log_state: followed_plan necesita p_dish_id';
  end if;
  if p_state = 'ate_out' and (p_description is null or btrim(p_description) = '') then
    raise exception 'set_meal_log_state: ate_out necesita p_description';
  end if;

  select dish_id into v_planned_dish_id from planned_meal
  where date = p_date and meal_id = p_meal_id;

  select * into v_existing from meal_log where date = p_date and meal_id = p_meal_id;

  v_had_deduction := v_existing.confirmed and v_existing.dish_id is not null
    and v_existing.dish_id = v_planned_dish_id;
  v_will_deduct := p_state = 'followed_plan' and p_dish_id = v_planned_dish_id;

  if v_had_deduction and not v_will_deduct then
    perform apply_planned_meal_deduction(p_date, p_meal_id, 1);
  elsif v_will_deduct and not v_had_deduction then
    perform apply_planned_meal_deduction(p_date, p_meal_id, -1);
  end if;

  delete from meal_log where date = p_date and meal_id = p_meal_id;

  if p_state = 'unanswered' then
    return;
  elsif p_state = 'followed_plan' then
    select name into v_dish_name from dish where id = p_dish_id;
    insert into meal_log (owner_id, date, meal_id, dish_id, dish_name, confirmed)
    values (v_owner_id, p_date, p_meal_id, p_dish_id, v_dish_name, true);
  elsif p_state = 'ate_out' then
    insert into meal_log (owner_id, date, meal_id, description, confirmed)
    values (v_owner_id, p_date, p_meal_id, p_description, true);
  elsif p_state = 'denied' then
    insert into meal_log (owner_id, date, meal_id, confirmed)
    values (v_owner_id, p_date, p_meal_id, false);
  end if;
end;
$$;

grant execute on function apply_planned_meal_deduction(date, uuid, int) to authenticated;
grant execute on function confirm_meal(date, uuid, uuid, boolean) to authenticated;
grant execute on function set_meal_log_state(date, uuid, text, uuid, text) to authenticated;
