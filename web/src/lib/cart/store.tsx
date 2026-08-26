"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { CartLine, CartState } from "@/lib/cart/types";
import { lineKey } from "@/lib/cart/types";
import type { WooProduct } from "@/lib/woo/types";

const STORAGE_KEY = "sg.cart.v1";

type Action =
  | { type: "hydrate"; lines: CartLine[] }
  | { type: "add"; line: CartLine }
  | { type: "setQuantity"; key: string; quantity: number }
  | { type: "remove"; key: string }
  | { type: "clear" }
  | { type: "validating"; value: boolean }
  | { type: "reconcile"; lines: CartLine[]; notices: string[] }
  | { type: "dismissNotices" };

const initialState: CartState = {
  lines: [],
  hydrated: false,
  validating: false,
  notices: [],
};

function clampQuantity(line: CartLine, quantity: number): number {
  const ceiling = line.maxQuantity ?? Number.MAX_SAFE_INTEGER;
  return Math.max(1, Math.min(quantity, ceiling));
}

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "hydrate":
      return { ...state, lines: action.lines, hydrated: true };

    case "add": {
      const key = lineKey(action.line);
      const existing = state.lines.find((line) => lineKey(line) === key);

      if (!existing) {
        return { ...state, lines: [...state.lines, action.line] };
      }

      // Adding an item already in the cart increments rather than duplicates.
      return {
        ...state,
        lines: state.lines.map((line) =>
          lineKey(line) === key
            ? {
                ...line,
                quantity: clampQuantity(
                  line,
                  line.quantity + action.line.quantity,
                ),
              }
            : line,
        ),
      };
    }

    case "setQuantity":
      return {
        ...state,
        lines: state.lines.flatMap((line) => {
          if (lineKey(line) !== action.key) return [line];
          if (action.quantity < 1) return [];
          return [{ ...line, quantity: clampQuantity(line, action.quantity) }];
        }),
      };

    case "remove":
      return {
        ...state,
        lines: state.lines.filter((line) => lineKey(line) !== action.key),
      };

    case "clear":
      return { ...state, lines: [], notices: [] };

    case "validating":
      return { ...state, validating: action.value };

    case "reconcile":
      return {
        ...state,
        lines: action.lines,
        notices: action.notices,
        validating: false,
      };

    case "dismissNotices":
      return { ...state, notices: [] };

    default:
      return state;
  }
}

export interface AddToCartInput {
  product: WooProduct;
  quantity?: number;
  variationId?: number;
  variation?: Record<string, string>;
}

interface CartContextValue extends CartState {
  count: number;
  subtotalMinor: number;
  savingsMinor: number;
  currency: CartLine["currency"] | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (input: AddToCartInput) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  dismissNotices: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Build a cart line from a Store API product. */
function toLine(input: AddToCartInput): CartLine {
  const { product, quantity = 1, variationId = 0, variation = {} } = input;
  const image = product.images[0];

  const max = product.sold_individually
    ? 1
    : product.add_to_cart.maximum > 0
      ? product.add_to_cart.maximum
      : (product.low_stock_remaining ?? null);

  return {
    productId: product.id,
    variationId,
    variation,
    name: product.name,
    slug: product.slug,
    image: image?.thumbnail ?? image?.src ?? null,
    imageAlt: image?.alt || product.name,
    priceMinor: Number(product.prices.price),
    regularPriceMinor: Number(product.prices.regular_price),
    currency: product.prices,
    quantity,
    maxQuantity: max,
    inStock: product.is_in_stock,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOpen, setIsOpen] = useState(false);
  const validatedOnce = useRef(false);

  // Read persisted lines once on mount. Rendering before this completes would
  // produce a hydration mismatch, hence the `hydrated` flag.
  useEffect(() => {
    let lines: CartLine[] = [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) lines = parsed as CartLine[];
      }
    } catch {
      // Corrupt or unavailable storage — start with an empty cart.
    }
    dispatch({ type: "hydrate", lines });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lines));
    } catch {
      // Private browsing or quota exceeded; the cart still works in-memory.
    }
  }, [state.lines, state.hydrated]);

  /**
   * Ask the server for current prices and stock, then fold the answer back
   * into the cart. Prices in localStorage can be arbitrarily stale.
   */
  const revalidate = useCallback(async (lines: CartLine[]) => {
    if (!lines.length) return;

    dispatch({ type: "validating", value: true });

    try {
      const response = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: lines.map((line) => line.productId) }),
      });

      if (!response.ok) throw new Error("validate failed");

      const { products } = (await response.json()) as { products: WooProduct[] };
      const byId = new Map(products.map((product) => [product.id, product]));

      const notices: string[] = [];
      const next: CartLine[] = [];

      for (const line of lines) {
        const product = byId.get(line.productId);

        if (!product) {
          notices.push(`${line.name} is no longer available and was removed.`);
          continue;
        }

        if (!product.is_in_stock || !product.is_purchasable) {
          notices.push(`${line.name} is out of stock and was removed.`);
          continue;
        }

        const fresh = toLine({ product, quantity: line.quantity });
        const merged: CartLine = {
          ...fresh,
          variationId: line.variationId,
          variation: line.variation,
          quantity: clampQuantity(fresh, line.quantity),
        };

        if (merged.priceMinor !== line.priceMinor) {
          notices.push(`The price of ${line.name} has changed.`);
        }
        if (merged.quantity !== line.quantity) {
          notices.push(
            `Only ${merged.quantity} of ${line.name} remain; your quantity was reduced.`,
          );
        }

        next.push(merged);
      }

      dispatch({ type: "reconcile", lines: next, notices });
    } catch {
      // Offline or WP down — keep the cached cart rather than emptying it.
      dispatch({ type: "validating", value: false });
    }
  }, []);

  // Validate once after hydration, and again whenever the tab regains focus.
  useEffect(() => {
    if (!state.hydrated || validatedOnce.current) return;
    validatedOnce.current = true;
    void revalidate(state.lines);
  }, [state.hydrated, state.lines, revalidate]);

  useEffect(() => {
    const onFocus = () => {
      if (state.lines.length) void revalidate(state.lines);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [state.lines, revalidate]);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotalMinor = state.lines.reduce(
      (sum, line) => sum + line.priceMinor * line.quantity,
      0,
    );
    const savingsMinor = state.lines.reduce(
      (sum, line) =>
        sum + Math.max(0, line.regularPriceMinor - line.priceMinor) * line.quantity,
      0,
    );

    return {
      ...state,
      count,
      subtotalMinor,
      savingsMinor,
      currency: state.lines[0]?.currency ?? null,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add: (input) => {
        dispatch({ type: "add", line: toLine(input) });
        setIsOpen(true);
      },
      setQuantity: (key, quantity) =>
        dispatch({ type: "setQuantity", key, quantity }),
      remove: (key) => dispatch({ type: "remove", key }),
      clear: () => dispatch({ type: "clear" }),
      dismissNotices: () => dispatch({ type: "dismissNotices" }),
    };
  }, [state, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside <CartProvider>.");
  }
  return context;
}
