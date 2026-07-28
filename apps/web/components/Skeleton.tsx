/*
Esqueletos de carga (Next `loading.tsx`, ver app/(app)/*): el usuario notaba
~1s de "pantalla congelada" al cambiar de pestaña mientras la ruta nueva
hace sus queries a Supabase. Next muestra este árbol al instante (antes de
que lleguen los datos), así que la navegación se siente inmediata aunque el
contenido real tarde lo mismo que antes.
*/

export function SkeletonBar({ width = "100%" }: { width?: string }) {
  return <div className="skeleton-bar" style={{ width }} />;
}

export function IngredientRowSkeleton() {
  return (
    <div className="ingredient-row skeleton-row">
      <div className="skeleton-thumb" />
      <div className="ingredient-row-info">
        <SkeletonBar width="55%" />
        <SkeletonBar width="35%" />
      </div>
    </div>
  );
}

export function MealRowSkeleton() {
  return (
    <div className="meal-row skeleton-row">
      <div className="meal-row-head">
        <SkeletonBar width="45%" />
        <SkeletonBar width="20%" />
      </div>
      <SkeletonBar width="60%" />
      <SkeletonBar width="90%" />
      <SkeletonBar width="80%" />
    </div>
  );
}
