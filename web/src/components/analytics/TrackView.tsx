"use client";

import { useEffect, useRef } from "react";
import {
  trackViewItem,
  trackViewItemList,
} from "@/lib/analytics";
import type { WooProduct } from "@/lib/woo/types";

/**
 * Fires `view_item` once per product view. Rendered by the server component
 * so the event carries the same data the page was built from.
 */
export function TrackViewItem({ product }: { product: WooProduct }) {
  const sent = useRef<number | null>(null);

  useEffect(() => {
    // React 18+ mounts effects twice in dev; guard so the count is honest.
    if (sent.current === product.id) return;
    sent.current = product.id;
    trackViewItem(product);
  }, [product]);

  return null;
}

/** Fires `view_item_list` for a rendered grid, so impressions are comparable. */
export function TrackViewItemList({
  products,
  listName,
}: {
  products: WooProduct[];
  listName: string;
}) {
  const sent = useRef<string | null>(null);

  useEffect(() => {
    const key = `${listName}:${products.map((p) => p.id).join(",")}`;
    if (sent.current === key) return;
    sent.current = key;
    trackViewItemList(products, listName);
  }, [products, listName]);

  return null;
}
