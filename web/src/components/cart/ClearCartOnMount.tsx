"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/lib/cart/store";

/**
 * The order is already placed in WooCommerce by the time this renders, so the
 * browser-held cart is stale and must be dropped.
 *
 * Waits for `hydrated`: React runs child effects before parent ones, so
 * clearing on mount would be undone a moment later when the provider's own
 * effect reads the cart back out of localStorage.
 */
export function ClearCartOnMount() {
  const cart = useCart();
  const cleared = useRef(false);

  useEffect(() => {
    if (!cart.hydrated || cleared.current) return;

    cleared.current = true;
    cart.clear();
  }, [cart]);

  return null;
}
