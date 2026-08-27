"use client";

import Image from "next/image";
import Link from "next/link";
import { QuantityStepper } from "@/components/product/QuantityStepper";
import { trackRemoveFromCart } from "@/lib/analytics";
import { useCart } from "@/lib/cart/store";
import { formatMoney } from "@/lib/format";
import type { CartLine } from "@/lib/cart/types";
import { lineKey } from "@/lib/cart/types";

export function CartLineItem({
  line,
  compact = false,
}: {
  line: CartLine;
  compact?: boolean;
}) {
  const cart = useCart();
  const key = lineKey(line);
  const onSale = line.regularPriceMinor > line.priceMinor;

  return (
    <li className="flex gap-4 py-5">
      <Link
        href={`/products/${line.slug}`}
        onClick={cart.close}
        className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-surface-sunk"
      >
        {line.image ? (
          <Image
            src={line.image}
            alt={line.imageAlt}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/products/${line.slug}`}
              onClick={cart.close}
              className="line-clamp-2 text-sm leading-snug text-ink hover:text-accent"
            >
              {line.name}
            </Link>

            {Object.entries(line.variation).length ? (
              <p className="mt-1 text-xs text-ink-subtle">
                {Object.entries(line.variation)
                  .map(([, value]) => value)
                  .join(" · ")}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 text-right text-sm tabular-nums">
            <div className={onSale ? "text-danger" : "text-ink"}>
              {formatMoney(line.priceMinor * line.quantity, line.currency)}
            </div>
            {onSale ? (
              <s className="text-xs text-ink-subtle">
                {formatMoney(
                  line.regularPriceMinor * line.quantity,
                  line.currency,
                )}
              </s>
            ) : null}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <QuantityStepper
            size={compact ? "sm" : "md"}
            value={line.quantity}
            max={line.maxQuantity}
            label={`Quantity for ${line.name}`}
            onChange={(next) => cart.setQuantity(key, next)}
          />

          <button
            type="button"
            onClick={() => {
              // Report before removing; afterwards the line is gone.
              trackRemoveFromCart(line);
              cart.remove(key);
            }}
            className="text-xs text-ink-subtle underline underline-offset-2 transition-colors hover:text-danger"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
