<?php
/**
 * Plugin Name: Headless Shop — CORS
 * Description: Allows the Vercel storefront to call the WP REST + WooCommerce Store API.
 */

defined( 'ABSPATH' ) || exit;

/**
 * WordPress sends its own CORS headers for the REST API; replace them with ours
 * so we can allow credentials and expose the Store API's cart headers.
 */
add_action(
	'rest_api_init',
	static function () {
		remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
		add_filter( 'rest_pre_serve_request', 'headless_send_cors_headers', 10, 1 );
	},
	15
);

function headless_send_cors_headers( $value ) {
	$origin = get_http_origin();

	if ( $origin && headless_is_allowed_origin( $origin ) ) {
		header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
		header( 'Access-Control-Allow-Credentials: true' );
		header( 'Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS' );
		header( 'Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce, Nonce, Cart-Token' );
		// Without this the browser hides the cart session headers from JS.
		header( 'Access-Control-Expose-Headers: Cart-Token, Nonce, X-WP-Total, X-WP-TotalPages, Link' );
		header( 'Access-Control-Max-Age: 600' );
	}

	header( 'Vary: Origin', false );

	return $value;
}

/**
 * Answer preflight requests before WordPress tries to authenticate them.
 */
add_action(
	'rest_api_init',
	static function () {
		if ( 'OPTIONS' !== ( $_SERVER['REQUEST_METHOD'] ?? '' ) ) {
			return;
		}

		$origin = get_http_origin();
		if ( $origin && headless_is_allowed_origin( $origin ) ) {
			headless_send_cors_headers( true );
			status_header( 204 );
			exit;
		}
	},
	5
);
