/*
Esqueletos de carga (Next `loading.tsx`, ver app/(app)/*): el usuario notaba
~1s de "pantalla congelada" al cambiar de pestaña mientras la ruta nueva
hace sus queries a Supabase. Next muestra este árbol al instante (antes de
que lleguen los datos), así que la navegación se siente inmediata aunque el
contenido real tarde lo mismo que antes.
*/

import styles from "./Skeleton.module.css";

export function SkeletonBar({ width = "100%" }: { width?: string }) {
  return <div className={styles['skeleton-bar']} style={{ width }} />;
}

export function IngredientRowSkeleton() {
  return (
    <div className={`${styles['ingredient-row']} ${styles['skeleton-row']}`}>
      <div className={styles['skeleton-thumb']} />
      <div className={styles['ingredient-row-name']}>
        <SkeletonBar width="70%" />
      </div>
      <div className={styles['ingredient-row-description']}>
        <SkeletonBar width="45%" />
      </div>
    </div>
  );
}

export function MealRowSkeleton() {
  return (
    <div className={`${styles['dish-row']} ${styles['skeleton-row']}`}>
      <div className={styles['dish-row-head']}>
        <SkeletonBar width="45%" />
        <SkeletonBar width="20%" />
      </div>
      <SkeletonBar width="60%" />
      <SkeletonBar width="90%" />
      <SkeletonBar width="80%" />
    </div>
  );
}
