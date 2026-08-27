import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { getPosts } from "@/lib/woo/posts";

export const metadata: Metadata = {
  title: "Gift guides",
  description:
    "What to give at a confirmation, a baptism, or a christening — chosen and explained.",
};

export default async function JournalPage() {
  const posts = await getPosts();

  return (
    <Container size="wide" className="py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl text-ink sm:text-4xl">Gift guides</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          What to give, and why. Written by someone who has handled the things
          in them.
        </p>
      </header>

      {posts.length ? (
        <ul
          className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
        >
          {posts.map((post, index) => (
            <li key={post.id}>
              <article className="group relative flex flex-col">
                <div className="relative aspect-[3/2] overflow-hidden rounded-card bg-surface-sunk">
                  {post.image ? (
                    <Image
                      src={post.image.url}
                      alt={post.image.alt}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      priority={index < 3}
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>

                <div className="mt-4 flex flex-1 flex-col">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-ink-subtle">
                    {post.categories[0] ?? "Guide"}
                    <span className="mx-2" aria-hidden>
                      ·
                    </span>
                    {post.readingMinutes} min read
                  </p>

                  <h2 className="mt-2 text-[19px] leading-snug text-ink">
                    <Link
                      href={`/journal/${post.slug}`}
                      className="before:absolute before:inset-0"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  {post.excerpt ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">
                      {post.excerpt}
                    </p>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-12">
          <EmptyState
            title="No guides yet"
            description="Write the first one in WordPress and it will appear here."
            action={<ButtonLink href="/products">Browse the collection</ButtonLink>}
          />
        </div>
      )}
    </Container>
  );
}
