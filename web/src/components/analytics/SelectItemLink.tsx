"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackSelectItem } from "@/lib/analytics";
import type { WooProduct } from "@/lib/woo/types";

/**
 * The product link in a grid, reporting `select_item` on click so the
 * click-through from a list is measurable against `view_item_list`.
 *
 * A client component purely for the handler — the card around it stays a
 * server component and none of its markup moves to the browser bundle.
 */
export function SelectItemLink({
  product,
  listName,
  index,
  className,
  children,
}: {
  product: WooProduct;
  listName: string;
  index: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={className}
      onClick={() => trackSelectItem(product, listName, index)}
    >
      {children}
    </Link>
  );
}
