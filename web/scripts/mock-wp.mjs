/**
 * Mock WordPress/WooCommerce Store API for verifying the storefront without
 * Docker. Mirrors the real response shapes, including the ACF extension the
 * 30-acf-store-api.php mu-plugin injects.
 */
import { createServer } from "node:http";
import { deflateSync } from "node:zlib";

const PORT = 8787;

/* ---------- minimal PNG encoder so product images are real files ---------- */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function gradientPng(w, h, from, to) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const t = (x / w) * 0.45 + (y / h) * 0.55;
      raw[p++] = Math.round(from[0] + (to[0] - from[0]) * t);
      raw[p++] = Math.round(from[1] + (to[1] - from[1]) * t);
      raw[p++] = Math.round(from[2] + (to[2] - from[2]) * t);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 6 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------ catalogue ------------------------------- */
const PRICES = {
  currency_code: "USD",
  currency_symbol: "$",
  currency_minor_unit: 2,
  currency_decimal_separator: ".",
  currency_thousand_separator: ",",
  currency_prefix: "$",
  currency_suffix: "",
};

const CATEGORIES = [
  { id: 16, name: "Wall Art", slug: "wall-art", count: 2 },
  { id: 17, name: "Journals", slug: "journals", count: 2 },
  { id: 18, name: "Home & Table", slug: "home", count: 2 },
  { id: 19, name: "Keepsakes", slug: "keepsakes", count: 2 },
];

const RAW = [
  ["walnut-gifts-of-the-spirit-panel", "Walnut “Gifts of the Spirit” Panel", 14800, 14800, "wall-art", [92,64,51], [191,149,111], "Bestseller", "Solid walnut, engraved to hold a shadow line.", ["Single-board North American black walnut","Hardwax oil finish, no polyurethane","French cleat included for flush mounting","Signed and dated on the reverse"], "Solid black walnut, brass hanging hardware", '18" x 12" x 1"', "1 Corinthians 12:4–11", "Made to order — ships in 5–7 days", true, 25],
  ["linen-bound-prayer-journal", "Linen-Bound Prayer Journal", 3400, 4200, "journals", [70,84,105], [158,173,191], "", "Lies completely flat, because that is the whole point.", ["Belgian linen over board","192 pages of 100gsm cream stock","Smyth-sewn to lie flat","Ribbon marker and back pocket"], "Belgian linen, cotton ribbon, acid-free paper", '8.25" x 5.75"', "Philippians 4:6", "In stock — ships next business day", true, 25],
  ["stoneware-communion-set", "Stoneware Communion Set", 21000, 21000, "home", [120,113,108], [214,211,205], "Small batch", "Wheel-thrown, cone 6, no two sets alike.", ["Wheel-thrown stoneware","Food-safe, lead-free matte glaze",'Chalice holds 8oz',"Dishwasher safe"], "Stoneware clay, matte oatmeal glaze", 'Chalice 6" tall; paten 7" diameter', "Luke 22:19", "Packed in double-walled cartons — ships in 3–5 days", true, 4],
  ["brass-scripture-bookmark", "Brass Scripture Bookmark", 2800, 2800, "keepsakes", [146,109,39], [226,195,122], "", "Arrives bright. Darkens where your fingers land.", ["0.5mm solid brass, photo-etched","Hand-deburred edges","Develops a personal patina","Arrives in a kraft sleeve"], "Solid brass", '5.5" x 1.1"', "Psalm 119:105", "In stock — ships next business day", false, 25],
  ["olive-wood-prayer-box", "Olive Wood Prayer Box", 9600, 9600, "keepsakes", [104,100,62], [195,186,140], "Limited", "The grain is unrepeatable. Yours will not match the photo.", ["Bethlehem olive wood from orchard prunings","Brass-pinned hinge","Felt-lined interior",'Holds folded 3" x 3" notes'], "Olive wood, brass, wool felt", '4.5" x 3.5" x 2.5"', "Matthew 6:6", "Limited stock — ships in 2–4 days", false, 3],
  ["letterpress-psalms-print-set", "Letterpress Psalms Print Set", 5200, 6400, "wall-art", [61,78,72], [156,180,166], "", "Deep enough to read with your fingertips.", ["Hand-set Caslon, pulled on a Vandercook",'Set of three 8" x 10" prints',"300gsm cotton rag, deckled edge","Edition of 150, numbered in pencil"], "300gsm cotton rag paper, soy-based ink", '8" x 10" each, unframed', "Psalm 23", "Ships flat in a rigid mailer — 3–5 days", false, 25],
  ["beeswax-vespers-candles", "Beeswax Vespers Candles", 3600, 3600, "home", [156,122,47], [240,219,165], "", "Burns slower, brighter, and without soot.", ["100% American beeswax","Braided cotton wick, no lead core",'Set of six 8" tapers',"Approx. four-hour burn each"], "Pure beeswax, cotton wick", '8" tall, 0.75" base', "Matthew 5:16", "In stock — ships next business day", false, 0],
  ["daily-office-desk-diary", "Daily Office Desk Diary", 5800, 5800, "journals", [82,60,78], [178,155,175], "New", "The offices in the margin, so you stop flipping between books.", ["Two pages per dated day","Morning and evening offices printed in the margin","Lay-flat binding","90gsm bleed-resistant paper"], "Board cover, cloth spine, acid-free paper", '9" x 6.5"', "Psalm 55:17", "In stock — ships next business day", true, 25],
];

