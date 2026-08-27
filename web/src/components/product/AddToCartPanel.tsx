"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/product/QuantityStepper";
import { trackAddToCart, trackWaitlistSignup } from "@/lib/analytics";
import { variationAttributeKey } from "@/lib/woo/attributes";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { acf, type WooProduct } from "@/lib/woo/types";

/**
 * Attribute selection, then either a real add to cart or a waitlist signup.
 *
 * Unstocked lines are a deliberate demand test: the product is listed, the
 * shopper is told plainly that it is not available yet, and the intent is
 * recorded. What we learn is which items justify a first bulk order.
 */
export function AddToCartPanel({ product }: { product: WooProduct }) {
  const cart = useCart();
  const fields = acf(product);

  const variationAttributes = useMemo(
    () => product.attributes.filter((attribute) => attribute.has_variations),
    [product.attributes],
  );

  const [selection, setSelection] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(product.add_to_cart.minimum || 1);
  const [justAdded, setJustAdded] = useState(false);

  // Waitlist state, used only when the product cannot be fulfilled.
  const [interested, setInterested] = useState(false);
  const [email, setEmail] = useState("");
  const [waitlistState, setWaitlistState] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");

  const allChosen = variationAttributes.every(
    (attribute) => selection[attribute.name],
  );

  const variationId = useMemo(() => {
    if (!variationAttributes.length || !allChosen) return 0;

    const match = product.variations.find((variation) =>
      variation.attributes.every(
        (attribute) =>
          !attribute.value ||
          selection[attribute.name]?.toLowerCase() ===
            attribute.value.toLowerCase(),
      ),
    );

    return match?.id ?? 0;
  }, [product.variations, selection, variationAttributes.length, allChosen]);

  const maxQuantity = product.sold_individually
    ? 1
    : product.add_to_cart.maximum > 0
      ? product.add_to_cart.maximum
      : product.low_stock_remaining;

  const fulfillable = product.is_purchasable && product.is_in_stock;
  const needsOptions = variationAttributes.length > 0 && !allChosen;

  /** Human-readable variant label for analytics, e.g. "Large / Navy". */
  const variantLabel = useMemo(() => {
    const parts = variationAttributes
      .map((attribute) => {
        const slug = selection[attribute.name];
        return attribute.terms.find((term) => term.slug === slug)?.name;
      })
      .filter(Boolean);

    return parts.length ? parts.join(" / ") : undefined;
  }, [variationAttributes, selection]);

  /**
   * Woo keys variation attributes by taxonomy when there is one, and by the
   * sanitised attribute name when there is not. See variationAttributeKey.
   */
  function variationPayload(): Record<string, string> {
    const variation: Record<string, string> = {};
    for (const attribute of variationAttributes) {
      const chosen = selection[attribute.name];
      if (chosen) variation[variationAttributeKey(attribute)] = chosen;
    }
    return variation;
  }

  function handleAdd() {
    if (needsOptions || !fulfillable) return;

    cart.add({
      product,
      quantity,
      variationId,
      variation: variationPayload(),
    });

    trackAddToCart(product, {
      quantity,
      variant: variantLabel,
      fulfillable: true,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  }

  /**
   * The demand signal. Recorded as `add_to_cart` so GA4's Item report ranks
   * these alongside real sales, with a `fulfillable: false` flag to tell the
   * two apart later.
   */
  function handleInterest() {
    if (needsOptions) return;

    trackAddToCart(product, {
      quantity,
      variant: variantLabel,
      fulfillable: false,
    });

    setInterested(true);
  }

  async function handleWaitlist(event: React.FormEvent) {
    event.preventDefault();
    setWaitlistState("saving");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          variant: variantLabel ?? null,
          quantity,
        }),
      });

      if (!response.ok) throw new Error("waitlist failed");

      trackWaitlistSignup(product, variantLabel);
      setWaitlistState("done");
    } catch {
      setWaitlistState("error");
    }
  }

  return (
    <div className="space-y-6">
      {variationAttributes.map((attribute) => (
        <fieldset key={attribute.id || attribute.name}>
          <legend className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-subtle">
            {attribute.name}
            {selection[attribute.name] ? (
              <span className="ml-2 normal-case tracking-normal text-ink">
                {
                  attribute.terms.find(
                    (term) => term.slug === selection[attribute.name],
                  )?.name
                }
              </span>
            ) : null}
          </legend>

          <div className="flex flex-wrap gap-2">
            {attribute.terms.map((term) => {
              const selected = selection[attribute.name] === term.slug;
              return (
                <button
                  key={term.id || term.slug}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setSelection((current) => ({
                      ...current,
                      [attribute.name]: term.slug,
                    }))
                  }
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    selected
                      ? "border-accent bg-accent text-accent-ink"
                      : "border-line-strong text-ink-muted hover:border-ink-subtle hover:text-ink",
                  )}
                >
                  {term.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {fulfillable ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={product.add_to_cart.minimum || 1}
              max={maxQuantity}
            />

            <Button
              size="lg"
              onClick={handleAdd}
              disabled={needsOptions}
              className="min-w-[12rem] flex-1"
            >
              {needsOptions
                ? "Select options"
                : justAdded
                  ? "Added ✓"
                  : "Add to cart"}
            </Button>
          </div>

          {product.low_stock_remaining ? (
            <p className="text-sm text-danger">
              Only {product.low_stock_remaining} left in stock.
            </p>
          ) : null}
        </>
      ) : (
        <UnstockedPanel
          needsOptions={needsOptions}
          interested={interested}
          onInterest={handleInterest}
          email={email}
          setEmail={setEmail}
          state={waitlistState}
          onSubmit={handleWaitlist}
        />
      )}

      {fields.shipping_note && fulfillable ? (
        <p className="text-sm text-ink-muted">{fields.shipping_note}</p>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {justAdded ? `${product.name} added to your cart.` : ""}
        {waitlistState === "done"
          ? `You are on the waitlist for ${product.name}.`
          : ""}
      </p>
    </div>
  );
}

/**
 * Shown in place of add-to-cart when we cannot fulfil the item. States the
 * situation plainly rather than letting the shopper discover it at checkout.
 */
function UnstockedPanel({
  needsOptions,
  interested,
  onInterest,
  email,
  setEmail,
  state,
  onSubmit,
}: {
  needsOptions: boolean;
  interested: boolean;
  onInterest: () => void;
  email: string;
  setEmail: (value: string) => void;
  state: "idle" | "saving" | "done" | "error";
  onSubmit: (event: React.FormEvent) => void;
}) {
  if (state === "done") {
    return (
      <div className="rounded-card border border-line bg-surface-sunk px-5 py-4">
        <p className="text-sm text-ink">You&rsquo;re on the list.</p>
        <p className="mt-1 text-sm text-ink-muted">
          We&rsquo;ll email you the moment this arrives. No other mail, ever.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-ink-subtle"
        />
        Not in stock yet
      </div>

      {!interested ? (
        <Button
          size="lg"
          variant="secondary"
          onClick={onInterest}
          disabled={needsOptions}
          className="w-full"
        >
          {needsOptions ? "Select options" : "Notify me when available"}
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <label htmlFor="waitlist-email" className="sr-only">
            Email address
          </label>
          <div className="flex gap-2">
            <input
              id="waitlist-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 flex-1 rounded-full border border-line-strong bg-surface px-5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent"
            />
            <Button size="lg" type="submit" disabled={state === "saving"}>
              {state === "saving" ? "Saving…" : "Notify me"}
            </Button>
          </div>

          {state === "error" ? (
            <p role="alert" className="text-sm text-danger">
              That didn&rsquo;t save. Please try again.
            </p>
          ) : (
            <p className="text-xs text-ink-subtle">
              One email when it lands. We won&rsquo;t use it for anything else.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
