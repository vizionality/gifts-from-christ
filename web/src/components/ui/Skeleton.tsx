import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-sunk", className)}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[4/5] w-full rounded-card" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}
