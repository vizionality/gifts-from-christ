"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { CartLineItem } from "@/components/cart/CartLineItem";
import { CartNotices } from "@/components/cart/CartNotices";
import { CheckoutButton } from "@/components/cart/CheckoutButton";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { trackViewCart } from "@/lib/analytics";
import { useCart } from "@/lib/cart/store";
import { lineKey } from "@/lib/cart/types";
import { formatMoney } from "@/lib/format";

/** Error codes the WordPress handoff can bounce back with. */
const HANDOFF_ERRORS: Record<string, string> = {
  bad_signature:
    "That checkout link could not be verified. Please try checking out again.",
  expired: "That checkout link expired. Please try again.",
  nothing_added:
    "None of your items could be added to the WooCommerce cart. They may have sold out.",
  malformed_payload: "Something went wrong preparing your cart.",
  missing_payload: "Something went wrong preparing your cart.",
  woocommerce_unavailable: "The store is temporarily unavailable.",
};

export function CartView() {
  const cart = useCart();
  const searchParams = useSearchParams();
  const handoffError = searchParams.get("cart_error");
  const reported = useRef(false);

  // Once per visit to the page, and only after the cart has hydrated —
  // firing before that would report an empty cart every time.
  useEffect(() => {
    if (reported.current || !cart.hydrated || !cart.lines.length) return;
    reported.current = true;
    trackViewCart(cart.lines);
  }, [cart.hydrated, cart.lines]);

  if (!cart.hydrated) {
    return (
      <div className="mt-10 space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!cart.lines.length) {
    return (
      <div className="mt-10">
        <EmptyState
          title="Your cart is empty"
          description="Nothing here yet. The collection is a good place to start."
          action={<ButtonLink href="/products">Browse the collection</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
      <div>
        {handoffError ? (
          <div
            role="alert"
            className="mb-6 rounded-card border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {HANDOFF_ERRORS[handoffError] ??
              "Checkout could not be started. Please try again."}
          </div>
        ) : null}

        {cart.notices.length ? (
          <div className="mb-6">
            <CartNotices />
          </div>
        ) : null}

        <ul className="divide-y divide-line border-y border-line" role="list">
          {cart.lines.map((line) => (
            <CartLineItem key={lineKey(line)} line={line} />
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between">
          <ButtonLink href="/products" variant="ghost" size="sm">
            &larr; Continue shopping
          </ButtonLink>
          <button
            type="button"
            onClick={cart.clear}
            className="text-sm text-ink-subtle underline underline-offset-2 hover:text-danger"
          >
            Empty cart
          </button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:h-fit">
        <div className="rounded-card border border-line bg-surface p-6">
          <h2 className="text-lg text-ink">Order summary</h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">
                Subtotal ({cart.count} {cart.count === 1 ? "item" : "items"})
              </dt>
              <dd className="tabular-nums text-ink">
                {cart.currency
                  ? formatMoney(cart.subtotalMinor, cart.currency)
                  : "—"}
              </dd>
            </div>

            {cart.savingsMinor > 0 && cart.currency ? (
              <div className="flex justify-between">
                <dt className="text-ink-muted">Savings</dt>
                <dd className="tabular-nums text-danger">
                  −{formatMoney(cart.savingsMinor, cart.currency)}
                </dd>
              </div>
            ) : null}

            <div className="flex justify-between">
              <dt className="text-ink-muted">Shipping</dt>
              <dd className="text-ink-subtle">Calculated at checkout</dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-ink-muted">Tax</dt>
              <dd className="text-ink-subtle">Calculated at checkout</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
            <span className="text-ink">Estimated total</span>
            <span className="text-xl tabular-nums text-ink">
              {cart.currency
                ? formatMoney(cart.subtotalMinor, cart.currency)
                : "—"}
            </span>
          </div>

          <CheckoutButton className="mt-6" />
        </div>

        {cart.validating ? (
          <p className="mt-3 text-center text-xs text-ink-subtle">
            Checking prices and stock…
          </p>
        ) : null}
      </aside>
    </div>
  );
}
