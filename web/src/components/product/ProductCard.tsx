import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/product/Price";
import { acf, type WooProduct } from "@/lib/woo/types";

export function ProductCard({
  product,
  priority = false,
}: {
  product: WooProduct;
  priority?: boolean;
}) {
  const fields = acf(product);
  const image = product.images[0];
  const onSale = Number(product.prices.price) < Number(product.prices.regular_price);
  const soldOut = !product.is_in_stock;

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-surface-sunk">
        {image ? (
          <Image
            src={image.src}
            alt={image.alt || product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-subtle">
            No image
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut ? (
            <Badge tone="muted">Sold out</Badge>
          ) : onSale ? (
            <Badge tone="sale">Sale</Badge>
          ) : fields.badge ? (
            <Badge tone="accent">{fields.badge}</Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <h3 className="text-[17px] leading-snug text-ink">
          <Link href={`/products/${product.slug}`} className="before:absolute before:inset-0">
            {product.name}
          </Link>
        </h3>

        {fields.tagline ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {fields.tagline}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <Price prices={product.prices} size="sm" />
          {product.categories[0] ? (
            <span className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle">
              {product.categories[0].name}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
