/**
 * GA4 ecommerce events.
 *
 * The shop is running a painted-door demand test: Kerusso products are listed
 * as out of stock, and the intent to buy is what we are measuring. `add_to_cart`
 * is fired for that intent deliberately, because GA4's built-in Item report
 * ranks by "Items added to cart" — which is exactly the bulk-buy shortlist.
 *
 * Consequence to expect in the reports: add-to-cart counts with a zero purchase
 * rate, by design, for as long as the test runs.
 */

import type { WooProduct } from "@/lib/woo/types";

type GtagArgs =
  | ["event", string, Record<string, unknown>]
  | ["config", string, Record<string, unknown>?]
  | ["consent", string, Record<string, unknown>];

declare global {
  interface Window {
    gtag?: (...args: GtagArgs) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

/** The subset of a cart line these events need, so the cart owns its own type. */
export interface CartLineForAnalytics {
  productId: number;
  sku?: string;
  name: string;
  priceMinor: number;
  quantity: number;
  currency: { currency_code: string; currency_minor_unit: number };
}

function cartPayload(lines: CartLineForAnalytics[]): Record<string, unknown> {
  const minorUnit = lines[0]?.currency.currency_minor_unit ?? 2;
  const total = lines.reduce(
    (sum, line) => sum + line.priceMinor * line.quantity,
    0,
  );

  return {
    currency: lines[0]?.currency.currency_code || "USD",
    value: Number((total / 10 ** minorUnit).toFixed(minorUnit)),
    items: lines.map((line) => ({
      item_id: line.sku || String(line.productId),
      item_name: line.name,
      price: Number((line.priceMinor / 10 ** minorUnit).toFixed(minorUnit)),
      quantity: line.quantity,
    })),
  };
}

export interface AnalyticsItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity?: number;
  index?: number;
}

/** Store API prices are integer minor units; GA4 wants a major-unit number. */
function toMajorUnits(minor: string | number, minorUnit: number): number {
  const value = typeof minor === "string" ? Number(minor) : minor;
  if (!Number.isFinite(value)) return 0;
  return Number((value / 10 ** minorUnit).toFixed(minorUnit));
}

export function toAnalyticsItem(
  product: WooProduct,
  extras: { quantity?: number; index?: number; variant?: string } = {},
): AnalyticsItem {
  return {
    item_id: product.sku || String(product.id),
    item_name: product.name,
    item_brand: product.extensions?.spiritual_gifts?.badge || undefined,
    item_category: product.categories[0]?.name,
    item_variant: extras.variant,
    price: toMajorUnits(
      product.prices.price,
      product.prices.currency_minor_unit,
    ),
    quantity: extras.quantity,
    index: extras.index,
  };
}

/*
 * Which transport to use is decided at build time from the env vars rather
 * than by sniffing globals. GTM defines window.gtag as well, so sniffing would
 * make the two paths ambiguous and risk double-counting.
 */
const USE_GTM = Boolean(process.env.NEXT_PUBLIC_GTM_ID);

function send(event: string, params: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  if (USE_GTM) {
    window.dataLayer = window.dataLayer ?? [];

    /*
     * Clear before pushing. GTM's dataLayer merges rather than replaces, so
     * without this the items from a previous event survive into the next one
     * and a view_item arrives carrying the last add_to_cart's basket. It is
     * the standard GA4-via-GTM ecommerce gotcha.
     */
    window.dataLayer.push({ ecommerce: null });
    window.dataLayer.push({ event, ecommerce: params });
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

function currencyOf(product: WooProduct): string {
  return product.prices.currency_code || "USD";
}

export function trackViewItem(product: WooProduct): void {
  send("view_item", {
    currency: currencyOf(product),
    value: toMajorUnits(product.prices.price, product.prices.currency_minor_unit),
    items: [toAnalyticsItem(product)],
  });
}

export function trackViewItemList(
  products: WooProduct[],
  listName: string,
): void {
  if (!products.length) return;

  send("view_item_list", {
    item_list_name: listName,
    items: products.map((product, index) =>
      toAnalyticsItem(product, { index }),
    ),
  });
}

/**
 * The demand signal. Fired when a shopper asks for an item we cannot yet
 * fulfil, so it doubles as the ranking input for the first bulk order.
 */
export function trackAddToCart(
  product: WooProduct,
  options: { quantity?: number; variant?: string; fulfillable: boolean },
): void {
  const { quantity = 1, variant, fulfillable } = options;

  send("add_to_cart", {
    currency: currencyOf(product),
    value:
      toMajorUnits(product.prices.price, product.prices.currency_minor_unit) *
      quantity,
    // Custom dimension: lets you segment genuine sales from demand-test
    // intent once some products become stocked.
    fulfillable,
    items: [toAnalyticsItem(product, { quantity, variant })],
  });
}

/**
 * Client-side route change. GTM's Page View trigger only sees document loads,
 * so without this every navigation after the first goes unreported.
 *
 * Sent as a plain dataLayer event rather than through the ecommerce wrapper,
 * since it carries no items.
 */
export function trackPageView(path: string): void {
  if (typeof window === "undefined") return;

  const location = `${window.location.origin}${path}`;

  if (USE_GTM) {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({
      event: "page_view",
      page_path: path,
      page_location: location,
      page_title: document.title,
    });
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: location,
      page_title: document.title,
    });
  }
}

/** Fired when a product is clicked out of a grid, pairing with view_item_list. */
export function trackSelectItem(
  product: WooProduct,
  listName: string,
  index: number,
): void {
  send("select_item", {
    item_list_name: listName,
    items: [toAnalyticsItem(product, { index })],
  });
}

/** Fired when the cart is opened, either the drawer or the full page. */
export function trackViewCart(lines: CartLineForAnalytics[]): void {
  if (!lines.length) return;
  send("view_cart", cartPayload(lines));
}

/** Fired when a line is removed, so drop-off inside the cart is visible. */
export function trackRemoveFromCart(line: CartLineForAnalytics): void {
  send("remove_from_cart", cartPayload([line]));
}

/**
 * Fired on the confirmation page. WooCommerce owns checkout, so this is the
 * storefront's only view of completed revenue — and the number every ad
 * platform ultimately optimises against.
 */
export function trackPurchase(order: {
  number: string;
  total: string;
  currency: string;
  items: { name: string; quantity: number; total: string }[];
}): void {
  send("purchase", {
    transaction_id: order.number,
    currency: order.currency || "USD",
    value: Number(order.total) || 0,
    items: order.items.map((item) => ({
      item_name: item.name,
      quantity: item.quantity,
      // The order endpoint returns major units already, unlike the Store API.
      price: Number(item.total) / Math.max(1, item.quantity),
    })),
  });
}

/**
 * Fired when a shopper commits to checkout. This is the deepest signal the
 * storefront can see — WooCommerce owns everything past this point — so it is
 * the bottom of the funnel for anything measured here.
 */
export function trackBeginCheckout(lines: CartLineForAnalytics[]): void {
  if (!lines.length) return;
  send("begin_checkout", cartPayload(lines));
}

/** Fired when a shopper leaves an email against an out-of-stock item. */
export function trackWaitlistSignup(
  product: WooProduct,
  variant?: string,
): void {
  send("join_waitlist", {
    currency: currencyOf(product),
    value: toMajorUnits(product.prices.price, product.prices.currency_minor_unit),
    items: [toAnalyticsItem(product, { quantity: 1, variant })],
  });
}
