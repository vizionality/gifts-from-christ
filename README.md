# Spiritual Gifts — Headless WooCommerce Shop

A headless storefront: **WordPress + WooCommerce + ACF** as the backend, **Next.js + Tailwind on Vercel** as the frontend.

- Catalogue, stock, orders and payment stay in WooCommerce, where a shop owner can actually administer them.
- Editorial content lives in **ACF fields** and is delivered inside the Store API response, so the frontend gets product data and marketing copy in one call.
- The cart is owned by the browser; **checkout hands off to WooCommerce** over a signed URL. Woo recomputes every price, tax and shipping line, so nothing price-bearing is ever trusted from the client.

---

## Architecture

```
┌──────────────────────────┐          ┌────────────────────────────┐
│  Next.js on Vercel       │          │  WordPress + WooCommerce   │
│                          │          │                            │
│  /                       │──GET────▶│  /wp-json/wc/store/v1/…    │
│  /products               │  products│    products, categories    │
│  /products/[slug]        │◀─────────│    + extensions.           │
│  /cart                   │   JSON   │      spiritual_gifts (ACF) │
│                          │          │                            │
│  cart in localStorage    │          │  /wp-json/headless/v1/…    │
│      │                   │          │    shop-config, order      │
│      │ POST /api/checkout│          │                            │
│      ▼                   │          │                            │
│  HMAC-sign the cart ─────┼─redirect▶│  ?sg-handoff=1&payload&sig │
│                          │          │    verify → build WC cart  │
│                          │          │    → /checkout → payment   │
│  /checkout/confirmation  │◀─redirect┤  woocommerce_thankyou      │
└──────────────────────────┘          └────────────────────────────┘
```

### Why the cart lives in the browser

The Store API's cart is session-based (`Cart-Token` / cookies). Sharing that session across the Vercel↔WordPress origin boundary is the single most fragile part of a headless Woo build. Instead:

1. The cart is plain state in `localStorage`, so it is instant and works offline.
2. It is **revalidated against Woo** on load and on tab focus (`/api/cart/validate`) — stale prices and sold-out lines are corrected with a visible notice, never silently.
3. At checkout the item list is signed server-side with HMAC-SHA256 and handed to WordPress, which rebuilds a genuine `WC()->cart` and redirects to Woo's checkout.

The signature stops a shopper editing ids or quantities in the URL. Prices are never sent — Woo looks them up itself.

---

## Repository layout

```
docker-compose.yml            WordPress + MariaDB + wp-cli
wordpress/
  mu-plugins/
    00-headless-config.php    Constants + allowed-origin helpers
    10-headless-cors.php      CORS for REST/Store API, exposes Cart-Token
    20-acf-fields.php         ACF field groups registered in code
    30-acf-store-api.php      Injects ACF into Store API + /shop-config
    40-checkout-handoff.php   Signed cart handoff, order lookup, return URL
  scripts/
    provision.sh              Idempotent install + configure
    seed.php                  Catalogue, images (GD, offline), ACF content
web/
  src/app/                    App Router pages + route handlers
  src/components/             UI, product, cart, layout components
  src/lib/                    Store API client, cart store, formatting
  scripts/mock-wp.mjs         Mock Store API — run the frontend without Docker
```

---

## Prerequisites

| Tool | Needed for | Status on this machine |
|---|---|---|
| Node 20+ | the storefront | ✅ v26.5.0 |
| Docker engine | the WordPress backend | ✅ Colima 0.10.3 + Docker CLI 29.7.2 |

The Docker runtime here is **Colima**, not Docker Desktop. Docker Desktop's first launch requires an admin password typed into a GUI dialog; Colima installs and starts entirely from the CLI and provides the same `docker` / `docker compose` commands.

```bash
brew install colima docker docker-compose
```

```bash
colima start --cpu 4 --memory 4 --disk 40
```

Homebrew's `docker-compose` is a CLI plugin, so `~/.docker/config.json` needs to point at it (already done here):

