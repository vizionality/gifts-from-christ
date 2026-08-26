import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-strong px-6 py-20 text-center">
      <h2 className="text-xl text-ink">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
