import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PromoBar } from "@/components/layout/PromoBar";
import { CartProvider } from "@/lib/cart/store";
import { getCategories, getShopConfig } from "@/lib/woo/products";
import type { WooTerm } from "@/lib/woo/types";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["SOFT", "WONK"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getShopConfig();
  const name = config?.site.name ?? "Spiritual Gifts";

  return {
    title: {
      default: name,
      template: `%s · ${name}`,
    },
    description:
      config?.site.description ??
      "Objects for a practised faith — made slowly, in small numbers.",
    openGraph: { siteName: name, type: "website" },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await getShopConfig();

  // The storefront must render even if WordPress is unreachable, so a failed
  // category lookup degrades to an empty nav rather than a 500.
  let categories: WooTerm[] = config?.categories ?? [];
  if (!categories.length) {
    try {
      categories = await getCategories();
    } catch {
      categories = [];
    }
  }

  const siteName = config?.site.name ?? "Spiritual Gifts";

  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <CartProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink"
          >
            Skip to content
          </a>

          <PromoBar message={config?.hero.promo} />
          <Header siteName={siteName} categories={categories} />

          <main id="main" className="flex-1">
            {children}
          </main>

          <Footer
            siteName={siteName}
            description={config?.site.description}
            categories={categories}
          />

          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
