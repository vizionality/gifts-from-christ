import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getCategories, getProducts } from "@/lib/woo/products";

/** Revalidate daily; the catalogue does not change often enough to warrant more. */
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    // 100 is the Store API ceiling per page; paginate if the catalogue grows
    // past a few hundred items.
    const [{ items }, categories] = await Promise.all([
      getProducts({ perPage: 100 }),
      getCategories(),
    ]);

    return [
      ...staticEntries,
      ...categories.map((category) => ({
        url: `${SITE_URL}/products?category=${category.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...items.map((product) => ({
        url: `${SITE_URL}/products/${product.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    // A sitemap missing its products beats a build that fails because
    // WordPress was briefly unreachable.
    console.error("[sitemap] falling back to static entries", error);
    return staticEntries;
  }
}
