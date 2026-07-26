const BUCKET = "ingredient-images";

/**
 * URL pública de la foto de un ingrediente. Nombre de archivo determinista
 * ({ingredient.id}.png), subido a mano por el usuario al bucket — no hay
 * columna en la base de datos que la guarde (ver migración
 * 20260726210341_drop_ingredient_image_url.sql). Puede no existir para
 * ingredientes sin foto todavía; quien la use debe manejar el 404
 * (ver `onError` en los componentes que la consumen).
 */
export function ingredientImageUrl(ingredientId: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${BUCKET}/${ingredientId}.png`;
}
