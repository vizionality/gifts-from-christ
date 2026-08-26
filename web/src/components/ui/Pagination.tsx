import Link from "next/link";
import { cn } from "@/lib/cn";

/** Server-rendered pagination: real links, so it works without JavaScript. */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // Show a window around the current page rather than every page number.
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const visible = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="mt-14 flex justify-center">
      <ul className="flex items-center gap-1.5" role="list">
        <li>
          <PageLink
            href={buildHref(page - 1)}
            disabled={page <= 1}
            label="Previous page"
          >
            &larr;
          </PageLink>
        </li>

        {visible.map((value, index) => (
          <li key={value} className="flex items-center gap-1.5">
            {index > 0 && value - visible[index - 1] > 1 ? (
              <span className="px-1 text-ink-subtle" aria-hidden>
                &hellip;
              </span>
            ) : null}
            <PageLink
              href={buildHref(value)}
              current={value === page}
              label={`Page ${value}`}
            >
              {value}
            </PageLink>
          </li>
        ))}

        <li>
          <PageLink
            href={buildHref(page + 1)}
            disabled={page >= totalPages}
            label="Next page"
          >
            &rarr;
          </PageLink>
        </li>
      </ul>
    </nav>
  );
}

function PageLink({
  href,
  children,
  current = false,
  disabled = false,
  label,
}: {
  href: string;
  children: React.ReactNode;
  current?: boolean;
  disabled?: boolean;
  label: string;
}) {
  const className = cn(
    // Every state carries a border so the current page does not shift the row
    // by two pixels when it gains one.
    "flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm transition-colors",
    current
      ? "border-ink bg-surface font-medium text-ink shadow-card"
      : "border-transparent text-ink-muted hover:bg-surface-sunk hover:text-ink",
    disabled && "pointer-events-none opacity-30",
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      aria-label={label}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
