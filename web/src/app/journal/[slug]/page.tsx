import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Container } from "@/components/ui/Container";
import { SITE_URL } from "@/lib/env";
import { getFeaturedProducts } from "@/lib/woo/products";
import { getPostBySlug, getPosts } from "@/lib/woo/posts";
import type { WooProduct } from "@/lib/woo/types";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const posts = await getPosts(50);
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) return { title: "Guide not found" };

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/journal/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      images: post.image ? [{ url: post.image.url }] : undefined,
    },
  };
}

export default async function JournalPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  // A guide that recommends nothing buyable is a blog post, not a gift guide.
  let products: WooProduct[] = [];
  try {
    products = await getFeaturedProducts(3);
  } catch {
    products = [];
  }

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    image: post.image ? [post.image.url] : undefined,
    mainEntityOfPage: `${SITE_URL}/journal/${post.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleLd).replace(/<\/script/gi, "<\\/script"),
        }}
      />

      <Container size="narrow" className="py-12">
        <nav aria-label="Breadcrumb" className="mb-8">
          <Link
            href="/journal"
            className="text-sm text-ink-subtle hover:text-ink"
          >
            &larr; Gift guides
          </Link>
        </nav>

        <p className="text-[11px] uppercase tracking-[0.1em] text-ink-subtle">
          {post.categories[0] ?? "Guide"}
          <span className="mx-2" aria-hidden>
            ·
          </span>
          {post.readingMinutes} min read
        </p>

        <h1 className="mt-3 text-3xl leading-tight text-ink sm:text-4xl">
          {post.title}
        </h1>

        {post.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            {post.excerpt}
          </p>
        ) : null}
      </Container>

      {post.image ? (
        <Container size="wide" className="pb-4">
          <div className="relative aspect-[21/9] overflow-hidden rounded-card bg-surface-sunk">
            <Image
              src={post.image.url}
              alt={post.image.alt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Container>
      ) : null}

      <Container size="narrow" className="py-10">
        <div
          className="rich-text"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </Container>

      {products.length ? (
        <section className="border-t border-line py-16">
          <Container size="wide">
            <h2 className="text-2xl text-ink">Mentioned in this guide</h2>
            <ProductGrid
              products={products}
              columns={3}
              className="mt-8"
              listName={`Guide: ${post.slug}`}
            />
          </Container>
        </section>
      ) : null}
    </>
  );
}
