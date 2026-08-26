import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { WP_URL, handoffSecret } from "@/lib/env";
import { getProductsByIds } from "@/lib/woo/products";

interface HandoffItem {
  id: number;
  qty: number;
  variation_id: number;
  variation: Record<string, string>;
}

function base64url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Builds the signed URL that hands the browser-held cart to WooCommerce.
 *
 * The cart lives in the browser, so it cannot be trusted. The signature stops
 * a shopper editing quantities or product ids in transit; WooCommerce then
 * recomputes every price, tax and shipping line itself at checkout. Nothing
 * price-bearing crosses this boundary.
 */
export async function POST(request: Request) {
  let body: { items?: unknown; coupon?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }

  const items: HandoffItem[] = [];

  for (const raw of body.items.slice(0, 100)) {
    const item = raw as Partial<HandoffItem>;
    const id = Number(item?.id);
    const qty = Number(item?.qty);

    if (!Number.isInteger(id) || id <= 0) continue;

    items.push({
      id,
      qty: Number.isInteger(qty) && qty > 0 ? Math.min(qty, 999) : 1,
      variation_id:
        Number.isInteger(Number(item?.variation_id)) &&
        Number(item?.variation_id) > 0
          ? Number(item.variation_id)
          : 0,
      variation:
        item?.variation && typeof item.variation === "object"
          ? Object.fromEntries(
              Object.entries(item.variation).map(([key, value]) => [
                String(key),
                String(value),
              ]),
            )
          : {},
    });
  }

  if (!items.length) {
    return NextResponse.json(
      { error: "No valid items to check out." },
      { status: 400 },
    );
  }

  // Fail before the redirect if the catalogue has moved on, so the shopper
  // sees the problem on our page rather than a WooCommerce error notice.
  try {
    const products = await getProductsByIds(items.map((item) => item.id));
    const purchasable = new Set(
      products
        .filter((product) => product.is_purchasable && product.is_in_stock)
        .map((product) => product.id),
    );

    const unavailable = items.filter((item) => !purchasable.has(item.id));
    if (unavailable.length === items.length) {
      return NextResponse.json(
        { error: "None of the items in your cart are available." },
        { status: 409 },
      );
    }
  } catch (error) {
    console.error("[checkout] pre-flight failed", error);
    return NextResponse.json(
      { error: "Could not reach the store. Please try again." },
      { status: 502 },
    );
  }

  const payload = base64url(
    JSON.stringify({
      ts: Math.floor(Date.now() / 1000),
      items,
      coupon: typeof body.coupon === "string" ? body.coupon : undefined,
    }),
  );

  const signature = createHmac("sha256", handoffSecret())
    .update(payload)
    .digest("hex");

  const url = new URL(WP_URL);
  url.searchParams.set("sg-handoff", "1");
  url.searchParams.set("payload", payload);
  url.searchParams.set("sig", signature);

  return NextResponse.json({ url: url.toString() });
}

/** Exported for the unit test; keeps the HMAC comparison constant-time. */
export function verify(payload: string, signature: string): boolean {
  const expected = createHmac("sha256", handoffSecret())
    .update(payload)
    .digest();
  const given = Buffer.from(signature, "hex");

  return expected.length === given.length && timingSafeEqual(expected, given);
}
