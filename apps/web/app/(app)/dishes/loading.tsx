import { MealRowSkeleton, SkeletonBar } from "@/components/Skeleton";

export default function DishesLoading() {
  return (
    <div aria-hidden="true">
      <SkeletonBar width="100%" />
      <div style={{ marginTop: "var(--space-16)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <MealRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
