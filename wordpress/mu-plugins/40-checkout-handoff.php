<?php
/**
 * Plugin Name: Headless Shop — Checkout Handoff
 * Description: Accepts a signed cart from the Vercel storefront, rebuilds it as a
 *              real WooCommerce cart, and redirects the shopper to Woo checkout.
 *
 * The storefront owns cart state. Rather than fight cross-origin cookies, the
 * browser is navigated to this endpoint with an HMAC-signed payload; Woo then
 * recomputes authoritative pricing, tax, and shipping at checkout.
 */

defined( 'ABSPATH' ) || exit;

const HEADLESS_HANDOFF_TTL = 900; // 15 minutes.

function headless_b64url_decode( string $value ): string {
	$padded = strtr( $value, '-_', '+/' );
	$padded .= str_repeat( '=', ( 4 - strlen( $padded ) % 4 ) % 4 );

	return (string) base64_decode( $padded, true );
}

function headless_handoff_sign( string $payload ): string {
	return hash_hmac( 'sha256', $payload, HEADLESS_HANDOFF_SECRET );
}

/**
 * Bounce the shopper back to the storefront with an error code rather than
 * dumping them on a blank WordPress page.
 */
function headless_handoff_fail( string $code ): void {
	$url = add_query_arg( 'cart_error', rawurlencode( $code ), untrailingslashit( HEADLESS_FRONTEND_URL ) . '/cart' );
	wp_redirect( $url, 302 );
	exit;
}

add_action(
	'template_redirect',
	static function () {
		if ( empty( $_GET['sg-handoff'] ) ) {
			return;
		}

		// Sets a cart cookie and issues a redirect; a cached copy would hand
		// one shopper another shopper's cart.
		nocache_headers();

		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			headless_handoff_fail( 'woocommerce_unavailable' );
		}

		$payload_raw = isset( $_GET['payload'] ) ? sanitize_text_field( wp_unslash( $_GET['payload'] ) ) : '';
		$signature   = isset( $_GET['sig'] ) ? sanitize_text_field( wp_unslash( $_GET['sig'] ) ) : '';

		if ( '' === $payload_raw || '' === $signature ) {
			headless_handoff_fail( 'missing_payload' );
		}

		if ( ! hash_equals( headless_handoff_sign( $payload_raw ), $signature ) ) {
			headless_handoff_fail( 'bad_signature' );
		}

		$payload = json_decode( headless_b64url_decode( $payload_raw ), true );
		if ( ! is_array( $payload ) || empty( $payload['items'] ) || ! is_array( $payload['items'] ) ) {
			headless_handoff_fail( 'malformed_payload' );
		}

		$issued = isset( $payload['ts'] ) ? (int) $payload['ts'] : 0;
		if ( abs( time() - $issued ) > HEADLESS_HANDOFF_TTL ) {
			headless_handoff_fail( 'expired' );
		}

		// A cart may already exist from a previous handoff; start clean.
		WC()->cart->empty_cart();

		$added   = 0;
		$skipped = array();

		foreach ( $payload['items'] as $item ) {
			$product_id   = isset( $item['id'] ) ? absint( $item['id'] ) : 0;
			$quantity     = isset( $item['qty'] ) ? max( 1, absint( $item['qty'] ) ) : 1;
			$variation_id = isset( $item['variation_id'] ) ? absint( $item['variation_id'] ) : 0;
			$variation    = isset( $item['variation'] ) && is_array( $item['variation'] ) ? $item['variation'] : array();

			if ( ! $product_id ) {
				continue;
			}

			$product = wc_get_product( $variation_id ?: $product_id );
			if ( ! $product || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
				$skipped[] = $product_id;
				continue;
			}

			// Attribute keys arrive as `pa_size`; Woo expects `attribute_pa_size`.
			$normalised = array();
			foreach ( $variation as $key => $value ) {
				$key                = str_starts_with( (string) $key, 'attribute_' ) ? $key : 'attribute_' . $key;
				$normalised[ $key ] = sanitize_text_field( (string) $value );
			}

			$result = WC()->cart->add_to_cart( $product_id, $quantity, $variation_id, $normalised );
			if ( $result ) {
				++$added;
			} else {
				$skipped[] = $product_id;
			}
		}

		if ( 0 === $added ) {
			headless_handoff_fail( 'nothing_added' );
		}

		if ( $skipped ) {
			wc_add_notice(
				sprintf(
					/* translators: %d: number of unavailable items */
					_n( '%d item was unavailable and has been removed.', '%d items were unavailable and have been removed.', count( $skipped ), 'headless-shop' ),
					count( $skipped )
				),
				'notice'
			);
		}

		if ( ! empty( $payload['coupon'] ) ) {
			WC()->cart->apply_coupon( sanitize_text_field( (string) $payload['coupon'] ) );
		}

		WC()->cart->calculate_totals();

		wp_redirect( wc_get_checkout_url(), 302 );
		exit;
	},
	1
);

/**
 * After a successful order, send the shopper back to the storefront's
 * confirmation page instead of leaving them on the WordPress theme.
 */
add_action(
	'woocommerce_thankyou',
	static function ( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return;
		}

		$url = add_query_arg(
			array(
				'order' => $order->get_order_number(),
				'key'   => $order->get_order_key(),
			),
			untrailingslashit( HEADLESS_FRONTEND_URL ) . '/checkout/confirmation'
		);

		wp_redirect( $url, 302 );
		exit;
	},
	5
);

/**
 * Read-only order lookup so the storefront confirmation page can show a summary.
 * Authenticated by the order key, exactly as Woo's own order-received page is.
 */
add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'headless/v1',
			'/order/(?P<number>[A-Za-z0-9\-_]+)',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'args'                => array(
					'key' => array(
						'required' => true,
						'type'     => 'string',
					),
				),
				'callback'            => static function ( WP_REST_Request $request ) {
					/*
					 * Managed hosts (WP Engine among them) cache /wp-json paths
					 * they do not recognise. This response is per-order and
					 * authorised only by the order key, so a cached copy could
					 * be served to the wrong person. Refuse caching explicitly
					 * rather than relying on a host-specific exclusion.
					 */
					nocache_headers();

					$order = wc_get_order( absint( $request['number'] ) );

					if ( ! $order || ! hash_equals( $order->get_order_key(), (string) $request->get_param( 'key' ) ) ) {
						return new WP_Error( 'not_found', 'Order not found.', array( 'status' => 404 ) );
					}

					$items = array();
					foreach ( $order->get_items() as $item ) {
						$items[] = array(
							'name'     => $item->get_name(),
							'quantity' => $item->get_quantity(),
							'total'    => wc_format_decimal( $item->get_total(), 2 ),
						);
					}

					return rest_ensure_response(
						array(
							'number'   => $order->get_order_number(),
							'status'   => $order->get_status(),
							'total'    => wc_format_decimal( $order->get_total(), 2 ),
							'currency' => $order->get_currency(),
							'email'    => $order->get_billing_email(),
							'date'     => $order->get_date_created() ? $order->get_date_created()->date( 'c' ) : null,
							'items'    => $items,
						)
					);
				},
			)
		);
	}
);
