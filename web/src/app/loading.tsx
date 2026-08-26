import { Container } from "@/components/ui/Container";
import { ProductCardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <Container size="wide" className="py-12">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-4 h-5 w-96" />
      <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </Container>
  );
}
