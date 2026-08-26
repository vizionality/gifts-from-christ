import { REVALIDATE_SECONDS } from "@/lib/env";

export class WooApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "WooApiError";
  }
}

interface WooFetchOptions {
  /** Query string parameters; undefined/empty values are dropped. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Seconds; pass 0 to opt out of caching entirely. */
  revalidate?: number;
  /** Cache tags so a webhook can purge just the affected pages. */
  tags?: string[];
  init?: RequestInit;
}

function buildUrl(
  base: string,
  path: string,
  params: WooFetchOptions["params"],
): string {
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * Thin fetch wrapper that keeps Next's caching directives in one place and
 * surfaces the WordPress error body instead of a bare status code.
 */
export async function wooFetch<T>(
  base: string,
  path: string,
  options: WooFetchOptions = {},
): Promise<{ data: T; headers: Headers }> {
  const url = buildUrl(base, path, options.params);
  const revalidate = options.revalidate ?? REVALIDATE_SECONDS;

  const response = await fetch(url, {
    ...options.init,
    headers: { Accept: "application/json", ...options.init?.headers },
    next: revalidate === 0
      ? undefined
      : { revalidate, tags: options.tags },
    ...(revalidate === 0 ? { cache: "no-store" as const } : {}),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) detail = body.message;
    } catch {
      // Non-JSON error body (a PHP fatal, a proxy page) — keep the status text.
    }
    throw new WooApiError(detail, response.status, url);
  }

  return { data: (await response.json()) as T, headers: response.headers };
}
