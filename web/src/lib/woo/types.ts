/**
 * Types for the subset of the WooCommerce Store API this storefront consumes.
 * Reference: /wp-json/wc/store/v1 — prices are strings in *minor units*.
 */

export interface WooPrices {
  price: string;
  regular_price: string;
  sale_price: string;
  price_range: { min_amount: string; max_amount: string } | null;
  currency_code: string;
  currency_symbol: string;
  currency_minor_unit: number;
  currency_decimal_separator: string;
  currency_thousand_separator: string;
  currency_prefix: string;
  currency_suffix: string;
}

export interface WooImage {
  id: number;
  src: string;
  thumbnail: string;
  srcset: string;
  sizes: string;
  name: string;
  alt: string;
}

export interface WooTerm {
  id: number;
  name: string;
  slug: string;
  link?: string;
  count?: number;
}

export interface WooAttribute {
  id: number;
  name: string;
  taxonomy: string | null;
  has_variations: boolean;
  terms: WooTerm[];
}

/** Injected by the `30-acf-store-api.php` mu-plugin. */
export interface AcfProductFields {
  badge: string;
  tagline: string;
  highlights: string[];
  materials: string;
  dimensions: string;
  care: string;
  scripture: string;
  shipping_note: string;
  featured: boolean;
  lifestyle_image: {
    url: string;
    alt: string;
    width: number | null;
    height: number | null;
  } | null;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  parent: number;
  type: string;
  permalink: string;
  description: string;
  short_description: string;
  on_sale: boolean;
  sku: string;
  prices: WooPrices;
  price_html: string;
  average_rating: string;
  review_count: number;
  images: WooImage[];
  categories: WooTerm[];
  tags: WooTerm[];
  attributes: WooAttribute[];
  variations: { id: number; attributes: { name: string; value: string }[] }[];
  has_options: boolean;
  is_purchasable: boolean;
  is_in_stock: boolean;
  is_on_backorder: boolean;
  low_stock_remaining: number | null;
  sold_individually: boolean;
  add_to_cart: {
    text: string;
    description: string;
    url: string;
    minimum: number;
    maximum: number;
    multiple_of: number;
  };
  extensions?: {
    spiritual_gifts?: AcfProductFields;
  };
}

/** Payload of GET /wp-json/headless/v1/shop-config */
export interface ShopConfig {
  hero: {
    eyebrow?: string;
    heading?: string;
    body?: string;
    cta_label?: string;
    cta_url?: string;
    promo?: string;
    image?: { url: string; alt: string } | null;
  };
  categories: WooTerm[];
  currency: { code: string; symbol: string };
  site: { name: string; description: string };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  totalPages: number;
}

/** ACF fields with safe defaults, so components never null-check. */
export const EMPTY_ACF: AcfProductFields = {
  badge: "",
  tagline: "",
  highlights: [],
  materials: "",
  dimensions: "",
  care: "",
  scripture: "",
  shipping_note: "",
  featured: false,
  lifestyle_image: null,
};

export function acf(product: WooProduct): AcfProductFields {
  return { ...EMPTY_ACF, ...(product.extensions?.spiritual_gifts ?? {}) };
}
