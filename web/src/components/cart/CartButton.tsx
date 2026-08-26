"use client";

import { useCart } from "@/lib/cart/store";

export function CartButton() {
  const cart = useCart();

  return (
    <button
      type="button"
      onClick={cart.open}
      className="relative flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink transition-colors hover:bg-surface-sunk"
      aria-label={`Open cart, ${cart.count} ${cart.count === 1 ? "item" : "items"}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-5 w-5"
      >
        <path
          d="M6 7h12l-1 12H7L6 7Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 7V5.5a2.5 2.5 0 0 1 5 0V7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="tabular-nums">
        {/* Rendered only after hydration so SSR markup matches. */}
        {cart.hydrated ? cart.count : 0}
      </span>
    </button>
  );
}
