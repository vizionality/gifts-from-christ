import type { Metadata } from "next";
import { Suspense } from "react";
import { CartView } from "@/components/cart/CartView";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Cart",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <Container size="wide" className="py-12">
      <h1 className="text-3xl text-ink sm:text-4xl">Your cart</h1>

      <Suspense fallback={<Skeleton className="mt-10 h-64 w-full" />}>
        <CartView />
      </Suspense>
    </Container>
  );
}
