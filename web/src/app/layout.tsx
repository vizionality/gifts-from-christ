import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import { Archivo, Libre_Caslon_Text } from "next/font/google";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PromoBar } from "@/components/layout/PromoBar";
import { CartProvider } from "@/lib/cart/store";
import { getCategories, getShopConfig } from "@/lib/woo/products";
import type { WooTerm } from "@/lib/woo/types";
import "./globals.css";

/**
 * Caslon is not a decorative choice: the shop sells letterpress prints that
 * are hand-set in it, so the storefront is set in the same face it sells.
 *
 * The Text cut rather than Display: Display ships a single 400 weight, so
 * bold headings would be a browser-synthesised smear. Text carries a drawn
 * 700. Italic exists at 400 only, which is all the scripture line needs.
 */
const display = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  // Named for the face, not the role: the role token --font-display is built
  // from this in globals.css, and a shared name would be a circular var().
  variable: "--font-display-face",
  display: "swap",
});

/** A grotesque with some grit in it, rather than the default UI sans. */
const body = Archivo({
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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

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

        {/* Absent in local dev unless the id is set, so test traffic stays out
            of the property that decides the buying list. */}
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
