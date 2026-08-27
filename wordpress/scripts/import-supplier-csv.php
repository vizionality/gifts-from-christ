<?php
/**
 * Import a supplier catalogue (e.g. a Kerusso wholesale export) as WooCommerce
 * products that are listed but NOT in stock — the painted-door demand test.
 *
 *   wp eval-file /scripts/import-supplier-csv.php /scripts/kerusso.csv kerusso
 *
 * Idempotent: matches on SKU, so re-running updates rather than duplicates.
 *
 * Column names are matched loosely because supplier exports never agree on
 * them. Recognised aliases are listed in COLUMN_ALIASES below.
 */

if ( ! function_exists( 'wc_get_product' ) ) {
	WP_CLI::error( 'WooCommerce is not active.' );
}

$csv_path = $args[0] ?? '';
$supplier = $args[1] ?? 'supplier';

if ( ! $csv_path || ! file_exists( $csv_path ) ) {
	WP_CLI::error( "CSV not found: {$csv_path}" );
}

const COLUMN_ALIASES = array(
	'sku'         => array( 'sku', 'item', 'item_number', 'itemnumber', 'style', 'style_number', 'product_code' ),
	'name'        => array( 'name', 'title', 'product_name', 'description_short', 'item_name' ),
	'description' => array( 'description', 'long_description', 'details', 'body' ),
	'price'       => array( 'msrp', 'retail', 'retail_price', 'price', 'suggested_retail' ),
	'cost'        => array( 'wholesale', 'wholesale_price', 'cost', 'your_price', 'unit_cost' ),
	'category'    => array( 'category', 'department', 'product_category', 'class' ),
	'image'       => array( 'image', 'image_url', 'imageurl', 'image_link', 'primary_image' ),
	'brand'       => array( 'brand', 'manufacturer', 'vendor' ),
	'stock'       => array( 'stock', 'quantity', 'qty', 'units', 'on_hand', 'inventory', 'stock_quantity' ),
	'ships'       => array( 'ships', 'shipping_note', 'availability', 'lead_time' ),
);

/** Normalise a header cell so "Item Number" and "item_number" both match. */
function sg_norm( string $value ): string {
	return preg_replace( '/[^a-z0-9]+/', '_', strtolower( trim( $value ) ) ) ?? '';
}

$handle = fopen( $csv_path, 'r' );
if ( ! $handle ) {
	WP_CLI::error( "Could not open {$csv_path}" );
}

$header = fgetcsv( $handle );
if ( ! $header ) {
	WP_CLI::error( 'CSV appears to be empty.' );
}

// Map our canonical field names onto whichever columns this export uses.
$normalised = array_map( 'sg_norm', $header );
$index      = array();
foreach ( COLUMN_ALIASES as $field => $aliases ) {
	foreach ( $aliases as $alias ) {
		$position = array_search( $alias, $normalised, true );
		if ( false !== $position ) {
			$index[ $field ] = $position;
			break;
		}
	}
}

foreach ( array( 'sku', 'name', 'price' ) as $required ) {
	if ( ! isset( $index[ $required ] ) ) {
		WP_CLI::error(
			sprintf(
				'No column matched "%s". Found: %s',
				$required,
				implode( ', ', $normalised )
			)
		);
	}
}

WP_CLI::log( 'Column map: ' . wp_json_encode( $index ) );

$value_of = static function ( array $row, string $field ) use ( $index ) {
	return isset( $index[ $field ] ) ? trim( (string) ( $row[ $index[ $field ] ] ?? '' ) ) : '';
};

$created     = 0;
$updated     = 0;
$skipped     = 0;
$in_stock    = 0;
$demand_test = 0;

