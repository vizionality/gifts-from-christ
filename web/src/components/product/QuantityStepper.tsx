"use client";

import { cn } from "@/lib/cn";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = "Quantity",
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number | null;
  label?: string;
  size?: "sm" | "md";
}) {
  const ceiling = max ?? Number.MAX_SAFE_INTEGER;
  const dimensions = size === "sm" ? "h-8 w-8 text-sm" : "h-11 w-11";

  return (
    <div
      className="inline-flex items-center rounded-full border border-line-strong"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        className={cn(
          dimensions,
          "flex items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-ink-muted",
        )}
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <span aria-hidden>−</span>
      </button>

      <input
        type="number"
        className={cn(
          size === "sm" ? "w-8 text-sm" : "w-10",
          "appearance-none border-0 bg-transparent p-0 text-center tabular-nums text-ink outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
        value={value}
        min={min}
        max={max ?? undefined}
        aria-label={label}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) {
            onChange(Math.max(min, Math.min(next, ceiling)));
          }
        }}
      />

      <button
        type="button"
        className={cn(
          dimensions,
          "flex items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink disabled:opacity-30 disabled:hover:text-ink-muted",
        )}
        onClick={() => onChange(value + 1)}
        disabled={value >= ceiling}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <span aria-hidden>+</span>
      </button>
    </div>
  );
}
