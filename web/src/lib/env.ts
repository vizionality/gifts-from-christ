/**
 * Environment access, centralised so a missing variable fails loudly at the
 * call site instead of producing a confusing `undefined/wp-json/...` fetch.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value.replace(/\/$/, "");
}

/** Public WordPress origin, e.g. http://localhost:8080 */
export const WP_URL = required(
  "NEXT_PUBLIC_WP_URL",
  process.env.NEXT_PUBLIC_WP_URL,
);

export const STORE_API = `${WP_URL}/wp-json/wc/store/v1`;
export const HEADLESS_API = `${WP_URL}/wp-json/headless/v1`;

/**
 * Server-only. Shared with the WordPress mu-plugin to sign cart handoffs.
 * Never import this into a client component.
 */
export function handoffSecret(): string {
  return required("WP_HANDOFF_SECRET", process.env.WP_HANDOFF_SECRET);
}

/** How long product data may be cached before Next revalidates it. */
export const REVALIDATE_SECONDS = Number(
  process.env.NEXT_PUBLIC_REVALIDATE_SECONDS ?? 60,
);
