export function PromoBar({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div className="bg-ink text-paper">
      <p className="mx-auto max-w-7xl px-5 py-2.5 text-center text-xs tracking-[0.04em] sm:px-8">
        {message}
      </p>
    </div>
  );
}
