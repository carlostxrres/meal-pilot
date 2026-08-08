-- ADR-0021: confirmar un meal descuenta del inventario las cantidades
-- congeladas en planned_meal.components (no el dish_ingredient vigente,
-- que puede haber cambiado desde que se comprometió). Desconfirmar las
-- devuelve. La escritura en meal_log y el descuento van en una única
-- función para que sean atómicos.
--
-- Clamp a 0, nunca negativo: el generador no exige stock (la disponibilidad
-- puntúa pero no filtra, ver ADR-0020), así que confirmar un plato del que
-- no tienes todos los ingredientes es el caso normal, no el raro. Sin el
-- clamp, ingredient_inventory_non_negative reventaría con un 23514.
--
-- De qué lado se descuenta: primero el lado que corresponde al meal
-- (oficina, salvo el meal más temprano del día -- desayuno en casa --
-- que descuenta de casa), cayendo al otro si no alcanza. Es orientativo,
-- no autoritativo (no existe evento "ya me lo he llevado" que mueva stock
-- entre lados, ver ADR-0021): al desconfirmar se devuelve la cantidad
-- íntegra al mismo lado primario, sin reconstruir el reparto exacto que
-- tuvo el descuento original -- un ledger de movimientos daría
-- reversibilidad exacta pero ADR-0021 lo descarta por desproporcionado.
--
-- security invoker (no definer): corre con los privilegios y RLS de quien
-- llama, igual que el resto del acceso a datos de este proyecto -- no se
-- filtra owner_id explícitamente en las consultas internas porque RLS ya
-- lo hace, siguiendo la convención de fetchDailyContext.ts.
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
begin
  if v_owner_id is null then
    raise exception 'confirm_meal: no hay usuario autenticado';
  end if;

  select exists (
    select 1 from meal_log
    where date = p_date and meal_id = p_meal_id and confirmed
  ) into v_already_confirmed;

  -- Idempotente: si el estado pedido ya es el actual, no hay nada que
  -- descontar/devolver (evita doble descuento si se repite la llamada).
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
    insert into meal_log (owner_id, date, meal_id, dish_id, confirmed)
    values (v_owner_id, p_date, p_meal_id, p_dish_id, true);
  end if;
end;
$$;

grant execute on function confirm_meal(date, uuid, uuid, boolean) to authenticated;
