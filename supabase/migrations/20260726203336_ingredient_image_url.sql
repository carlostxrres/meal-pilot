-- Feedback de UI: mostrar una imagen por ingrediente en Inventario/Compra.
-- Sin pipeline de assets todavia: URL manual, subida desde Inventario.
alter table ingredient add column image_url text;
