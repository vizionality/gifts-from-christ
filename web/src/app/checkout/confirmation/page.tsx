import type { Metadata } from "next";
import { ClearCartOnMount } from "@/components/cart/ClearCartOnMount";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getOrder } from "@/lib/woo/order";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const number = first(params.order);
  const key = first(params.key);

  const order = number && key ? await getOrder(number, key) : null;

  return (
    <Container size="narrow" className="py-20">
      <ClearCartOnMount />

      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-2xl text-accent"
        >
          ✓
        </span>
        <h1 className="mt-6 text-3xl text-ink sm:text-4xl">Thank you</h1>
        <p className="mt-3 text-ink-muted">
          {order
            ? `Order ${order.number} is confirmed. A receipt is on its way to ${order.email}.`
            : "Your order has been placed."}
        </p>
      </div>

      {order ? (
        <div className="mt-12 rounded-card border border-line bg-surface p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg text-ink">Order {order.number}</h2>
            <span className="text-sm capitalize text-ink-muted">
              {order.status.replace(/-/g, " ")}
            </span>
          </div>

          <ul className="mt-5 divide-y divide-line border-y border-line" role="list">
            {order.items.map((item) => (
              <li
                key={`${item.name}-${item.quantity}`}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <span className="text-ink">
                  {item.name}
                  <span className="text-ink-subtle"> × {item.quantity}</span>
                </span>
                <span className="tabular-nums text-ink-muted">
                  {order.currency} {item.total}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex justify-between text-ink">
            <span>Total</span>
            <span className="tabular-nums">
              {order.currency} {order.total}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-10 rounded-card border border-dashed border-line-strong px-6 py-10 text-center text-sm text-ink-muted">
          We could not load the order details from this link, but your order was
          placed successfully. Check your email for the receipt.
        </p>
      )}

      <div className="mt-10 flex justify-center">
        <ButtonLink href="/products" variant="secondary">
          Continue shopping
        </ButtonLink>
      </div>
    </Container>
  );
}