```json
{ "cliPluginsExtraDirs": ["/opt/homebrew/lib/docker/cli-plugins"] }
```

Colima does not start at login by default. After a reboot, run `colima start` before `docker compose up -d`, or enable it permanently with `brew services start colima`.

---

## Quick start

### 1. Backend

```bash
docker compose up -d
```

Then provision it (installs WooCommerce + ACF, configures the store, seeds eight products with generated images and ACF content):

```bash
docker compose run --rm wpcli
```

Backend is then at:

- Admin — <http://localhost:8080/wp-admin> (`admin` / `admin`)
- Store API — <http://localhost:8080/wp-json/wc/store/v1/products>
- Shop config — <http://localhost:8080/wp-json/headless/v1/shop-config>

### 2. Frontend

```bash
cd web && npm install && cp .env.example .env.local && npm run dev
```

<http://localhost:3000>

### Running the frontend without the backend

A mock backend ships with the repo for working on the storefront when you do not
want to boot WordPress (and for CI):

```bash
cd web && npm run mock-wp
```

```bash
cd web && npm run dev:mock
```

---

## How ACF reaches the storefront

`20-acf-fields.php` registers the field groups **in code** so they are versioned and deploy with the repo, rather than living only in the database.

`30-acf-store-api.php` registers a Store API extension, so every product response carries:

```jsonc
{
  "id": 104,
  "name": "Olive Wood Prayer Box",
  "prices": { "price": "9600", "currency_minor_unit": 2, … },
  "extensions": {
    "spiritual_gifts": {
      "badge": "Limited",
      "tagline": "The grain is unrepeatable…",
      "highlights": ["Bethlehem olive wood…", "Brass-pinned hinge", …],
      "materials": "Olive wood, brass, wool felt",
      "dimensions": "4.5\" x 3.5\" x 2.5\"",
      "scripture": "Matthew 6:6",
      "shipping_note": "Limited stock — ships in 2–4 days",
      "featured": false,
      "lifestyle_image": { "url": "…", "alt": "…" }
    }
  }
}
```

One request returns commerce data *and* editorial copy. `acf(product)` in `web/src/lib/woo/types.ts` applies safe defaults so components never null-check.

### Adding a field

1. Add it to the `fields` array in `20-acf-fields.php`.
2. Add it to `headless_product_acf_data()` and `headless_product_acf_schema()` in `30-acf-store-api.php`.
3. Add it to `AcfProductFields` and `EMPTY_ACF` in `web/src/lib/woo/types.ts`.

Only free-tier ACF field types are used, so the free plugin is enough. With ACF Pro, `sg_highlights` is the obvious candidate to convert from a newline-delimited textarea to a Repeater — change the `data_callback` to return the rows and nothing on the frontend needs to move.

---

## Deploying

### WordPress

Host it anywhere that runs WordPress (Kinsta, WP Engine, a VPS). Then:

1. Copy `wordpress/mu-plugins/*.php` into `wp-content/mu-plugins/`.
2. Install and activate **WooCommerce** and **Advanced Custom Fields**.
3. Set pretty permalinks — the REST routes need them.
4. Add to `wp-config.php`:

   ```php
   define( 'HEADLESS_FRONTEND_URL', 'https://your-store.vercel.app' );
   define( 'HEADLESS_HANDOFF_SECRET', '…64 hex chars…' );
   ```

5. Configure a real payment gateway. The provision script enables cash-on-delivery so local checkout is completable; that is **not** for production.

### Vercel

Set these environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_WP_URL` | `https://wp.your-domain.com` (no trailing slash) |
| `WP_HANDOFF_SECRET` | must match `HEADLESS_HANDOFF_SECRET` exactly |
| `NEXT_PUBLIC_REVALIDATE_SECONDS` | `60` is a reasonable default |
| `WC_WEBHOOK_SECRET` | optional, enables instant cache purges |

Generate the shared secret with:

```bash
openssl rand -hex 32
```

### Instant cache purging

