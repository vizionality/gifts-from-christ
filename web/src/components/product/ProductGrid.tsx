import { ProductCard } from "@/components/product/ProductCard";
import type { WooProduct } from "@/lib/woo/types";
import { cn } from "@/lib/cn";

export function ProductGrid({
  products,
  columns = 4,
  className,
}: {
  products: WooProduct[];
  columns?: 3 | 4;
  className?: string;
}) {
  const cols =
    columns === 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid grid-cols-2 gap-x-5 gap-y-10", cols, className)}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < columns}
        />
      ))}
    </div>
  );
}
