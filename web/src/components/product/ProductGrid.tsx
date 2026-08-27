import { ProductCard } from "@/components/product/ProductCard";
import type { WooProduct } from "@/lib/woo/types";
import { cn } from "@/lib/cn";

export function ProductGrid({
  products,
  columns = 4,
  className,
  listName = "Products",
}: {
  products: WooProduct[];
  columns?: 3 | 4;
  className?: string;
  /** Should match the name given to view_item_list for the same grid. */
  listName?: string;
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
          listName={listName}
          index={index}
        />
      ))}
    </div>
  );
}
