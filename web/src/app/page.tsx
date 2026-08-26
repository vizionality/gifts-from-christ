import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ProductGrid } from "@/components/product/ProductGrid";
import { getFeaturedProducts, getShopConfig } from "@/lib/woo/products";
import type { WooProduct } from "@/lib/woo/types";

export default async function HomePage() {
  const config = await getShopConfig();

  let featured: WooProduct[] = [];
  try {
    featured = await getFeaturedProducts(4);
  } catch {
    featured = [];
  }

  const hero = config?.hero;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <Container size="wide">
          <div className="grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
            <div className="max-w-xl">
              {hero?.eyebrow ? (
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                  {hero.eyebrow}
                </p>
              ) : null}

              <h1 className="mt-4 text-balance text-4xl leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
                {hero?.heading ?? "Objects for a practised faith"}
              </h1>

              <p className="mt-5 text-pretty text-base leading-relaxed text-ink-muted sm:text-lg">
                {hero?.body ??
                  "Wood, brass, linen and clay, worked by hand and built to outlast the people who buy them."}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href={hero?.cta_url || "/products"} size="lg">
                  {hero?.cta_label || "Browse the collection"}
                </ButtonLink>
                <ButtonLink href="/products?sort=price" variant="secondary" size="lg">
                  Shop by price
                </ButtonLink>
              </div>
            </div>

            <div className="relative aspect-[5/4] overflow-hidden rounded-card bg-surface-sunk lg:aspect-[4/3]">
              {hero?.image?.url ? (
                <Image
                  src={hero.image.url}
                  alt={hero.image.alt || ""}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      {config?.categories.length ? (
        <section className="border-b border-line py-14">
          <Container size="wide">
            <h2 className="text-2xl text-ink">Browse by category</h2>
            <ul className="mt-6 flex flex-wrap gap-3" role="list">
              {config.categories.map((category) => (
                <li key={category.id}>
                  <ButtonLink
                    href={`/products?category=${category.slug}`}
                    variant="secondary"
                    size="sm"
                  >
                    {category.name}
                    <span className="text-ink-subtle">{category.count}</span>
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <section className="py-16">
        <Container size="wide">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl text-ink sm:text-3xl">Featured</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Chosen in the WordPress admin — flip the ACF toggle on any product.
              </p>
            </div>
            <ButtonLink href="/products" variant="ghost" size="sm">
              View all →
            </ButtonLink>
          </div>

          {featured.length ? (
            <ProductGrid products={featured} className="mt-10" />
          ) : (
            <p className="mt-10 rounded-card border border-dashed border-line-strong px-6 py-16 text-center text-sm text-ink-muted">
              No featured products yet. Mark some as featured in WooCommerce, or
              check that the WordPress backend is running.
            </p>
          )}
        </Container>
      </section>
    </>
  );
}
