"use client";

import { useCart } from "@/lib/cart/store";

/** Surfaces reconciliation messages, e.g. a price change or a sold-out line. */
export function CartNotices() {
  const cart = useCart();

  if (!cart.notices.length) return null;

  return (
    <div
      role="status"
      className="rounded-card border border-line-strong bg-accent-soft px-4 py-3"
    >
      <ul className="space-y-1 text-sm text-ink">
        {cart.notices.map((notice) => (
          <li key={notice}>{notice}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={cart.dismissNotices}
        className="mt-2 text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        Dismiss
      </button>
    </div>
  );
}
