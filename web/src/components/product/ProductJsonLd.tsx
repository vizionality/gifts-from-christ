import { SITE_URL } from "@/lib/env";
import { toPlainText } from "@/lib/format";
import { acf, type WooProduct } from "@/lib/woo/types";

/**
 * Product structured data, so search results can carry price and availability
 * rather than just a blue link.
 *
 * Everything here is derived from live WooCommerce data. Availability in
 * particular is reported honestly: demand-test listings say OutOfStock, which
 * is both true and what Google requires — a store caught claiming stock it
 * does not have loses rich results across the whole domain.
 */
export function ProductJsonLd({ product }: { product: WooProduct }) {
  const fields = acf(product);
  const minorUnit = product.prices.currency_minor_unit ?? 2;

  const toMajor = (minor: string) => {
    const value = Number(minor);
    return Number.isFinite(value) ? (value / 10 ** minorUnit).toFixed(minorUnit) : undefined;
  };

  const url = `${SITE_URL}/products/${product.slug}`;

  const description =
    fields.tagline ||
    toPlainText(product.short_description || product.description, 300);

  const offers: Record<string, unknown> = {
    "@type": "Offer",
    url,
    priceCurrency: product.prices.currency_code || "USD",
    availability: product.is_in_stock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
  };

  // A variable product spans a range; a single `price` would be a guess.
  if (product.prices.price_range) {
    offers["@type"] = "AggregateOffer";
    offers.lowPrice = toMajor(product.prices.price_range.min_amount);
    offers.highPrice = toMajor(product.prices.price_range.max_amount);
    offers.offerCount = product.variations.length || undefined;
  } else {
    offers.price = toMajor(product.prices.price);
  }

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    description: description || undefined,
    sku: product.sku || undefined,
    image: product.images.length
      ? product.images.map((image) => image.src)
      : undefined,
    category: product.categories[0]?.name,
    offers,
  };

  // Only claim a rating when one actually exists; an invented 0 is worse than
  // omitting the field, and Google penalises unverifiable review markup.
  const reviewCount = Number(product.review_count);
  const rating = Number(product.average_rating);
  if (reviewCount > 0 && rating > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating,
      reviewCount,
    };
  }

  if (fields.materials) data.material = fields.materials;

  // Strip any closing tag that could break out of the script element.
  const json = JSON.stringify(data).replace(/<\/script/gi, "<\\/script");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
