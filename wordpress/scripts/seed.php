<?php
/**
 * Seed the catalogue, ACF content, and the shop landing page.
 * Run via: wp eval-file /scripts/seed.php   (idempotent)
 */

if ( ! function_exists( 'wc_get_product' ) ) {
	WP_CLI::error( 'WooCommerce is not active.' );
}

/**
 * Generate a placeholder PNG with GD and attach it to the media library.
 * Keeps the seed fully offline — no external image downloads.
 */
function sg_seed_image( string $slug, string $title, array $from, array $to, int $w = 1200, int $h = 1200 ): int {
	$existing = get_posts(
		array(
			'post_type'      => 'attachment',
			'name'           => $slug,
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);
	if ( $existing ) {
		return (int) $existing[0];
	}

	$img = imagecreatetruecolor( $w, $h );

	// Diagonal gradient.
	for ( $y = 0; $y < $h; $y++ ) {
		for ( $x = 0; $x < $w; $x += 4 ) {
			$t = ( ( $x / $w ) * 0.45 ) + ( ( $y / $h ) * 0.55 );
			$r = (int) ( $from[0] + ( $to[0] - $from[0] ) * $t );
			$g = (int) ( $from[1] + ( $to[1] - $from[1] ) * $t );
			$b = (int) ( $from[2] + ( $to[2] - $from[2] ) * $t );
			$c = imagecolorallocate( $img, $r, $g, $b );
			imagefilledrectangle( $img, $x, $y, $x + 3, $y, $c );
		}
	}

	// Soft vignette ring to give the flat gradient some form.
	$ring = imagecolorallocatealpha( $img, 255, 255, 255, 105 );
	imagesetthickness( $img, 3 );
	imageellipse( $img, (int) ( $w / 2 ), (int) ( $h / 2 ), (int) ( $w * 0.62 ), (int) ( $h * 0.62 ), $ring );

	$label = strtoupper( substr( $title, 0, 1 ) );
	$white = imagecolorallocatealpha( $img, 255, 255, 255, 40 );
	imagestring( $img, 5, (int) ( $w / 2 ) - 4, (int) ( $h / 2 ) - 8, $label, $white );

	$uploads = wp_upload_dir();
	$file    = trailingslashit( $uploads['path'] ) . $slug . '.png';
	imagepng( $img, $file, 6 );
	imagedestroy( $img );

	$attachment_id = wp_insert_attachment(
		array(
			'post_mime_type' => 'image/png',
			'post_title'     => $title,
			'post_name'      => $slug,
			'post_status'    => 'inherit',
		),
		$file
	);

	require_once ABSPATH . 'wp-admin/includes/image.php';
	wp_update_attachment_metadata( $attachment_id, wp_generate_attachment_metadata( $attachment_id, $file ) );
	update_post_meta( $attachment_id, '_wp_attachment_image_alt', $title );

	return (int) $attachment_id;
}

/** Create a product_cat term if missing and return its id. */
function sg_seed_term( string $name, string $slug ): int {
	$term = get_term_by( 'slug', $slug, 'product_cat' );
	if ( $term ) {
		return (int) $term->term_id;
	}

	$created = wp_insert_term( $name, 'product_cat', array( 'slug' => $slug ) );

	return is_wp_error( $created ) ? 0 : (int) $created['term_id'];
}

$categories = array(
	'wall-art'   => sg_seed_term( 'Wall Art', 'wall-art' ),
	'journals'   => sg_seed_term( 'Journals', 'journals' ),
	'home'       => sg_seed_term( 'Home & Table', 'home' ),
	'keepsakes'  => sg_seed_term( 'Keepsakes', 'keepsakes' ),
);

$catalogue = array(
	array(
		'slug' => 'walnut-gifts-of-the-spirit-panel',
		'name' => 'Walnut "Gifts of the Spirit" Panel',
		'price' => '148.00',
		'sale'  => '',
		'cat'   => 'wall-art',
		'grad'  => array( array( 92, 64, 51 ), array( 191, 149, 111 ) ),
		'short' => 'A hand-finished walnut panel, laser-engraved with the seven gifts.',
		'desc'  => 'Cut from a single board of North American black walnut and finished with a hardwax oil that deepens with age. Each panel is engraved to a depth of 1.2mm so the lettering holds a shadow line at every hour of the day.',
		'acf'   => array(
			'sg_badge'      => 'Bestseller',
			'sg_tagline'    => 'Solid walnut, engraved to hold a shadow line.',
			'sg_highlights' => "Single-board North American black walnut\nHardwax oil finish, no polyurethane\nFrench cleat included for flush mounting\nSigned and dated on the reverse",
			'sg_materials'  => 'Solid black walnut, brass hanging hardware',
			'sg_dimensions' => '18" x 12" x 1"',
			'sg_care'       => 'Dust with a dry cloth. Re-oil once a year with any hardwax product.',
			'sg_scripture'  => '1 Corinthians 12:4–11',
			'sg_shipping_note' => 'Made to order — ships in 5–7 days',
			'sg_featured'   => true,
		),
	),
	array(
		'slug' => 'linen-bound-prayer-journal',
		'name' => 'Linen-Bound Prayer Journal',
		'price' => '42.00',
		'sale'  => '34.00',
		'cat'   => 'journals',
		'grad'  => array( array( 70, 84, 105 ), array( 158, 173, 191 ) ),
		'short' => 'Smyth-sewn, lies flat, 192 pages of 100gsm cream stock.',
		'desc'  => 'Bound by hand in Belgian linen over board. The Smyth-sewn signatures let the book lie completely flat, which matters more than anything else when you are writing in it every morning.',
		'acf'   => array(
			'sg_badge'      => '',
			'sg_tagline'    => 'Lies completely flat, because that is the whole point.',
			'sg_highlights' => "Belgian linen over board\n192 pages of 100gsm cream stock\nSmyth-sewn to lie flat\nRibbon marker and back pocket",
			'sg_materials'  => 'Belgian linen, cotton ribbon, acid-free paper',
			'sg_dimensions' => '8.25" x 5.75"',
			'sg_care'       => 'Keep dry. Spot-clean the linen with a barely damp cloth.',
			'sg_scripture'  => 'Philippians 4:6',
			'sg_shipping_note' => 'In stock — ships next business day',
			'sg_featured'   => true,
		),
	),
	array(
		'slug' => 'stoneware-communion-set',
		'name' => 'Stoneware Communion Set',
		'price' => '210.00',
		'sale'  => '',
		'cat'   => 'home',
		'grad'  => array( array( 120, 113, 108 ), array( 214, 211, 205 ) ),
		'short' => 'Wheel-thrown chalice and paten in a matte oatmeal glaze.',
		'desc'  => 'Thrown on the wheel in small batches and fired to cone 6. The oatmeal glaze is food-safe, lead-free, and slightly variable from piece to piece — no two sets match exactly.',
		'acf'   => array(
			'sg_badge'      => 'Small batch',
			'sg_tagline'    => 'Wheel-thrown, cone 6, no two sets alike.',
			'sg_highlights' => "Wheel-thrown stoneware\nFood-safe, lead-free matte glaze\nChalice holds 8oz\nDishwasher safe",
			'sg_materials'  => 'Stoneware clay, matte oatmeal glaze',
			'sg_dimensions' => 'Chalice 6" tall; paten 7" diameter',
			'sg_care'       => 'Dishwasher safe. Avoid thermal shock — no freezer to oven.',
			'sg_scripture'  => 'Luke 22:19',
			'sg_shipping_note' => 'Packed in double-walled cartons — ships in 3–5 days',
			'sg_featured'   => true,
		),
	),
	array(
		'slug' => 'brass-scripture-bookmark',
		'name' => 'Brass Scripture Bookmark',
		'price' => '28.00',
		'sale'  => '',
		'cat'   => 'keepsakes',
		'grad'  => array( array( 146, 109, 39 ), array( 226, 195, 122 ) ),
		'short' => 'Etched solid brass that takes on a patina with handling.',
		'desc'  => 'Photo-etched from 0.5mm solid brass, then hand-deburred. It arrives bright and darkens where your fingers land, which is the intended behaviour rather than a defect.',
		'acf'   => array(
			'sg_badge'      => '',
			'sg_tagline'    => 'Arrives bright. Darkens where your fingers land.',
			'sg_highlights' => "0.5mm solid brass, photo-etched\nHand-deburred edges\nDevelops a personal patina\nArrives in a kraft sleeve",
			'sg_materials'  => 'Solid brass',
			'sg_dimensions' => '5.5" x 1.1"',
			'sg_care'       => 'Leave it alone to patinate, or polish with a brass cloth to reset it.',
			'sg_scripture'  => 'Psalm 119:105',
			'sg_shipping_note' => 'In stock — ships next business day',
			'sg_featured'   => false,
		),
	),
	array(
		'slug' => 'olive-wood-prayer-box',
		'name' => 'Olive Wood Prayer Box',
		'price' => '96.00',
		'sale'  => '',
		'cat'   => 'keepsakes',
		'grad'  => array( array( 104, 100, 62 ), array( 195, 186, 140 ) ),
		'short' => 'Bethlehem olive wood with a brass-pinned lid.',
		'desc'  => 'Turned from Bethlehem olive wood, a byproduct of orchard pruning rather than felled trees. The grain is unrepeatable; the box you receive will not look like the photograph.',
		'acf'   => array(
			'sg_badge'      => 'Limited',
			'sg_tagline'    => 'The grain is unrepeatable. Yours will not match the photo.',
			'sg_highlights' => "Bethlehem olive wood from orchard prunings\nBrass-pinned hinge\nFelt-lined interior\nHolds folded 3\" x 3\" notes",
			'sg_materials'  => 'Olive wood, brass, wool felt',
			'sg_dimensions' => '4.5" x 3.5" x 2.5"',
			'sg_care'       => 'Keep out of direct sun. Wipe with olive oil if the wood looks dry.',
			'sg_scripture'  => 'Matthew 6:6',
			'sg_shipping_note' => 'Limited stock — ships in 2–4 days',
			'sg_featured'   => false,
		),
	),
	array(
		'slug' => 'letterpress-psalms-print-set',
		'name' => 'Letterpress Psalms Print Set',
		'price' => '64.00',
		'sale'  => '52.00',
		'cat'   => 'wall-art',
		'grad'  => array( array( 61, 78, 72 ), array( 156, 180, 166 ) ),
		'short' => 'Three prints, hand-set and pulled on a Vandercook.',
		'desc'  => 'Hand-set in Caslon and pulled one colour at a time on a Vandercook proof press. The impression is deep enough to read with your fingertips.',
		'acf'   => array(
			'sg_badge'      => '',
			'sg_tagline'    => 'Deep enough to read with your fingertips.',
			'sg_highlights' => "Hand-set Caslon, pulled on a Vandercook\nSet of three 8\" x 10\" prints\n300gsm cotton rag, deckled edge\nEdition of 150, numbered in pencil",
			'sg_materials'  => '300gsm cotton rag paper, soy-based ink',
			'sg_dimensions' => '8" x 10" each, unframed',
			'sg_care'       => 'Frame behind UV glass to keep the ink from shifting.',
			'sg_scripture'  => 'Psalm 23',
			'sg_shipping_note' => 'Ships flat in a rigid mailer — 3–5 days',
			'sg_featured'   => false,
		),
	),
	array(
		'slug' => 'beeswax-vespers-candles',
		'name' => 'Beeswax Vespers Candles',
		'price' => '36.00',
		'sale'  => '',
		'cat'   => 'home',
		'grad'  => array( array( 156, 122, 47 ), array( 240, 219, 165 ) ),
		'short' => 'Six pure beeswax tapers, four-hour burn each.',
		'desc'  => 'Poured from 100% American beeswax with a braided cotton wick. Beeswax burns slower and brighter than paraffin and does not throw soot onto the wall behind it.',
		'acf'   => array(
			'sg_badge'      => '',
			'sg_tagline'    => 'Burns slower, brighter, and without soot.',
			'sg_highlights' => "100% American beeswax\nBraided cotton wick, no lead core\nSet of six 8\" tapers\nApprox. four-hour burn each",
			'sg_materials'  => 'Pure beeswax, cotton wick',
			'sg_dimensions' => '8" tall, 0.75" base',
			'sg_care'       => 'Trim the wick to 1/4" before each burn.',
			'sg_scripture'  => 'Matthew 5:16',
			'sg_shipping_note' => 'In stock — ships next business day',
			'sg_featured'   => false,
		),
	),
	array(
		'slug' => 'daily-office-desk-diary',
		'name' => 'Daily Office Desk Diary',
		'price' => '58.00',
		'sale'  => '',
		'cat'   => 'journals',
		'grad'  => array( array( 82, 60, 78 ), array( 178, 155, 175 ) ),
		'short' => 'A dated year of morning and evening prayer, two pages per day.',
		'desc'  => 'A full dated year laid out two pages to a day, with the morning and evening offices printed in the margin so you are not flipping between books.',
		'acf'   => array(
			'sg_badge'      => 'New',
			'sg_tagline'    => 'The offices in the margin, so you stop flipping between books.',
			'sg_highlights' => "Two pages per dated day\nMorning and evening offices printed in the margin\nLay-flat binding\n90gsm bleed-resistant paper",
			'sg_materials'  => 'Board cover, cloth spine, acid-free paper',
			'sg_dimensions' => '9" x 6.5"',
			'sg_care'       => 'Keep dry.',
			'sg_scripture'  => 'Psalm 55:17',
			'sg_shipping_note' => 'In stock — ships next business day',
			'sg_featured'   => true,
		),
	),
);

$created = 0;
$updated = 0;

foreach ( $catalogue as $entry ) {
	$existing_id = 0;
	$found       = get_posts(
		array(
			'post_type'      => 'product',
			'name'           => $entry['slug'],
			'post_status'    => 'any',
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);
	if ( $found ) {
		$existing_id = (int) $found[0];
	}

	$product = $existing_id ? wc_get_product( $existing_id ) : new WC_Product_Simple();

	$product->set_name( $entry['name'] );
	$product->set_slug( $entry['slug'] );
	$product->set_status( 'publish' );
	$product->set_catalog_visibility( 'visible' );
	$product->set_description( $entry['desc'] );
	$product->set_short_description( $entry['short'] );
	$product->set_regular_price( $entry['price'] );
	$product->set_sale_price( $entry['sale'] );
	$product->set_manage_stock( true );
	$product->set_stock_quantity( 25 );
	$product->set_stock_status( 'instock' );
	$product->set_weight( '2' );
	$product->set_category_ids( array_filter( array( $categories[ $entry['cat'] ] ) ) );
	$product->set_featured( (bool) $entry['acf']['sg_featured'] );

	$image_id = sg_seed_image(
		$entry['slug'] . '-image',
		$entry['name'],
		$entry['grad'][0],
		$entry['grad'][1]
	);
	$product->set_image_id( $image_id );

	$lifestyle_id = sg_seed_image(
		$entry['slug'] . '-lifestyle',
		$entry['name'] . ' in context',
		$entry['grad'][1],
		$entry['grad'][0],
		1600,
		900
	);
	$product->set_gallery_image_ids( array( $lifestyle_id ) );

	$product_id = $product->save();
	$existing_id ? $updated++ : $created++;

	if ( function_exists( 'update_field' ) ) {
		foreach ( $entry['acf'] as $field => $value ) {
			update_field( $field, $value, $product_id );
		}
		update_field( 'sg_lifestyle_image', $lifestyle_id, $product_id );
	}
}

/* -------------------------------------------------------------------------
 * Shop landing page + its ACF hero content.
 * ---------------------------------------------------------------------- */
$shop_page = get_page_by_path( 'shop' );
if ( ! $shop_page ) {
	$shop_page_id = wp_insert_post(
		array(
			'post_type'    => 'page',
			'post_name'    => 'shop',
			'post_title'   => 'Shop',
			'post_status'  => 'publish',
			'post_content' => '',
		)
	);
} else {
	$shop_page_id = $shop_page->ID;
}

if ( function_exists( 'update_field' ) && $shop_page_id ) {
	$hero_image = sg_seed_image( 'sg-shop-hero', 'Shop hero', array( 44, 42, 56 ), array( 168, 148, 122 ), 2000, 1100 );

	update_field( 'sg_hero_eyebrow', 'Made slowly, in small numbers', $shop_page_id );
	update_field( 'sg_hero_heading', 'Objects for a practised faith', $shop_page_id );
	update_field( 'sg_hero_body', 'Wood, brass, linen and clay, worked by hand and built to outlast the people who buy them. Nothing here is printed on demand.', $shop_page_id );
	update_field( 'sg_hero_cta_label', 'Browse the collection', $shop_page_id );
	update_field( 'sg_hero_cta_url', '/products', $shop_page_id );
	update_field( 'sg_hero_promo', 'Free shipping on orders over $75', $shop_page_id );
	update_field( 'sg_hero_image', $hero_image, $shop_page_id );
}

WP_CLI::success( sprintf( 'Seeded catalogue: %d created, %d updated. Shop page id %d.', $created, $updated, $shop_page_id ) );
