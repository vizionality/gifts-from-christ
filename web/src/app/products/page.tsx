import type { Metadata } from "next";
import { Suspense } from "react";
import { TrackViewItemList } from "@/components/analytics/TrackView";
import { ProductFilters } from "@/components/product/ProductFilters";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCategories, getProducts, type ProductSort } from "@/lib/woo/products";
import type { WooTerm } from "@/lib/woo/types";

export const metadata: Metadata = {
  title: "All products",
  description: "The full collection.",
};

const PER_PAGE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const page = Math.max(1, Number(first(params.page) ?? 1) || 1);
  const category = first(params.category);
  const search = first(params.search);
  const sort = (first(params.sort) ?? "date") as ProductSort;

  return (
    <Container size="wide" className="py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">
          {search ? `Results for “${search}”` : "The collection"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Every piece is made in small batches. Stock counts are live from
          WooCommerce.
        </p>
      </header>

      <Suspense
        key={`${page}-${category}-${search}-${sort}`}
        fallback={<Skeleton className="mt-10 h-32 w-full" />}
      >
        <Results
          page={page}
          category={category}
          search={search}
          sort={sort}
          params={params}
        />
      </Suspense>
    </Container>
  );
}

async function Results({
  page,
  category,
  search,
  sort,
  params,
}: {
  page: number;
  category?: string;
  search?: string;
  sort: ProductSort;
  params: Record<string, string | string[] | undefined>;
}) {
  let products;
  let categories: WooTerm[] = [];

  try {
    [products, categories] = await Promise.all([
      getProducts({ page, perPage: PER_PAGE, category, search, sort }),
      getCategories(),
    ]);
  } catch (error) {
    console.error("[products]", error);
    return (
      <div className="mt-10">
        <EmptyState
          title="The store is unreachable"
          description="WooCommerce did not respond. If you are running locally, check that the WordPress container is up."
          action={<ButtonLink href="/products">Try again</ButtonLink>}
        />
      </div>
    );
  }

  /** Preserve every active filter when moving between pages. */
  function buildHref(nextPage: number): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const single = Array.isArray(value) ? value[0] : value;
      if (single && key !== "page") query.set(key, single);
    }
    if (nextPage > 1) query.set("page", String(nextPage));

    const queryString = query.toString();
    return queryString ? `/products?${queryString}` : "/products";
  }

  return (
    <>
      <div className="mt-10">
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <ProductFilters categories={categories} total={products.total} />
        </Suspense>
      </div>

      {products.items.length ? (
        <>
          <TrackViewItemList
            products={products.items}
            listName={category ? `Category: ${category}` : "All products"}
          />
          <ProductGrid products={products.items} className="mt-10" />
          <Pagination
            page={page}
            totalPages={products.totalPages}
            buildHref={buildHref}
          />
        </>
      ) : (
        <div className="mt-10">
          <EmptyState
            title="Nothing matched"
            description={
              search
                ? `No products match “${search}”. Try a broader term.`
                : "There are no products in this category yet."
            }
            action={
              <ButtonLink href="/products" variant="secondary">
                Clear filters
              </ButtonLink>
            }
          />
        </div>
      )}
    </>
  );
}
