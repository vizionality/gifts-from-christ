#!/bin/bash
# Remote readiness check for a headless WordPress backend.
# Usage: ./check-backend.sh https://wp.giftsfromchrist.com [frontend-origin]
#
# Needs no credentials — everything below is publicly observable.
set -u
WP="${1:?usage: check-backend.sh <wordpress-url> [frontend-origin]}"
WP="${WP%/}"
ORIGIN="${2:-https://giftsfromchrist.com}"

pass=0; fail=0
ok()   { printf "  \033[32mPASS\033[0m  %s\n" "$1"; pass=$((pass+1)); }
bad()  { printf "  \033[31mFAIL\033[0m  %s\n" "$1"; fail=$((fail+1)); }
info() { printf "  ....  %s\n" "$1"; }

code() { curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$@"; }
body() { curl -s --max-time 15 "$@"; }

echo ""; echo "Checking $WP"; echo ""

echo "REST API"
[ "$(code "$WP/wp-json/")" = "200" ] && ok "/wp-json/ reachable" || bad "/wp-json/ not reachable — permalinks may not be set to post name"

echo ""; echo "Plugins"
# PHP's json_encode escapes forward slashes, so the body carries
# "wc\/store\/v1". Strip backslashes before matching.
ROOT=$(body "$WP/wp-json/" | tr -d '\\')
echo "$ROOT" | grep -q "wc/store/v1" \
  && ok "WooCommerce Store API present" \
  || bad "WooCommerce Store API missing — is WooCommerce active?"
echo "$ROOT" | grep -q "acf" \
  && ok "ACF REST namespace present" \
  || info "ACF namespace not advertised (harmless; fields are served via the Store API extension)"

echo ""; echo "Our mu-plugins"
SC=$(code "$WP/wp-json/headless/v1/shop-config")
[ "$SC" = "200" ] && ok "headless/v1/shop-config responds" || bad "headless/v1/shop-config returned $SC — mu-plugins not uploaded?"

WL=$(code -X POST "$WP/wp-json/headless/v1/waitlist" -H 'Content-Type: application/json' \
  -d '{"email":"probe@example.com","product_id":1}')
[ "$WL" = "401" ] && ok "waitlist endpoint present and refusing unsigned calls" \
  || bad "waitlist returned $WL — expected 401 (present but protected)"

echo ""; echo "ACF"
if body "$WP/wp-json/wc/store/v1/products?per_page=1" | grep -q "spiritual_gifts"; then
  ok "ACF fields present in Store API responses"
else
  info "no ACF extension seen — expected if the catalogue is still empty"
fi

echo ""; echo "CORS (origin: $ORIGIN)"
ACAO=$(curl -s -o /dev/null -D - --max-time 15 -H "Origin: $ORIGIN" "$WP/wp-json/wc/store/v1/products?per_page=1" | tr -d '\r' | grep -i '^access-control-allow-origin:' | cut -d' ' -f2)
[ "$ACAO" = "$ORIGIN" ] && ok "allows $ORIGIN" \
  || bad "Allow-Origin is '${ACAO:-none}' — set HEADLESS_FRONTEND_URL in wp-config"

EVIL=$(curl -s -o /dev/null -D - --max-time 15 -H "Origin: https://evil.example" "$WP/wp-json/wc/store/v1/products?per_page=1" | tr -d '\r' | grep -ci '^access-control-allow-origin:')
[ "$EVIL" = "0" ] && ok "rejects unknown origins" || bad "unknown origin was allowed"

echo ""; echo "Cache safety"
CC=$(curl -s -o /dev/null -D - --max-time 15 "$WP/?sg-handoff=1&payload=x&sig=y" | tr -d '\r' | grep -i '^cache-control:')
echo "$CC" | grep -qi "no-store" && ok "checkout handoff is uncacheable" \
  || bad "handoff Cache-Control is '${CC:-absent}' — a cached copy would leak carts"

echo ""; echo "TLS"
[ "${WP:0:8}" = "https://" ] && ok "HTTPS" || bad "not HTTPS — required in production"

echo ""; printf "  %d passed, %d failed\n\n" "$pass" "$fail"
[ "$fail" -eq 0 ]