const PRODUCTS = RAW.map((r, i) => {
  const [slug, name, price, regular, catSlug, from, to, badge, tagline, highlights, materials, dimensions, scripture, shipping, featured, stock] = r;
  const cat = CATEGORIES.find((c) => c.slug === catSlug);
  const img = (suffix, w, h) => ({
    id: i * 10 + (suffix === "lifestyle" ? 2 : 1),
    src: `http://localhost:${PORT}/wp-content/uploads/${slug}-${suffix}.png?w=${w}&h=${h}`,
    thumbnail: `http://localhost:${PORT}/wp-content/uploads/${slug}-${suffix}.png?w=300&h=300`,
    srcset: "", sizes: "", name, alt: name,
  });

  return {
    id: 100 + i,
    name, slug,
    parent: 0, type: "simple", permalink: `http://localhost:${PORT}/product/${slug}`,
    description: `<p>${tagline}</p><p>Made in small batches and finished by hand. Every piece is inspected before it leaves the bench, and no two are identical.</p>`,
    short_description: `<p>${tagline}</p>`,
    on_sale: price < regular,
    sku: `SG-${1000 + i}`,
    prices: {
      price: String(price), regular_price: String(regular),
      sale_price: String(price), price_range: null, ...PRICES,
    },
    price_html: "", average_rating: "4.8", review_count: 12,
    images: [img("image", 1200, 1200), img("lifestyle", 1600, 900)],
    categories: cat ? [{ id: cat.id, name: cat.name, slug: cat.slug, link: "" }] : [],
    tags: [], attributes: [], variations: [], has_options: false,
    is_purchasable: true,
    is_in_stock: stock > 0,
    is_on_backorder: false,
    low_stock_remaining: stock > 0 && stock <= 5 ? stock : null,
    sold_individually: false,
    add_to_cart: { text: "Add to cart", description: "", url: "", minimum: 1, maximum: stock || 0, multiple_of: 1 },
    extensions: {
      spiritual_gifts: {
        badge, tagline, highlights, materials, dimensions,
        care: "Wipe clean with a dry cloth.",
        scripture, shipping_note: shipping, featured,
        lifestyle_image: {
          url: `http://localhost:${PORT}/wp-content/uploads/${slug}-lifestyle.png?w=1600&h=900`,
          alt: `${name} in context`, width: 1600, height: 900,
        },
      },
    },
    _grad: [from, to],
  };
});

const SHOP_CONFIG = {
  hero: {
    eyebrow: "Made slowly, in small numbers",
    heading: "Objects for a practised faith",
    body: "Wood, brass, linen and clay, worked by hand and built to outlast the people who buy them. Nothing here is printed on demand.",
    cta_label: "Browse the collection",
    cta_url: "/products",
    promo: "Free shipping on orders over $75",
    image: { url: `http://localhost:${PORT}/wp-content/uploads/sg-shop-hero.png?w=2000&h=1100`, alt: "Shop hero" },
  },
  categories: CATEGORIES,
  currency: { code: "USD", symbol: "$" },
  site: { name: "Spiritual Gifts", description: "Objects for a practised faith, made slowly and in small numbers." },
};

/* -------------------------------- server -------------------------------- */
const json = (res, body, headers = {}) => {
  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...headers });
  res.end(JSON.stringify(body));
};

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const q = url.searchParams;

  if (url.pathname.startsWith("/wp-content/uploads/")) {
    const file = url.pathname.split("/").pop().replace(/\.png$/, "");
    const product = PRODUCTS.find((p) => file.startsWith(p.slug));
    const [from, to] = product ? product._grad : [[44, 42, 56], [168, 148, 122]];
    const w = Math.min(Number(q.get("w")) || 800, 1200);
    const h = Math.min(Number(q.get("h")) || 800, 1200);
    const png = gradientPng(w, h, file.includes("lifestyle") || file.includes("hero") ? to : from,
                                  file.includes("lifestyle") || file.includes("hero") ? from : to);
    res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
    res.end(png);
    return;
  }

  if (url.pathname === "/wp-json/headless/v1/shop-config") return json(res, SHOP_CONFIG);

  if (url.pathname === "/wp-json/wc/store/v1/products/categories") return json(res, CATEGORIES);

  if (url.pathname === "/wp-json/wc/store/v1/products") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- _grad is stripped from the response on purpose
    let items = PRODUCTS.map(({ _grad, ...p }) => p);

    if (q.get("slug")) items = items.filter((p) => p.slug === q.get("slug"));
    if (q.get("category")) items = items.filter((p) => p.categories.some((c) => c.slug === q.get("category")));
    if (q.get("search")) {
      const term = q.get("search").toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(term));
    }
    if (q.get("include")) {
      const ids = q.get("include").split(",").map(Number);
      items = items.filter((p) => ids.includes(p.id));
    }
    if (q.get("featured") === "true") {
      items = items.filter((p) => p.extensions.spiritual_gifts.featured);
    }

    const orderby = q.get("orderby") ?? "date";
    const dir = q.get("order") === "asc" ? 1 : -1;
    if (orderby === "price") items.sort((a, b) => (Number(a.prices.price) - Number(b.prices.price)) * dir);
    else if (orderby === "title") items.sort((a, b) => a.name.localeCompare(b.name) * dir);

    const perPage = Number(q.get("per_page")) || 12;
    const page = Number(q.get("page")) || 1;
    const total = items.length;
    const paged = items.slice((page - 1) * perPage, page * perPage);

    return json(res, paged, {
      "X-WP-Total": String(total),
      "X-WP-TotalPages": String(Math.max(1, Math.ceil(total / perPage))),
    });
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ code: "not_found", message: "No route matched." }));
}).listen(PORT, () => console.log(`mock WP listening on http://localhost:${PORT}`));
