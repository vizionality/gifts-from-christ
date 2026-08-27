import { WP_URL } from "@/lib/env";
import { wooFetch } from "@/lib/woo/client";
import { decodeEntities } from "@/lib/format";

const WP_API = `${WP_URL}/wp-json/wp/v2`;

export interface JournalPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  /** Rendered HTML from WordPress; styled by the .rich-text rules. */
  content: string;
  date: string;
  image: { url: string; alt: string; width?: number; height?: number } | null;
  categories: string[];
  readingMinutes: number;
}

/** WordPress REST shapes, narrowed to what the journal reads. */
interface RawPost {
  id: number;
  slug: string;
  date_gmt: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: {
    "wp:featuredmedia"?: {
      source_url?: string;
      alt_text?: string;
      media_details?: { width?: number; height?: number };
    }[];
    "wp:term"?: { taxonomy: string; name: string }[][];
  };
}

function strip(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(raw: RawPost): JournalPost {
  const media = raw._embedded?.["wp:featuredmedia"]?.[0];
  const words = strip(raw.content.rendered).split(/\s+/).filter(Boolean).length;

  return {
    id: raw.id,
    slug: raw.slug,
    title: decodeEntities(raw.title.rendered),
    excerpt: strip(raw.excerpt.rendered),
    content: raw.content.rendered,
    date: raw.date_gmt,
    image: media?.source_url
      ? {
          url: media.source_url,
          alt: media.alt_text || "",
          width: media.media_details?.width,
          height: media.media_details?.height,
        }
      : null,
    categories: (raw._embedded?.["wp:term"] ?? [])
      .flat()
      .filter((term) => term?.taxonomy === "category")
      .map((term) => decodeEntities(term.name))
      // WordPress assigns this to anything uncategorised; it is noise.
      .filter((name) => name.toLowerCase() !== "uncategorized"),
    // 220wpm is a reasonable pace for this kind of writing.
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}

export async function getPosts(limit = 20): Promise<JournalPost[]> {
  try {
    const { data } = await wooFetch<RawPost[]>(WP_API, "/posts", {
      params: { per_page: limit, _embed: 1, orderby: "date", order: "desc" },
      tags: ["posts"],
    });
    return data.map(normalize);
  } catch {
    // A missing journal should not take the storefront down.
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<JournalPost | null> {
  try {
    const { data } = await wooFetch<RawPost[]>(WP_API, "/posts", {
      params: { slug, _embed: 1, per_page: 1 },
      tags: ["posts", `post:${slug}`],
    });
    return data[0] ? normalize(data[0]) : null;
  } catch {
    return null;
  }
}
