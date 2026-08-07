-- Limpieza puntual (mismo patrón que remove_uneasy_ingredients.sql /
-- remove_granada_tofu_edamame.sql): borra los dish con active = false.
-- dish_ingredient se limpia solo (ON DELETE CASCADE). meal_log.dish_id es
-- NOT NULL sin ON DELETE definido (RESTRICT), así que cualquier dish con
-- historial habría bloqueado su propio DELETE — comprobado antes de aplicar
-- esta migración que ninguno de los desactivados actuales tiene filas en
-- meal_log, así que no hace falta excluir ninguno explícitamente.
delete from dish where active = false;
