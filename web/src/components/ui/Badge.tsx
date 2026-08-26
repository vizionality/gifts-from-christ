import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "accent" | "sale" | "muted" | "outline";

const tones: Record<Tone, string> = {
  accent: "bg-accent text-accent-ink",
  sale: "bg-danger text-white",
  muted: "bg-surface-sunk text-ink-muted",
  outline: "border border-line-strong text-ink-muted",
};

export function Badge({
  children,
  tone = "accent",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
