"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/product/QuantityStepper";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";
import { acf, type WooProduct } from "@/lib/woo/types";

/**
 * Attribute selection + add to cart. Handles both simple products and
 * variable ones, resolving the chosen attribute combination to the variation
 * id WooCommerce needs at checkout.
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

  const allChosen = variationAttributes.every(
    (attribute) => selection[attribute.name],
  );

  /** Find the variation whose attributes match every current selection. */
  const variationId = useMemo(() => {
    if (!variationAttributes.length || !allChosen) return 0;

    const match = product.variations.find((variation) =>
      variation.attributes.every(
        (attribute) =>
          // An empty value on a variation means "any", so it always matches.
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

  const blocked =
    !product.is_purchasable ||
    !product.is_in_stock ||
    (variationAttributes.length > 0 && !allChosen);

  function handleAdd() {
    if (blocked) return;

    // Woo expects taxonomy-prefixed keys, e.g. attribute_pa_size.
    const variation: Record<string, string> = {};
    for (const attribute of variationAttributes) {
      const chosen = selection[attribute.name];
      if (chosen) variation[attribute.taxonomy ?? attribute.name] = chosen;
    }

    cart.add({ product, quantity, variationId, variation });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
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
          disabled={blocked}
          className="flex-1 min-w-[12rem]"
        >
          {!product.is_in_stock
            ? "Sold out"
            : variationAttributes.length > 0 && !allChosen
              ? "Select options"
              : justAdded
                ? "Added ✓"
                : "Add to cart"}
        </Button>
      </div>

      {product.low_stock_remaining && product.is_in_stock ? (
        <p className="text-sm text-danger">
          Only {product.low_stock_remaining} left in stock.
        </p>
      ) : null}

      {fields.shipping_note ? (
        <p className="text-sm text-ink-muted">{fields.shipping_note}</p>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {justAdded ? `${product.name} added to your cart.` : ""}
      </p>
    </div>
  );
}
