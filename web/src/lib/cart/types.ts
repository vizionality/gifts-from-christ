import type { WooPrices } from "@/lib/woo/types";

/** Currency formatting rules travel with the line so totals render offline. */
export type CurrencyRules = Pick<
  WooPrices,
  | "currency_code"
  | "currency_symbol"
  | "currency_minor_unit"
  | "currency_decimal_separator"
  | "currency_thousand_separator"
  | "currency_prefix"
  | "currency_suffix"
>;

export interface CartLine {
  /** Parent product id — what WooCommerce needs to add to cart. */
  productId: number;
  /** 0 for simple products. */
  variationId: number;
  /** Selected attributes, e.g. { pa_size: "large" }. */
  variation: Record<string, string>;
  name: string;
  /** Preferred as GA4 item_id, so the funnel keys on one identifier throughout. */
  sku: string;
  slug: string;
  image: string | null;
  imageAlt: string;
  /** Minor units, mirrored from the Store API. */
  priceMinor: number;
  regularPriceMinor: number;
  currency: CurrencyRules;
  quantity: number;
  /** Stock ceiling last seen from Woo; null when unlimited. */
  maxQuantity: number | null;
  inStock: boolean;
}

export interface CartState {
  lines: CartLine[];
  /** True until localStorage has been read, so SSR and CSR markup agree. */
  hydrated: boolean;
  /** True while the cart is being revalidated against Woo. */
  validating: boolean;
  /** Set when Woo reports a line changed underneath the shopper. */
  notices: string[];
}

/** Stable identity for a line — a variation is a distinct line. */
export function lineKey(line: Pick<CartLine, "productId" | "variationId">): string {
  return `${line.productId}:${line.variationId}`;
}
