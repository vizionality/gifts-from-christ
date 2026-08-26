#!/bin/sh
# Idempotent provisioning for the headless shop backend.
# Run with: docker compose run --rm wpcli
set -eu

echo "==> Waiting for WordPress files to be present..."
i=0
while [ ! -f /var/www/html/wp-settings.php ]; do
	i=$((i + 1))
	if [ "$i" -gt 60 ]; then
		echo "!! wp-settings.php never appeared. Is the wordpress service running?" >&2
		exit 1
	fi
	sleep 2
done

echo "==> Waiting for the database..."
i=0
until wp db check >/dev/null 2>&1 || wp core is-installed >/dev/null 2>&1; do
	i=$((i + 1))
	if [ "$i" -gt 60 ]; then
		echo "!! Could not reach the database." >&2
		exit 1
	fi
	sleep 2
done

if wp core is-installed >/dev/null 2>&1; then
	echo "==> WordPress already installed, skipping core install."
else
	echo "==> Installing WordPress..."
	wp core install \
		--url="$WP_URL" \
		--title="$WP_TITLE" \
		--admin_user="$WP_ADMIN_USER" \
		--admin_password="$WP_ADMIN_PASSWORD" \
		--admin_email="$WP_ADMIN_EMAIL" \
		--skip-email
fi

# If the WordPress image was bumped under an existing volume, the database
# schema needs to catch up before anything else runs.
wp core update-db

# The storefront footer and <meta description> read the site tagline; wp core
# install leaves it empty.
wp option update blogdescription "Objects for a practised faith, made slowly and in small numbers."

echo "==> Pretty permalinks (required by the REST + Store API routes)..."
wp rewrite structure '/%postname%/' --hard
wp rewrite flush --hard

echo "==> Installing plugins..."
wp plugin is-installed woocommerce || wp plugin install woocommerce
wp plugin is-installed advanced-custom-fields || wp plugin install advanced-custom-fields
wp plugin activate woocommerce advanced-custom-fields

echo "==> Store settings..."
wp option update woocommerce_store_address    "1 Cedar Lane"
wp option update woocommerce_store_city       "Asheville"
wp option update woocommerce_default_country  "US:NC"
wp option update woocommerce_store_postcode   "28801"
wp option update woocommerce_currency         "USD"
wp option update woocommerce_weight_unit      "lbs"
wp option update woocommerce_dimension_unit   "in"
wp option update woocommerce_calc_taxes       "no"
wp option update woocommerce_enable_guest_checkout "yes"
wp option update woocommerce_enable_coupons   "yes"

# Skip the onboarding wizard so /checkout is usable immediately. These are
# cosmetic admin-notice settings whose option names drift between WooCommerce
# releases, so a failure here must not abort provisioning.
wp option update woocommerce_onboarding_profile '{"skipped":true,"completed":true}' --format=json || true
wp option update woocommerce_task_list_hidden "yes" || true
wp option update woocommerce_task_list_appearance_complete "yes" || true
wp option update woocommerce_admin_notices '[]' --format=json || true

echo "==> Ensuring WooCommerce pages exist..."
wp wc tool run install_pages --user="$WP_ADMIN_USER" >/dev/null 2>&1 || true

echo "==> Enabling an offline gateway so checkout can complete in dev..."
wp option patch update woocommerce_cod_settings enabled yes 2>/dev/null || \
	wp option update woocommerce_cod_settings '{"enabled":"yes","title":"Cash on delivery","description":"Pay with cash upon delivery.","instructions":"","enable_for_methods":[],"enable_for_virtual":"yes"}' --format=json

echo "==> Seeding catalogue + ACF content..."
wp eval-file /scripts/seed.php

echo ""
echo "======================================================================"
echo " Backend ready."
echo "   Admin:      $WP_URL/wp-admin  ($WP_ADMIN_USER / $WP_ADMIN_PASSWORD)"
echo "   Store API:  $WP_URL/wp-json/wc/store/v1/products"
echo "   Shop config: $WP_URL/wp-json/headless/v1/shop-config"
echo "======================================================================"
