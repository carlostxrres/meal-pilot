-- La URL de la imagen ya no se guarda: es derivable siempre a partir del
-- id del ingrediente (ver migración anterior, bucket ingredient-images).
-- Guardar una URL manual en paralelo solo podía desincronizarse de lo que
-- realmente hay en el bucket.
alter table ingredient drop column image_url;
