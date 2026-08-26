"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CartButton } from "@/components/cart/CartButton";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import type { WooTerm } from "@/lib/woo/types";

export function Header({
  siteName,
  categories,
}: {
  siteName: string;
  categories: WooTerm[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/products", label: "All products" },
    ...categories.slice(0, 4).map((category) => ({
      href: `/products?category=${category.slug}`,
      label: category.name,
    })),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <Container size="wide">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label="Toggle navigation"
              className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-sunk md:hidden"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-5 w-5"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                )}
              </svg>
            </button>

            <Link
              href="/"
              className="font-display text-lg tracking-tight text-ink"
            >
              {siteName}
            </Link>
          </div>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {links.map((link) => {
                // Query-scoped category links are not marked active: reading
                // the query here would opt the whole layout out of static
                // rendering for a purely cosmetic state.
                const active = !link.href.includes("?") && pathname === link.href;

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-sm transition-colors",
                        active
                          ? "text-ink"
                          : "text-ink-muted hover:bg-surface-sunk hover:text-ink",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <Link
              href="/products"
              aria-label="Search products"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-sunk"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-5 w-5"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" strokeLinecap="round" />
              </svg>
            </Link>

            <CartButton />
          </div>
        </div>
      </Container>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-line bg-paper md:hidden"
        >
          <Container size="wide">
            <ul className="flex flex-col py-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block py-3 text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
