"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CartNotices } from "@/components/cart/CartNotices";
import { CheckoutButton } from "@/components/cart/CheckoutButton";
import { ButtonLink } from "@/components/ui/Button";
import { trackViewCart } from "@/lib/analytics";
import { useCart } from "@/lib/cart/store";
import { formatMoney } from "@/lib/format";
import { lineKey } from "@/lib/cart/types";

export function CartDrawer() {
  const cart = useCart();
  const panelRef = useRef<HTMLDivElement>(null);

  // Report the cart contents each time the drawer opens.
  useEffect(() => {
    if (!cart.isOpen || !cart.lines.length) return;
    trackViewCart(cart.lines);
  }, [cart.isOpen, cart.lines]);

  // Close on Escape and trap the page scroll while open.
  useEffect(() => {
    if (!cart.isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cart.close();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [cart.isOpen, cart]);

  if (!cart.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close cart"
        onClick={cart.close}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        tabIndex={-1}
        className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-overlay outline-none"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg text-ink">
            Cart{" "}
            <span className="text-sm text-ink-subtle">
              ({cart.count} {cart.count === 1 ? "item" : "items"})
            </span>
          </h2>
          <button
            type="button"
            onClick={cart.close}
            aria-label="Close cart"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunk hover:text-ink"
          >
            <span aria-hidden className="text-lg leading-none">
              ×
            </span>
          </button>
        </header>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-ink-muted">Your cart is empty.</p>
            <ButtonLink href="/products" variant="secondary" onClick={cart.close}>
              Browse the collection
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              {cart.notices.length ? (
                <div className="pt-4">
                  <CartNotices />
                </div>
              ) : null}

              <ul className="divide-y divide-line" role="list">
                {cart.lines.map((line) => (
                  <CartLineItem key={lineKey(line)} line={line} compact />
                ))}
              </ul>
            </div>

            <footer className="border-t border-line px-5 py-5">
              <div className="flex items-baseline justify-between text-ink">
                <span className="text-sm text-ink-muted">Subtotal</span>
                <span className="text-lg tabular-nums">
                  {cart.currency
                    ? formatMoney(cart.subtotalMinor, cart.currency)
                    : "—"}
                </span>
              </div>

              {cart.savingsMinor > 0 && cart.currency ? (
                <p className="mt-1 text-right text-sm text-danger">
                  You save {formatMoney(cart.savingsMinor, cart.currency)}
                </p>
              ) : null}

              <CheckoutButton className="mt-4" />

              <Link
                href="/cart"
                onClick={cart.close}
                className="mt-3 block text-center text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                View full cart
              </Link>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
