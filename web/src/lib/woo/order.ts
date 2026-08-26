import { HEADLESS_API } from "@/lib/env";
import { decodeEntities } from "@/lib/format";
import { wooFetch } from "@/lib/woo/client";

export interface OrderSummary {
  number: string;
  status: string;
  total: string;
  currency: string;
  email: string;
  date: string | null;
  items: { name: string; quantity: number; total: string }[];
}

/**
 * Fetch an order for the confirmation page. Authorised by the order key that
 * WooCommerce appends to the return URL, mirroring Woo's own order-received
 * page — there is no session to rely on here.
 */
export async function getOrder(
  number: string,
  key: string,
): Promise<OrderSummary | null> {
  try {
    const { data } = await wooFetch<OrderSummary>(
      HEADLESS_API,
      `/order/${encodeURIComponent(number)}`,
      { params: { key }, revalidate: 0 },
    );

    // Order line names come straight from WordPress, HTML-encoded.
    return {
      ...data,
      items: data.items.map((item) => ({
        ...item,
        name: decodeEntities(item.name),
      })),
    };
  } catch {
    return null;
  }
}
