-- Bucket público para las fotos de ingrediente (fijas, subidas a mano por
-- el usuario desde el dashboard de Supabase). Nombre de archivo
-- determinista: {ingredient.id}.png -- la URL se construye en el cliente,
-- no hace falta guardarla en la tabla ingredient (ver migración siguiente,
-- que elimina la columna image_url que sí lo hacía).
insert into storage.buckets (id, name, public)
values ('ingredient-images', 'ingredient-images', true)
on conflict (id) do nothing;

create policy "Public read access to ingredient images"
on storage.objects for select
using (bucket_id = 'ingredient-images');
