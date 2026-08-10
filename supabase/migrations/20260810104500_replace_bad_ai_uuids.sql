-- Replace low-entropy AI-generated seed UUIDs (c/d/e/f0000000-0000-0000-0000-*,
-- from the early seed migrations) with proper gen_random_uuid() values, and
-- rewrite every reference to them. See docs/adrs/0004-uuid-como-estrategia-de-ids.md
-- (the original decision this enforces): the schema always defaulted every id
-- to gen_random_uuid(); only rows inserted directly by hand in seed migrations
-- used predictable literals instead.
--
-- Audit trail: public.uuid_migration_map (persistent, not dropped by this
-- migration) records every old_id -> new_id substitution, keyed by
-- migration_id 'replace-bad-ai-uuids-20260810-1045'.
--
-- None of the FKs onto the 4 affected tables have ON UPDATE CASCADE or
-- DEFERRABLE (confirmed live via information_schema before writing this).
-- This migration relaxes them to DEFERRABLE INITIALLY DEFERRED for the
-- duration of this transaction only, so parent ids and every referencing FK
-- column can be updated in any order and are only checked at COMMIT, then
-- restores the original NOT DEFERRABLE INITIALLY IMMEDIATE posture before
-- committing -- net schema footprint is zero, only row content changes.
--
-- One reference is NOT a SQL foreign key: planned_meal.components (jsonb)
-- embeds ingredientId by value (see packages/core/src/data/plannedMealComponents.ts),
-- confirmed live to affect 20 rows. That gets its own targeted jsonb rewrite.

begin;

-- 1. relax every FK pointing at the 4 affected tables to deferred.
alter table public.dish_ingredient alter constraint dish_ingredient_dish_id_fkey deferrable initially deferred;
alter table public.meal_log alter constraint meal_log_dish_id_fkey deferrable initially deferred;
alter table public.planned_meal alter constraint planned_meal_dish_id_fkey deferrable initially deferred;
alter table public.dietary_requirement alter constraint dietary_requirement_scope_ingredient_id_fkey deferrable initially deferred;
alter table public.dish_ingredient alter constraint dish_ingredient_ingredient_id_fkey deferrable initially deferred;
alter table public.ingredient_category_link alter constraint ingredient_category_link_ingredient_id_fkey deferrable initially deferred;
alter table public.ingredient_purchase_link alter constraint ingredient_purchase_link_ingredient_id_fkey deferrable initially deferred;
alter table public.supplement alter constraint supplement_ingredient_id_fkey deferrable initially deferred;
alter table public.dietary_requirement alter constraint dietary_requirement_scope_category_id_fkey deferrable initially deferred;
alter table public.ingredient_category_link alter constraint ingredient_category_link_category_id_fkey deferrable initially deferred;
alter table public.dietary_requirement alter constraint dietary_requirement_meal_id_fkey deferrable initially deferred;
alter table public.dish alter constraint dish_meal_id_fkey deferrable initially deferred;
alter table public.meal_log alter constraint meal_log_meal_id_fkey deferrable initially deferred;
alter table public.meal_tip alter constraint meal_tip_meal_id_fkey deferrable initially deferred;
alter table public.planned_meal alter constraint planned_meal_meal_id_fkey deferrable initially deferred;
alter table public.supplement alter constraint supplement_meal_id_fkey deferrable initially deferred;

set constraints all deferred;

-- 2. rewrite plain FK columns from the mapping table. UPDATE...FROM...WHERE
--    only touches rows whose current value is in the map, so any
--    organically-added (already-good) id is left untouched.
update public.dish_ingredient c set dish_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'dish' and c.dish_id = m.old_id;

update public.meal_log c set dish_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'dish' and c.dish_id = m.old_id;

update public.planned_meal c set dish_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'dish' and c.dish_id = m.old_id;

update public.dietary_requirement c set scope_ingredient_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient' and c.scope_ingredient_id = m.old_id;

update public.dish_ingredient c set ingredient_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient' and c.ingredient_id = m.old_id;

update public.ingredient_category_link c set ingredient_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient' and c.ingredient_id = m.old_id;

