import type { WooAttribute } from "@/lib/woo/types";

/**
 * WordPress `sanitize_title()`, narrowed to what attribute names contain.
 *
 * Note that WordPress collapses whitespace and hyphens but *preserves*
 * underscores, so "Shirt_Color" sanitises to "shirt_color", not
 * "shirt-color". Getting that wrong breaks the same way the original bug did.
 */
function sanitizeTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .trim()
    // Whitespace and hyphens collapse to one hyphen; underscores survive.
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The meta key WooCommerce stores a variation attribute under.
 *
 * Global taxonomy attributes arrive already prefixed — `pa_size` becomes
 * `attribute_pa_size`. Custom product attributes have `taxonomy: null` and are
 * keyed by the *sanitised* name, so "Size" becomes `attribute_size`.
 *
 * Using the raw name instead produces `attribute_Size`, which matches no
 * variation and fails silently: the shopper picks a size, and checkout either
 * rejects the line or falls back to the wrong one. Confirmed against the live
 * Store API, which reports `raw_attribute: "attribute_size"` for this store's
 * "Size" attribute.
 */
export function variationAttributeKey(
  attribute: Pick<WooAttribute, "name" | "taxonomy">,
): string {
  const slug = attribute.taxonomy
    ? attribute.taxonomy
    : sanitizeTitle(attribute.name);

  return `attribute_${slug}`;
}
