import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackViewItem } from "@/components/analytics/TrackView";
import { AddToCartPanel } from "@/components/product/AddToCartPanel";
import { Price } from "@/components/product/Price";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { toPlainText } from "@/lib/format";
import {
  getProductBySlug,
  getProducts,
  getRelatedProducts,
} from "@/lib/woo/products";
import { acf } from "@/lib/woo/types";

type Params = Promise<{ slug: string }>;

/** Pre-render the first page of products; the rest render on demand. */
export async function generateStaticParams() {
  try {
    const { items } = await getProducts({ perPage: 24 });
    return items.map((product) => ({ slug: product.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);

  if (!product) return { title: "Product not found" };

  const fields = acf(product);
  const description =
    fields.tagline || toPlainText(product.short_description || product.description);

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: product.images[0] ? [{ url: product.images[0].src }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;

  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const fields = acf(product);
  const related = await getRelatedProducts(product).catch(() => []);

  const details = [
    { label: "Materials", value: fields.materials },
    { label: "Dimensions", value: fields.dimensions },
    { label: "Care", value: fields.care },
    { label: "SKU", value: product.sku },
  ].filter((detail) => detail.value);

  return (
    <>
      <TrackViewItem product={product} />

      <Container size="wide" className="py-8">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-ink-subtle" role="list">
            <li>
              <Link href="/products" className="hover:text-ink">
                Shop
              </Link>
            </li>
            {product.categories[0] ? (
              <>
                <li aria-hidden>/</li>
                <li>
                  <Link
                    href={`/products?category=${product.categories[0].slug}`}
                    className="hover:text-ink"
                  >
                    {product.categories[0].name}
                  </Link>
                </li>
              </>
            ) : null}
            <li aria-hidden>/</li>
            <li className="text-ink">{product.name}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="lg:pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {fields.badge ? <Badge tone="accent">{fields.badge}</Badge> : null}
              {product.on_sale ? <Badge tone="sale">On sale</Badge> : null}
              {!product.is_in_stock ? (
                <Badge tone="muted">Coming soon</Badge>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl leading-tight text-ink sm:text-4xl">
              {product.name}
            </h1>

            {fields.tagline ? (
              <p className="mt-3 text-lg leading-relaxed text-ink-muted">
                {fields.tagline}
              </p>
            ) : null}

            <div className="mt-5">
              <Price prices={product.prices} size="lg" />
            </div>

            {fields.highlights.length ? (
              <ul className="mt-7 space-y-2.5" role="list">
                {fields.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className="flex gap-3 text-sm leading-relaxed text-ink-muted"
                  >
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {highlight}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-8 border-t border-line pt-8">
              <AddToCartPanel product={product} />
            </div>

            {fields.scripture ? (
              <p className="mt-8 border-l-2 border-accent pl-4 font-display text-sm italic text-ink-muted">
                {fields.scripture}
              </p>
            ) : null}

            {details.length ? (
              <div className="mt-8 divide-y divide-line border-y border-line">
                {details.map((detail) => (
                  <details key={detail.label} className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm text-ink marker:hidden">
                      {detail.label}
                      <span
                        aria-hidden
                        className="text-ink-subtle transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-4 text-sm leading-relaxed text-ink-muted">
                      {detail.value}
                    </p>
                  </details>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Container>

      {product.description ? (
        <section className="border-t border-line py-16">
          <Container size="narrow">
            <h2 className="text-2xl text-ink">About this piece</h2>
            <div
              className="rich-text mt-5"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </Container>
        </section>
      ) : null}

      {fields.lifestyle_image ? (
        <section className="border-t border-line">
          <div className="relative aspect-[21/9] w-full bg-surface-sunk">
            <Image
              src={fields.lifestyle_image.url}
              alt={fields.lifestyle_image.alt || product.name}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section className="border-t border-line py-16">
          <Container size="wide">
            <h2 className="text-2xl text-ink">You might also like</h2>
            <ProductGrid products={related} className="mt-8" />
          </Container>
        </section>
      ) : null}
    </>
  );
}
