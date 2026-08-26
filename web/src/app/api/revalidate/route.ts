import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * WooCommerce webhook receiver. Point a `product.updated` / `product.created`
 * / `product.deleted` webhook here so the storefront drops its cached
 * catalogue the moment the shop owner saves a change, instead of waiting out
 * the revalidate window.
 *
 * WooCommerce signs the raw body with base64 HMAC-SHA256 in the
 * `x-wc-webhook-signature` header.
 */
export async function POST(request: Request) {
  const secret = process.env.WC_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "WC_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("x-wc-webhook-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 401 });
  }

  // The signature covers the raw bytes, so read text before parsing.
  const raw = await request.text();

  const expected = createHmac("sha256", secret).update(raw).digest();
  const given = Buffer.from(signature, "base64");

  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let slug: string | undefined;
  try {
    slug = (JSON.parse(raw) as { slug?: string }).slug;
  } catch {
    // A ping payload or non-JSON body still justifies a broad purge.
  }

  // Next 16 requires a cacheLife profile alongside the tag. "max" marks the
  // tag stale for every profile, which is what a catalogue change calls for.
  for (const tag of ["products", "featured", "categories", "shop-config"]) {
    revalidateTag(tag, "max");
  }
  if (slug) revalidateTag(`product:${slug}`, "max");

  return NextResponse.json({ revalidated: true, slug: slug ?? null });
}
