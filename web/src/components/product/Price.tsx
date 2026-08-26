import { cn } from "@/lib/cn";
import { discountPercent, formatMoney } from "@/lib/format";
import type { WooPrices } from "@/lib/woo/types";

/**
 * Renders the current price, and the struck-through original when on sale.
 * Screen readers get "was / now" rather than two bare numbers.
 */
export function Price({
  prices,
  size = "md",
  className,
}: {
  prices: WooPrices;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const onSale = Number(prices.price) < Number(prices.regular_price);
  const percent = discountPercent(prices);

  const scale = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  }[size];

  if (prices.price_range) {
    return (
      <span className={cn(scale, "text-ink", className)}>
        {formatMoney(prices.price_range.min_amount, prices)}
        <span className="text-ink-subtle"> – </span>
        {formatMoney(prices.price_range.max_amount, prices)}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-baseline gap-2", scale, className)}>
      {onSale ? (
        <>
          <span className="sr-only">Sale price</span>
          <span className="font-medium text-danger">
            {formatMoney(prices.price, prices)}
          </span>
          <span className="sr-only">Regular price</span>
          <s className="text-[0.85em] text-ink-subtle">
            {formatMoney(prices.regular_price, prices)}
          </s>
          {percent ? (
            <span className="text-[0.75em] font-medium text-danger">
              −{percent}%
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-ink">{formatMoney(prices.price, prices)}</span>
      )}
    </span>
  );
}