update public.ingredient_purchase_link c set ingredient_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient' and c.ingredient_id = m.old_id;

update public.supplement c set ingredient_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient' and c.ingredient_id = m.old_id;

update public.dietary_requirement c set scope_category_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient_category' and c.scope_category_id = m.old_id;

update public.ingredient_category_link c set category_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient_category' and c.category_id = m.old_id;

update public.dietary_requirement c set meal_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'meal' and c.meal_id = m.old_id;

update public.dish c set meal_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'meal' and c.meal_id = m.old_id;

update public.meal_log c set meal_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'meal' and c.meal_id = m.old_id;

update public.meal_tip c set meal_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'meal' and c.meal_id = m.old_id;

update public.planned_meal c set meal_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'meal' and c.meal_id = m.old_id;

update public.supplement c set meal_id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'meal' and c.meal_id = m.old_id;

-- 3. the one embedded-by-value case: planned_meal.components jsonb carries
--    ingredientId as data, not as a SQL FK.
update public.planned_meal pm
set components = (
  select coalesce(jsonb_agg(
    case when m.new_id is not null
      then jsonb_set(elem, '{ingredientId}', to_jsonb(m.new_id::text))
      else elem
    end
  ), '[]'::jsonb)
  from jsonb_array_elements(pm.components) as elem
  left join public.uuid_migration_map m
    on m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient'
   and m.old_id::text = elem->>'ingredientId'
)
where exists (
  select 1 from jsonb_array_elements(pm.components) e2
  join public.uuid_migration_map m2
    on m2.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m2.table_name = 'ingredient'
   and m2.old_id::text = e2->>'ingredientId'
);

-- 4. finally, the parent primary keys themselves.
update public.ingredient_category t set id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient_category' and t.id = m.old_id;

update public.ingredient t set id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'ingredient' and t.id = m.old_id;

update public.dish t set id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'dish' and t.id = m.old_id;

update public.meal t set id = m.new_id
  from public.uuid_migration_map m
  where m.migration_id = 'replace-bad-ai-uuids-20260810-1045' and m.table_name = 'meal' and t.id = m.old_id;

-- 5. force all deferred FK checks to run now, before trying to revert
--    deferrability -- ALTER CONSTRAINT refuses to run while a table still has
--    pending (unfired) deferred trigger events from the updates above.
set constraints all immediate;

-- 6. restore original constraint posture (net schema footprint: zero).
alter table public.dish_ingredient alter constraint dish_ingredient_dish_id_fkey not deferrable initially immediate;
alter table public.meal_log alter constraint meal_log_dish_id_fkey not deferrable initially immediate;
alter table public.planned_meal alter constraint planned_meal_dish_id_fkey not deferrable initially immediate;
alter table public.dietary_requirement alter constraint dietary_requirement_scope_ingredient_id_fkey not deferrable initially immediate;
alter table public.dish_ingredient alter constraint dish_ingredient_ingredient_id_fkey not deferrable initially immediate;
alter table public.ingredient_category_link alter constraint ingredient_category_link_ingredient_id_fkey not deferrable initially immediate;
alter table public.ingredient_purchase_link alter constraint ingredient_purchase_link_ingredient_id_fkey not deferrable initially immediate;
alter table public.supplement alter constraint supplement_ingredient_id_fkey not deferrable initially immediate;
alter table public.dietary_requirement alter constraint dietary_requirement_scope_category_id_fkey not deferrable initially immediate;
alter table public.ingredient_category_link alter constraint ingredient_category_link_category_id_fkey not deferrable initially immediate;
alter table public.dietary_requirement alter constraint dietary_requirement_meal_id_fkey not deferrable initially immediate;
alter table public.dish alter constraint dish_meal_id_fkey not deferrable initially immediate;
alter table public.meal_log alter constraint meal_log_meal_id_fkey not deferrable initially immediate;
alter table public.meal_tip alter constraint meal_tip_meal_id_fkey not deferrable initially immediate;
alter table public.planned_meal alter constraint planned_meal_meal_id_fkey not deferrable initially immediate;
alter table public.supplement alter constraint supplement_meal_id_fkey not deferrable initially immediate;

commit;
