"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[storefront]", error);
  }, [error]);

  return (
    <Container size="narrow" className="py-28 text-center">
      <h1 className="text-3xl text-ink sm:text-4xl">Something went wrong</h1>
      <p className="mt-3 text-ink-muted">
        This is usually the store being unreachable. Trying again often fixes it.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </div>
    </Container>
  );
}