while ( ( $row = fgetcsv( $handle ) ) !== false ) {
	$sku  = $value_of( $row, 'sku' );
	$name = $value_of( $row, 'name' );

	if ( '' === $sku || '' === $name ) {
		++$skipped;
		continue;
	}

	$existing_id = wc_get_product_id_by_sku( $sku );
	$product     = $existing_id ? wc_get_product( $existing_id ) : new WC_Product_Simple();

	$product->set_name( $name );
	$product->set_sku( $sku );
	$product->set_status( 'publish' );
	$product->set_catalog_visibility( 'visible' );

	$description = $value_of( $row, 'description' );
	if ( '' !== $description ) {
		$product->set_description( $description );
	}

	$price = preg_replace( '/[^0-9.]/', '', $value_of( $row, 'price' ) );
	if ( '' !== $price ) {
		$product->set_regular_price( $price );
	}

	/*
	 * Stock drives the whole model, so it is read from the data rather than a
	 * flag: one CSV can carry stocked lines and demand-test lines together.
	 *
	 * With a quantity: real inventory. Stock management on, so Woo decrements
	 * on each sale and takes the line out of stock when it runs out — which is
	 * what makes "ships today" an honest claim rather than a hopeful one.
	 *
	 * Without one: listed, priced and visible but not purchasable. Management
	 * stays off so Woo does not read the zero as a temporary dip that
	 * backorders could satisfy.
	 */
	$stock_raw = $value_of( $row, 'stock' );
	$stocked   = ( '' !== $stock_raw && is_numeric( $stock_raw ) && (int) $stock_raw > 0 );

	$product->set_backorders( 'no' );

	if ( $stocked ) {
		$quantity = (int) $stock_raw;
		$product->set_manage_stock( true );
		$product->set_stock_quantity( $quantity );
		$product->set_stock_status( 'instock' );
		// Surfaces "Only N left" on the product page once it gets low. Honest
		// urgency: it only appears when the number is real.
		$product->set_low_stock_amount( min( 3, $quantity ) );
	} else {
		$product->set_manage_stock( false );
		$product->set_stock_status( 'outofstock' );
	}

	$category = $value_of( $row, 'category' );
	if ( '' !== $category ) {
		$term = term_exists( $category, 'product_cat' );
		if ( ! $term ) {
			$term = wp_insert_term( $category, 'product_cat' );
		}
		if ( ! is_wp_error( $term ) ) {
			$product->set_category_ids( array( (int) $term['term_id'] ) );
		}
	}

	$product_id = $product->save();

	if ( $stocked ) {
		++$in_stock;
	} else {
		++$demand_test;
	}

	/*
	 * The delivery promise is the competitive argument, so give stocked lines
	 * one by default. Only ever set when empty, so an edit in wp-admin sticks.
	 */
	if ( function_exists( 'update_field' ) ) {
		$note = $value_of( $row, 'ships' );
		if ( '' === $note && $stocked ) {
			$note = 'In stock — ships next business day';
		}
		if ( '' !== $note && '' === (string) get_field( 'sg_shipping_note', $product_id ) ) {
			update_field( 'sg_shipping_note', $note, $product_id );
		}
	}

	// Kept for margin maths later; never exposed through the Store API.
	update_post_meta( $product_id, '_sg_supplier', $supplier );
	$cost = preg_replace( '/[^0-9.]/', '', $value_of( $row, 'cost' ) );
	if ( '' !== $cost ) {
		update_post_meta( $product_id, '_sg_wholesale_cost', $cost );
	}
	$brand = $value_of( $row, 'brand' );
	if ( '' !== $brand ) {
		update_post_meta( $product_id, '_sg_brand', $brand );
	}

	// Sideload the supplier image once; re-runs keep the existing attachment.
	$image_url = $value_of( $row, 'image' );
	if ( '' !== $image_url && ! $product->get_image_id() ) {
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$attachment_id = media_sideload_image( $image_url, $product_id, $name, 'id' );
		if ( ! is_wp_error( $attachment_id ) ) {
			$product->set_image_id( $attachment_id );
			$product->save();
		} else {
			WP_CLI::warning( "Image failed for {$sku}: " . $attachment_id->get_error_message() );
		}
	}

	$existing_id ? $updated++ : $created++;
}

fclose( $handle );

WP_CLI::success(
	sprintf(
		'%s import complete: %d created, %d updated, %d skipped. %d stocked, %d listed for demand testing.',
		$supplier,
		$created,
		$updated,
		$skipped,
		$in_stock,
		$demand_test
	)
);
