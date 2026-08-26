"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import type { WooTerm } from "@/lib/woo/types";

const SORT_OPTIONS = [
  { value: "date", label: "Newest" },
  { value: "popularity", label: "Most popular" },
  { value: "rating", label: "Best rated" },
  { value: "price", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title", label: "A-Z" },
] as const;

export function ProductFilters({
  categories,
  total,
}: {
  categories: WooTerm[];
  total: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeCategory = searchParams.get("category") ?? "";
  const activeSort = searchParams.get("sort") ?? "date";
  const urlSearch = searchParams.get("search") ?? "";

  const [search, setSearch] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);

  // Re-sync the input when the URL changes from elsewhere (back button, a
  // header link). Adjusting state during render beats an effect here: React
  // re-renders immediately without painting the stale value first.
  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch);
    setSearch(urlSearch);
  }

  function apply(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }

    // Any filter change invalidates the current page number.
    params.delete("page");

    const query = params.toString();

    startTransition(() => {
      router.push(query ? `/products?${query}` : "/products", { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "space-y-5 transition-opacity",
        pending && "pointer-events-none opacity-60",
      )}
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          apply({ search: search.trim() || null });
        }}
        className="relative"
      >
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the collection"
          className="h-11 w-full rounded-full border border-line-strong bg-surface pl-11 pr-4 text-sm text-ink placeholder:text-ink-subtle focus:border-accent"
        />
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" strokeLinecap="round" />
        </svg>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap gap-2" role="list">
          <li>
            <FilterChip
              active={!activeCategory}
              onClick={() => apply({ category: null })}
            >
              All
            </FilterChip>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <FilterChip
                active={activeCategory === category.slug}
                onClick={() => apply({ category: category.slug })}
              >
                {category.name}
              </FilterChip>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <span aria-live="polite" className="text-sm text-ink-subtle">
            {total} {total === 1 ? "product" : "products"}
          </span>

          <label htmlFor="product-sort" className="sr-only">
            Sort products
          </label>
          <select
            id="product-sort"
            value={activeSort}
            onChange={(event) => apply({ sort: event.target.value })}
            className="h-9 rounded-full border border-line-strong bg-surface px-3 text-sm text-ink"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition-colors",
        active
          ? "border-ink bg-ink text-paper"
          : "border-line-strong text-ink-muted hover:border-ink-subtle hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
