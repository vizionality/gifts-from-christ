import { NextResponse } from "next/server";
import { HEADLESS_API, handoffSecret } from "@/lib/env";

/**
 * Records interest in an unstocked product.
 *
 * Proxied through the app rather than posted straight to WordPress so the
 * shared secret stays server-side and the endpoint is not open to the world.
 */
export async function POST(request: Request) {
  let body: {
    email?: unknown;
    productId?: unknown;
    variant?: unknown;
    quantity?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const productId = Number(body.productId);

  // Deliberately permissive: the RFC grammar is far looser than the usual
  // regex, and WordPress validates properly before storing anything.
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }

  try {
    const response = await fetch(`${HEADLESS_API}/waitlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Headless-Secret": handoffSecret(),
      },
      body: JSON.stringify({
        email,
        product_id: productId,
        variant: typeof body.variant === "string" ? body.variant.slice(0, 120) : "",
        quantity: Number.isInteger(Number(body.quantity))
          ? Math.max(1, Math.min(Number(body.quantity), 999))
          : 1,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      console.error("[waitlist] WordPress rejected the entry", detail);
      return NextResponse.json(
        { error: "Could not record that right now." },
        { status: 502 },
      );
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("[waitlist]", error);
    return NextResponse.json(
      { error: "Could not reach the store." },
      { status: 502 },
    );
  }
}
