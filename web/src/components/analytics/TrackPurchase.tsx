"use client";

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/analytics";
import type { OrderSummary } from "@/lib/woo/order";

const SEEN_KEY = "sg.purchase.sent";

/**
 * Fires `purchase` once per order.
 *
 * The confirmation URL is shareable and re-loadable, so the order number is
 * recorded in sessionStorage first — a refresh would otherwise report the same
 * revenue again and quietly inflate every ad platform's ROAS.
 */
export function TrackPurchase({ order }: { order: OrderSummary }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    try {
      const seen = window.sessionStorage.getItem(SEEN_KEY);
      if (seen === order.number) return;
      window.sessionStorage.setItem(SEEN_KEY, order.number);
    } catch {
      // Storage unavailable — better to risk a duplicate than lose the event.
    }

    trackPurchase(order);
  }, [order]);

  return null;
}
