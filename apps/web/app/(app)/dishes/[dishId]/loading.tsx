import { MealRowSkeleton, SkeletonBar } from "@/components/Skeleton";

export default function DishLoading() {
  return (
    <div aria-hidden="true">
      <SkeletonBar width="20%" />
      <div style={{ marginTop: "var(--space-16)" }}>
        <MealRowSkeleton />
      </div>
    </div>
  );
}