In **WooCommerce → Settings → Advanced → Webhooks**, add a webhook per topic (`product.created`, `product.updated`, `product.deleted`):

- Delivery URL — `https://your-store.vercel.app/api/revalidate`
- Secret — the same value as `WC_WEBHOOK_SECRET`

The route verifies Woo's base64 HMAC-SHA256 signature and purges the affected cache tags. Unsigned and forged requests are rejected with a 401.

### Preview deployments

Vercel preview URLs are a different origin, so add them to the allow-list from your theme or a small plugin:

```php
add_filter( 'headless_allowed_origin_suffix', fn() => '.vercel.app' );
```

---

## What was verified

The whole stack was run end to end: Colima → WordPress + WooCommerce 11.0.1 + ACF 6.8.8 → Next.js, with two real orders placed through Woo's own checkout.

**Backend (real WordPress, not a mock)**

- `docker compose up -d` and `docker compose run --rm wpcli` provision a working store from empty volumes.
- Store API returns products with the ACF payload under `extensions.spiritual_gifts` — badge, tagline, highlights, scripture, lifestyle image.
- `/wp-json/headless/v1/shop-config` returns hero content, categories with counts, currency and site identity.
- CORS: an allowed origin receives the headers, a disallowed origin receives none, and `OPTIONS` preflight returns 204.
- Checkout handoff: a signed cart produced a real `WC()->cart` with correct quantities and a `$152.00` subtotal, landing on `/checkout/`.
- Handoff rejections all redirect back to the storefront with the right code: tampered payload and wrong secret → `bad_signature`, 20-minute-old timestamp → `expired`, no payload → `missing_payload`.

**Full purchase, in a browser**

Add to cart → drawer → checkout → Woo block checkout (guest, cash on delivery) → Place Order → redirect to `/checkout/confirmation` showing the order number, line items and total. Orders #36 ($148.00) and #37 ($28.00) exist in WooCommerce with status `processing`.

**Frontend**

Home, listing, product detail, cart, confirmation and 404 in light and dark themes, desktop and mobile; category filters, search, sorting, pagination; cart persistence; money formatting driven by the store's own currency rules. `npm run build`, `tsc --noEmit` and `eslint` are clean.

### Bugs this caught

Three defects surfaced only once real infrastructure was involved:

1. **WooCommerce requires WordPress ≥ 6.9**, so the original `wordpress:6.8` pin made plugin installation fail outright.
2. **HTML entities rendered literally.** WordPress returns `Home &amp; Table` and `Walnut &#8220;Gifts…`; React escapes on output, so entities appeared raw in the nav, breadcrumbs and titles. Fixed with `decodeEntities()` applied in the data layer, so no component has to remember.
3. **The cart survived checkout.** React runs child effects before parent ones, so `ClearCartOnMount` emptied the cart and the provider's hydration effect immediately restored it from `localStorage` — a shopper would finish an order and still see it in their cart. Fixed by waiting for `hydrated`.

A fourth was caught earlier against the mock: **Next 16 refuses to optimise images from private IPs** (SSRF guard), which breaks every image when WordPress is on `localhost`.

### Test data

The seeded catalogue and the two test orders are dev fixtures. To wipe everything and start clean:

```bash
docker compose down -v && docker compose up -d && docker compose run --rm wpcli
```

### Ad-hoc wp-cli

The `wpcli` service's entrypoint runs the provisioning script, so override it for one-off commands:

```bash
docker compose run --rm --entrypoint wp wpcli plugin list
```

## Known limitations

- **Coupons** are accepted by the handoff payload and applied by `40-checkout-handoff.php`, but there is no coupon UI in the cart yet.
- **Variable products** are supported by `AddToCartPanel` and the handoff, but the seed data is all simple products, so that path is untested against real Woo.
- **Customer accounts** are not headless. The footer links to Woo's own `/my-account`.
- **Shipping and tax** are shown as "calculated at checkout" rather than estimated in the cart. Estimating them would mean adopting the Store API cart session — a deliberate trade against reliability.
