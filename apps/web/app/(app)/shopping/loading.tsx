import { IngredientRowSkeleton } from "@/components/Skeleton";

export default function ShoppingLoading() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <IngredientRowSkeleton key={i} />
      ))}
    </div>
  );
}
