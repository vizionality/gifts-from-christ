<?php
/**
 * Plugin Name: Headless Shop — Waitlist
 * Description: Records interest in products that are listed but not yet stocked,
 *              so the first bulk order can be decided from real demand.
 */

defined( 'ABSPATH' ) || exit;

const HEADLESS_WAITLIST_POST_TYPE = 'sg_waitlist';

/**
 * A custom post type rather than a bespoke table: it inherits the admin list
 * screen, search, and sorting for free, which is all this data needs.
 */
add_action(
	'init',
	static function () {
		register_post_type(
			HEADLESS_WAITLIST_POST_TYPE,
			array(
				'labels'          => array(
					'name'          => 'Waitlist',
					'singular_name' => 'Waitlist Entry',
					'menu_name'     => 'Waitlist',
				),
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => true,
				'menu_icon'       => 'dashicons-email-alt',
				'menu_position'   => 56,
				'supports'        => array( 'title' ),
				'capabilities'    => array(
					// Entries arrive over REST; nobody should hand-author them.
					'create_posts' => 'do_not_allow',
				),
				'map_meta_cap'    => true,
			)
		);
	}
);

/** Columns that make the list screen usable at a glance. */
add_filter(
	'manage_' . HEADLESS_WAITLIST_POST_TYPE . '_posts_columns',
	static function ( array $columns ): array {
		return array(
			'cb'       => $columns['cb'] ?? '',
			'title'    => 'Email',
			'product'  => 'Product',
			'variant'  => 'Variant',
			'qty'      => 'Qty',
			'date'     => 'Requested',
		);
	}
);

add_action(
	'manage_' . HEADLESS_WAITLIST_POST_TYPE . '_posts_custom_column',
	static function ( string $column, int $post_id ): void {
		switch ( $column ) {
			case 'product':
				$product_id = (int) get_post_meta( $post_id, '_sg_product_id', true );
				$name       = (string) get_post_meta( $post_id, '_sg_product_name', true );
				$link       = $product_id ? get_edit_post_link( $product_id ) : '';
				echo $link
					? '<a href="' . esc_url( $link ) . '">' . esc_html( $name ) . '</a>'
					: esc_html( $name );
				break;

			case 'variant':
				echo esc_html( (string) get_post_meta( $post_id, '_sg_variant', true ) ?: '—' );
				break;

			case 'qty':
				echo esc_html( (string) ( get_post_meta( $post_id, '_sg_quantity', true ) ?: 1 ) );
				break;
		}
	},
	10,
	2
);

/**
 * POST /wp-json/headless/v1/waitlist
 *
 * Called only by the Next.js server, which holds the shared secret, so the
 * endpoint is never reachable straight from a browser.
 */
add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'headless/v1',
			'/waitlist',
			array(
				'methods'             => 'POST',
				'permission_callback' => static function ( WP_REST_Request $request ) {
					$given = (string) $request->get_header( 'x-headless-secret' );

					return $given !== '' && hash_equals( HEADLESS_HANDOFF_SECRET, $given );
				},
				'args'                => array(
					'email'      => array( 'required' => true, 'type' => 'string' ),
					'product_id' => array( 'required' => true, 'type' => 'integer' ),
				),
				'callback'            => 'headless_waitlist_store',
			)
		);
	}
);

function headless_waitlist_store( WP_REST_Request $request ) {
	// A write endpoint behind a shared secret; never cache the response.
	nocache_headers();

	$email = sanitize_email( (string) $request->get_param( 'email' ) );

	if ( ! is_email( $email ) ) {
		return new WP_Error( 'invalid_email', 'That email address is not valid.', array( 'status' => 400 ) );
	}

	$product_id = absint( $request->get_param( 'product_id' ) );
	$product    = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;

	if ( ! $product ) {
		return new WP_Error( 'unknown_product', 'No such product.', array( 'status' => 404 ) );
	}

	$variant = sanitize_text_field( (string) $request->get_param( 'variant' ) );

	// One row per person per product/variant; a second signup is not new demand.
	$existing = get_posts(
		array(
			'post_type'      => HEADLESS_WAITLIST_POST_TYPE,
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'title'          => $email,
			'meta_query'     => array(
				array( 'key' => '_sg_product_id', 'value' => $product_id ),
				array( 'key' => '_sg_variant', 'value' => $variant ),
			),
		)
	);

	if ( $existing ) {
		return rest_ensure_response( array( 'recorded' => true, 'duplicate' => true ) );
	}

	$post_id = wp_insert_post(
		array(
			'post_type'   => HEADLESS_WAITLIST_POST_TYPE,
			'post_status' => 'publish',
			'post_title'  => $email,
		),
		true
	);

	if ( is_wp_error( $post_id ) ) {
		return new WP_Error( 'save_failed', 'Could not record the request.', array( 'status' => 500 ) );
	}

	update_post_meta( $post_id, '_sg_product_id', $product_id );
	update_post_meta( $post_id, '_sg_product_name', $product->get_name() );
	update_post_meta( $post_id, '_sg_sku', $product->get_sku() );
	update_post_meta( $post_id, '_sg_variant', $variant );
	update_post_meta( $post_id, '_sg_quantity', max( 1, absint( $request->get_param( 'quantity' ) ) ) );

	return rest_ensure_response( array( 'recorded' => true, 'duplicate' => false ) );
}

/**
 * A per-product tally on the Products list screen, so the buying decision is
 * visible in the same place the catalogue is managed.
 */
add_filter(
	'manage_edit-product_columns',
	static function ( array $columns ): array {
		$columns['sg_waitlist'] = 'Waitlist';
		return $columns;
	},
	20
);

add_action(
	'manage_product_posts_custom_column',
	static function ( string $column, int $post_id ): void {
		if ( 'sg_waitlist' !== $column ) {
			return;
		}

		$count = new WP_Query(
			array(
				'post_type'      => HEADLESS_WAITLIST_POST_TYPE,
				'post_status'    => 'publish',
				'posts_per_page' => 1,
				'fields'         => 'ids',
				'meta_key'       => '_sg_product_id',
				'meta_value'     => $post_id,
			)
		);

		echo $count->found_posts
			? '<strong>' . esc_html( (string) $count->found_posts ) . '</strong>'
			: '—';
	},
	20,
	2
);
