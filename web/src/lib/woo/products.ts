import { HEADLESS_API, STORE_API } from "@/lib/env";
import { decodeEntities } from "@/lib/format";
import { wooFetch } from "@/lib/woo/client";
import type {
  Paginated,
  ShopConfig,
  WooProduct,
  WooTerm,
} from "@/lib/woo/types";

/**
 * WordPress hands back HTML-encoded titles and term names. Decode once, here,
 * so no component has to remember to do it.
 */
function normalizeTerm(term: WooTerm): WooTerm {
  return { ...term, name: decodeEntities(term.name) };
}

function normalizeProduct(product: WooProduct): WooProduct {
  const fields = product.extensions?.spiritual_gifts;

  return {
    ...product,
    name: decodeEntities(product.name),
    categories: product.categories.map(normalizeTerm),
    tags: product.tags.map(normalizeTerm),
    attributes: product.attributes.map((attribute) => ({
      ...attribute,
      name: decodeEntities(attribute.name),
      terms: attribute.terms.map(normalizeTerm),
    })),
    extensions: fields
      ? {
          ...product.extensions,
          spiritual_gifts: {
            ...fields,
            badge: decodeEntities(fields.badge ?? ""),
            tagline: decodeEntities(fields.tagline ?? ""),
            materials: decodeEntities(fields.materials ?? ""),
            dimensions: decodeEntities(fields.dimensions ?? ""),
            care: decodeEntities(fields.care ?? ""),
            scripture: decodeEntities(fields.scripture ?? ""),
            shipping_note: decodeEntities(fields.shipping_note ?? ""),
            highlights: (fields.highlights ?? []).map(decodeEntities),
          },
        }
      : product.extensions,
  };
}

export type ProductSort =
  | "date"
  | "price"
  | "price-desc"
  | "popularity"
  | "rating"
  | "title";

export interface ProductQuery {
  page?: number;
  perPage?: number;
  /** product_cat slug */
  category?: string;
  search?: string;
  sort?: ProductSort;
  /** Restrict to specific ids — used to refresh cart lines. */
  include?: number[];
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
}

/** Map our sort keys onto the Store API's orderby/order pair. */
function sortParams(sort: ProductSort = "date"): {
  orderby: string;
  order: "asc" | "desc";
} {
  switch (sort) {
    case "price":
      return { orderby: "price", order: "asc" };
    case "price-desc":
      return { orderby: "price", order: "desc" };
    case "popularity":
      return { orderby: "popularity", order: "desc" };
    case "rating":
      return { orderby: "rating", order: "desc" };
    case "title":
      return { orderby: "title", order: "asc" };
    default:
      return { orderby: "date", order: "desc" };
  }
}

export async function getProducts(
  query: ProductQuery = {},
): Promise<Paginated<WooProduct>> {
  const { orderby, order } = sortParams(query.sort);

  const { data, headers } = await wooFetch<WooProduct[]>(
    STORE_API,
    "/products",
    {
      params: {
        page: query.page ?? 1,
        per_page: query.perPage ?? 12,
        category: query.category,
        search: query.search,
        orderby,
        order,
        include: query.include?.length ? query.include.join(",") : undefined,
        // Store API expects price filters in major units.
        min_price: query.minPrice,
        max_price: query.maxPrice,
        on_sale: query.onSale ? true : undefined,
        catalog_visibility: "catalog",
      },
      tags: ["products"],
    },
  );

  return {
    items: data.map(normalizeProduct),
    total: Number(headers.get("x-wp-total") ?? data.length),
    totalPages: Number(headers.get("x-wp-totalpages") ?? 1),
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<WooProduct | null> {
  const { data } = await wooFetch<WooProduct[]>(STORE_API, "/products", {
    params: { slug, per_page: 1 },
    tags: ["products", `product:${slug}`],
  });

  return data[0] ? normalizeProduct(data[0]) : null;
}

/**
 * Look products up by id. Used to re-validate the client cart against live
 * pricing and stock, since the cart itself lives in the browser.
 */
export async function getProductsByIds(ids: number[]): Promise<WooProduct[]> {
  if (!ids.length) return [];

  const { data } = await wooFetch<WooProduct[]>(STORE_API, "/products", {
    params: { include: ids.join(","), per_page: Math.min(ids.length, 100) },
    // Cart lines must reflect current stock, so this one is not cached.
    revalidate: 0,
  });

  return data.map(normalizeProduct);
}

export async function getCategories(): Promise<WooTerm[]> {
  const { data } = await wooFetch<WooTerm[]>(STORE_API, "/products/categories", {
    params: { per_page: 100, hide_empty: true },
    tags: ["categories"],
  });

  return data.map(normalizeTerm);
}

export async function getShopConfig(): Promise<ShopConfig | null> {
  try {
    const { data } = await wooFetch<ShopConfig>(HEADLESS_API, "/shop-config", {
      tags: ["shop-config"],
    });

    return {
      ...data,
      site: {
        name: decodeEntities(data.site?.name ?? ""),
        description: decodeEntities(data.site?.description ?? ""),
      },
      hero: Object.fromEntries(
        Object.entries(data.hero ?? {}).map(([key, value]) =>
          typeof value === "string" ? [key, decodeEntities(value)] : [key, value],
        ),
      ) as ShopConfig["hero"],
      categories: (data.categories ?? []).map(normalizeTerm),
    };
  } catch {
    // The storefront must still render if the mu-plugin is not installed yet.
    return null;
  }
}

export async function getFeaturedProducts(limit = 4): Promise<WooProduct[]> {
  const { data } = await wooFetch<WooProduct[]>(STORE_API, "/products", {
    params: { featured: true, per_page: limit, catalog_visibility: "catalog" },
    tags: ["products", "featured"],
  });

  return data.map(normalizeProduct);
}

/** Same-category products, excluding the one being viewed. */
export async function getRelatedProducts(
  product: WooProduct,
  limit = 4,
): Promise<WooProduct[]> {
  const category = product.categories[0]?.slug;
  if (!category) return [];

  const { items } = await getProducts({ category, perPage: limit + 1 });

  return items.filter((item) => item.id !== product.id).slice(0, limit);
}
