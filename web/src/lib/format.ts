import type { WooPrices } from "@/lib/woo/types";

/**
 * The Store API returns amounts as integer strings in minor units together
 * with the formatting rules for the store's currency. Reuse those rules so a
 * store switched to EUR or JPY formats correctly without a frontend change.
 */
export function formatMoney(
  amountMinor: string | number,
  prices: Pick<
    WooPrices,
    | "currency_minor_unit"
    | "currency_decimal_separator"
    | "currency_thousand_separator"
    | "currency_prefix"
    | "currency_suffix"
  >,
): string {
  const minor = typeof amountMinor === "string" ? Number(amountMinor) : amountMinor;
  if (!Number.isFinite(minor)) return "";

  const unit = prices.currency_minor_unit ?? 2;
  const value = minor / 10 ** unit;

  const [whole, fraction = ""] = value.toFixed(unit).split(".");
  const grouped = whole.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    prices.currency_thousand_separator || ",",
  );

  const body = unit > 0
    ? `${grouped}${prices.currency_decimal_separator || "."}${fraction}`
    : grouped;

  return `${prices.currency_prefix ?? ""}${body}${prices.currency_suffix ?? ""}`;
}

/** Percentage saved, rounded — returns null when the product is not on sale. */
export function discountPercent(prices: WooPrices): number | null {
  const regular = Number(prices.regular_price);
  const current = Number(prices.price);
  if (!regular || !current || current >= regular) return null;
  return Math.round(((regular - current) / regular) * 100);
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201c",
  rdquo: "\u201d",
};

/**
 * WordPress returns titles and term names HTML-encoded — a category saved as
 * "Home & Table" arrives as "Home &amp; Table". React escapes on output, so
 * these must be decoded before render or the entity shows up literally.
 *
 * Deliberately not a DOM-based decoder: this runs during server rendering too.
 */
export function decodeEntities(value: string): string {
  if (!value || !value.includes("&")) return value;

  return value.replace(
    /&(#x?[0-9a-f]+|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity[0] === "#") {
        const code =
          entity[1] === "x" || entity[1] === "X"
            ? Number.parseInt(entity.slice(2), 16)
            : Number.parseInt(entity.slice(1), 10);

        // Reject non-characters rather than emitting a replacement glyph.
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : match;
      }

      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    },
  );
}

/** Strip WordPress-rendered HTML down to plain text for meta descriptions. */
export function toPlainText(html: string, maxLength = 160): string {
  const text = decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
