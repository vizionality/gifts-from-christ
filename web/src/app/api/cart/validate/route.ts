import { NextResponse } from "next/server";
import { getProductsByIds } from "@/lib/woo/products";

/**
 * Re-reads the products in a browser-held cart so the client can reconcile
 * stale prices and stock. Proxied through the app rather than called from the
 * browser so the cart never depends on WordPress CORS being right.
 */
export async function POST(request: Request) {
  let ids: unknown;

  try {
    ({ ids } = (await request.json()) as { ids?: unknown });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(ids)) {
    return NextResponse.json(
      { error: "`ids` must be an array of product ids." },
      { status: 400 },
    );
  }

  const numeric = Array.from(
    new Set(
      ids
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ).slice(0, 100);

  if (!numeric.length) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await getProductsByIds(numeric);
    return NextResponse.json({ products });
  } catch (error) {
    console.error("[cart/validate]", error);
    return NextResponse.json(
      { error: "Could not reach the store." },
      { status: 502 },
    );
  }
}
