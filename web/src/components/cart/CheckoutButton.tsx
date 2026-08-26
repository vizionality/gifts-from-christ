"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cart/store";

/**
 * Signs the browser cart server-side and sends the shopper to WooCommerce
 * checkout, where Woo recomputes totals, tax and shipping authoritatively.
 */
export function CheckoutButton({
  className,
  size = "lg",
}: {
  className?: string;
  size?: "md" | "lg";
}) {
  const cart = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.lines.map((line) => ({
            id: line.productId,
            qty: line.quantity,
            variation_id: line.variationId,
            variation: line.variation,
          })),
        }),
      });

      const body = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !body.url) {
        setError(body.error ?? "Could not start checkout. Please try again.");
        setPending(false);
        return;
      }

      // Full navigation: we are handing the session over to WordPress.
      window.location.href = body.url;
    } catch {
      setError("Could not reach the store. Check your connection.");
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <Button
        size={size}
        onClick={handleCheckout}
        disabled={pending || cart.lines.length === 0}
        className="w-full"
      >
        {pending ? "Taking you to checkout…" : "Checkout"}
      </Button>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <p className="mt-2 text-center text-xs text-ink-subtle">
        Shipping and tax calculated at checkout.
      </p>
    </div>
  );
}
