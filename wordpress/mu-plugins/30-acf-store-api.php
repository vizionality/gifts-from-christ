<?php
/**
 * Plugin Name: Headless Shop — ACF in the Store API
 * Description: Exposes ACF product fields inside WooCommerce Store API responses.
 */

defined( 'ABSPATH' ) || exit;

const HEADLESS_STORE_API_NAMESPACE = 'spiritual_gifts';

/**
 * Build the ACF payload for a single product.
 *
 * @param WC_Product $product
 * @return array<string,mixed>
 */
function headless_product_acf_data( $product ): array {
	$id = $product instanceof WC_Product ? $product->get_id() : (int) $product;

	$get = static function ( string $name ) use ( $id ) {
		return function_exists( 'get_field' ) ? get_field( $name, $id ) : null;
	};

	$image = $get( 'sg_lifestyle_image' );

	// ACF may return an ID, a URL, or an array depending on configuration.
	$lifestyle_image = null;
	if ( is_array( $image ) && ! empty( $image['url'] ) ) {
		$lifestyle_image = array(
			'url'    => $image['url'],
			'alt'    => $image['alt'] ?? '',
			'width'  => isset( $image['width'] ) ? (int) $image['width'] : null,
			'height' => isset( $image['height'] ) ? (int) $image['height'] : null,
		);
	} elseif ( is_numeric( $image ) ) {
		$src = wp_get_attachment_image_src( (int) $image, 'full' );
		if ( $src ) {
			$lifestyle_image = array(
				'url'    => $src[0],
				'alt'    => (string) get_post_meta( (int) $image, '_wp_attachment_image_alt', true ),
				'width'  => (int) $src[1],
				'height' => (int) $src[2],
			);
		}
	}

	// Highlights are authored one-per-line in a textarea.
	$highlights_raw = (string) $get( 'sg_highlights' );
	$highlights     = array_values(
		array_filter(
			array_map( 'trim', preg_split( '/\r\n|\r|\n/', $highlights_raw ) ?: array() ),
			static fn( $line ) => '' !== $line
		)
	);

	return array(
		'badge'         => (string) $get( 'sg_badge' ),
		'tagline'       => (string) $get( 'sg_tagline' ),
		'highlights'    => $highlights,
		'materials'     => (string) $get( 'sg_materials' ),
		'dimensions'    => (string) $get( 'sg_dimensions' ),
		'care'          => (string) $get( 'sg_care' ),
		'scripture'     => (string) $get( 'sg_scripture' ),
		'shipping_note' => (string) $get( 'sg_shipping_note' ),
		'featured'      => (bool) $get( 'sg_featured' ),
		'lifestyle_image' => $lifestyle_image,
	);
}

/**
 * Schema advertised on the Store API product endpoint.
 */
function headless_product_acf_schema(): array {
	$string = static fn( string $desc ) => array(
		'description' => $desc,
		'type'        => 'string',
		'readonly'    => true,
	);

	return array(
		'badge'         => $string( 'Short marketing flag for the product card.' ),
		'tagline'       => $string( 'One-line hook shown under the product title.' ),
		'highlights'    => array(
			'description' => 'Feature bullets, one per authored line.',
			'type'        => 'array',
			'items'       => array( 'type' => 'string' ),
			'readonly'    => true,
		),
		'materials'     => $string( 'Materials the product is made from.' ),
		'dimensions'    => $string( 'Physical dimensions.' ),
		'care'          => $string( 'Care instructions.' ),
		'scripture'     => $string( 'Associated scripture reference.' ),
		'shipping_note' => $string( 'Fulfilment note shown near the add-to-cart button.' ),
		'featured'      => array(
			'description' => 'Whether the product is featured on the homepage.',
			'type'        => 'boolean',
			'readonly'    => true,
		),
		'lifestyle_image' => array(
			'description' => 'Wide in-context image used on the product hero.',
			'type'        => array( 'object', 'null' ),
			'readonly'    => true,
		),
	);
}

/**
 * Register the extension on the Store API product schema. Data lands under
 * `extensions.spiritual_gifts` on /wp-json/wc/store/v1/products responses.
 */
add_action(
	'woocommerce_blocks_loaded',
	static function () {
		if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' ) ) {
			return;
		}

		$identifier = class_exists( '\Automattic\WooCommerce\StoreApi\Schemas\V1\ProductSchema' )
			? \Automattic\WooCommerce\StoreApi\Schemas\V1\ProductSchema::IDENTIFIER
			: 'product';

		woocommerce_store_api_register_endpoint_data(
			array(
				'endpoint'        => $identifier,
				'namespace'       => HEADLESS_STORE_API_NAMESPACE,
				'data_callback'   => 'headless_product_acf_data',
				'schema_callback' => 'headless_product_acf_schema',
				'schema_type'     => ARRAY_A,
			)
		);
	}
);

/**
 * A single call the storefront makes for chrome-level content: promo bar,
 * primary categories, and the shop hero. Saves three round trips per page.
 */
add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'headless/v1',
			'/shop-config',
			array(
				'methods'             => 'GET',
				'permission_callback' => '__return_true',
				'callback'            => static function () {
					$hero = array();
					$page = get_page_by_path( 'shop' );

					if ( $page && function_exists( 'get_fields' ) ) {
						$fields = get_fields( $page->ID ) ?: array();
						$hero   = array(
							'eyebrow'   => (string) ( $fields['sg_hero_eyebrow'] ?? '' ),
							'heading'   => (string) ( $fields['sg_hero_heading'] ?? '' ),
							'body'      => (string) ( $fields['sg_hero_body'] ?? '' ),
							'cta_label' => (string) ( $fields['sg_hero_cta_label'] ?? '' ),
							'cta_url'   => (string) ( $fields['sg_hero_cta_url'] ?? '' ),
							'promo'     => (string) ( $fields['sg_hero_promo'] ?? '' ),
							'image'     => is_array( $fields['sg_hero_image'] ?? null )
								? array(
									'url' => $fields['sg_hero_image']['url'] ?? '',
									'alt' => $fields['sg_hero_image']['alt'] ?? '',
								)
								: null,
						);
					}

					$categories = array();
					if ( taxonomy_exists( 'product_cat' ) ) {
						$terms = get_terms(
							array(
								'taxonomy'   => 'product_cat',
								'hide_empty' => true,
								'exclude'    => array( (int) get_option( 'default_product_cat', 0 ) ),
							)
						);

						if ( ! is_wp_error( $terms ) ) {
							$categories = array_map(
								static fn( $term ) => array(
									'id'    => $term->term_id,
									'name'  => $term->name,
									'slug'  => $term->slug,
									'count' => $term->count,
								),
								$terms
							);
						}
					}

					return rest_ensure_response(
						array(
							'hero'       => $hero,
							'categories' => $categories,
							'currency'   => array(
								'code'   => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'USD',
								'symbol' => function_exists( 'get_woocommerce_currency_symbol' ) ? html_entity_decode( get_woocommerce_currency_symbol() ) : '$',
							),
							'site'       => array(
								'name'        => get_bloginfo( 'name' ),
								'description' => get_bloginfo( 'description' ),
							),
						)
					);
				},
			)
		);
	}
);
