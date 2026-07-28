import { MealRowSkeleton, SkeletonBar } from "@/components/Skeleton";

export default function HomeLoading() {
  return (
    <div aria-hidden="true">
      <SkeletonBar width="180px" />
      <div style={{ marginTop: "var(--space-16)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <MealRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
