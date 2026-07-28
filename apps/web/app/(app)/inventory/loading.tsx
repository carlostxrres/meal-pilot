import { IngredientRowSkeleton, SkeletonBar } from "@/components/Skeleton";

export default function InventoryLoading() {
  return (
    <div aria-hidden="true">
      <div className="inventory-controls">
        <SkeletonBar />
        <SkeletonBar width="140px" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <IngredientRowSkeleton key={i} />
      ))}
    </div>
  );
}
