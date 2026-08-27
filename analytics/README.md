# Analytics

## The dataLayer contract

Every ecommerce event the storefront can see is pushed to `window.dataLayer` in
GA4 ecommerce shape, preceded by a clear:

```js
dataLayer.push({ ecommerce: null });
dataLayer.push({ event: "add_to_cart", ecommerce: { currency, value, items } });
```

The clear is not optional. GTM's dataLayer merges rather than replaces, so
without it a `view_item` arrives carrying the previous `add_to_cart`'s basket —
which silently corrupts exactly the item-level data used to decide purchasing.

| Event | Fires when | Notes |
|---|---|---|
| `view_item_list` | a product grid renders | `item_list_name` matches `select_item` |
| `select_item` | a product is clicked in a grid | click-through from a list |
| `view_item` | a product page opens | once per product, guarded against React's double-mount in dev |
| `add_to_cart` | add to cart, pre-order, or "tell me when it lands" | carries `fulfillable: false` for demand-test lines |
| `view_cart` | the drawer opens, or the cart page loads | page fires once per visit, after hydration |
| `remove_from_cart` | a line is removed | fired before removal, while the line still exists |
| `begin_checkout` | checkout is clicked | fired before the request, so a network failure does not erase the commit |
| `purchase` | the confirmation page loads | deduplicated by order number in `sessionStorage` |
| `join_waitlist` | an email is submitted against an unstocked item | custom event, not GA4 standard |

`item_id` prefers SKU over post ID, so one identifier follows a product through
the whole funnel.

Prices are converted from the Store API's integer minor units to the major
units GA4 expects. `purchase` is the exception: the order endpoint already
returns major units.

## Transport

Chosen at build time from the environment, never by sniffing globals — GTM
defines `window.gtag` too, which would make the two paths ambiguous and risk
double-counting.

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_GTM_ID` | GTM loads, events push to `dataLayer`. Takes precedence. |
| `NEXT_PUBLIC_GA_ID` | Only used when GTM is unset; events call `gtag()`. |
| neither | Events are no-ops. Keeps local browsing out of the property. |

## Importing the GTM container

`gtm-container-ga4-ecommerce.json` sets up a GA4 configuration tag plus one
event tag and trigger per event above.

1. GTM → **Admin** → **Import Container**
2. Choose the file, select your workspace
3. Choose **Merge**, not Overwrite — Overwrite deletes everything already in
   the container
4. Confirm, then open the **GA4 Measurement ID** variable and replace
   `G-XXXXXXXXXX` with your real ID. Every tag reads that variable, so it is
   the only place it needs changing.
5. **Preview** and click through the storefront before publishing

Each event tag has "Send Ecommerce data" enabled, reading from the Data Layer.
Without that, GTM receives the events and forwards no item data.

## Verifying

GTM Preview shows each event as it fires. In GA4, use **Realtime → Events**, or
**Reports → Monetisation → Ecommerce purchases** sorted by *items added to
cart* for the demand ranking.

Expect `add_to_cart` against zero purchases for any unstocked line. That is the
demand test working, not a tracking fault — `fulfillable: false` separates
those from real sales.
