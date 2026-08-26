import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <Container size="narrow" className="py-28 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
        404
      </p>
      <h1 className="mt-4 text-3xl text-ink sm:text-4xl">
        We could not find that page
      </h1>
      <p className="mt-3 text-ink-muted">
        The link may be out of date, or the product may have been retired.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/products">Browse the collection</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </Container>
  );
}
