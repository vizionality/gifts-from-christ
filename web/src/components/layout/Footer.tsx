import Link from "next/link";
import { Container } from "@/components/ui/Container";
import type { WooTerm } from "@/lib/woo/types";

export function Footer({
  siteName,
  description,
  categories,
}: {
  siteName: string;
  description?: string;
  categories: WooTerm[];
}) {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <Container size="wide">
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="font-display text-lg text-ink">{siteName}</p>
            {description ? (
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>

          <nav aria-label="Shop">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
              Shop
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/products"
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  All products
                </Link>
              </li>
              {categories.slice(0, 5).map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/products?category=${category.slug}`}
                    className="text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
              Help
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/cart"
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Your cart
                </Link>
              </li>
              <li>
                <a
                  href={`${process.env.NEXT_PUBLIC_WP_URL}/my-account`}
                  className="text-sm text-ink-muted transition-colors hover:text-ink"
                >
                  Orders &amp; returns
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-line py-6 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <p>Storefront on Vercel · Catalogue in WooCommerce</p>
        </div>
      </Container>
    </footer>
  );
}
