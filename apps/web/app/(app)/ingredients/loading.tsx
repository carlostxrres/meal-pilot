import { IngredientRowSkeleton, SkeletonBar } from "@/components/Skeleton";

export default function IngredientsLoading() {
  return (
    <div aria-hidden="true">
      <div className="inventory-controls">
        <SkeletonBar />
        <SkeletonBar width="140px" />
      </div>
      <div className="dish-filters-row">
        <SkeletonBar width="140px" />
        <SkeletonBar width="160px" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <IngredientRowSkeleton key={i} />
      ))}
    </div>
  );
}
