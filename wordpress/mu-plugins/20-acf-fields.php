<?php
/**
 * Plugin Name: Headless Shop — ACF Field Groups
 * Description: Registers ACF field groups in code so they are versioned with the repo.
 *
 * Only free-tier ACF field types are used (no Repeater/Gallery/Group/Options Page),
 * so this works with the free ACF plugin. See README for the ACF Pro variants.
 */

defined( 'ABSPATH' ) || exit;

add_action( 'acf/init', 'headless_register_acf_field_groups' );

function headless_register_acf_field_groups(): void {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		return;
	}

	/* ------------------------------------------------------------------
	 * Product enrichment — the editorial layer Woo does not model.
	 * ---------------------------------------------------------------- */
	acf_add_local_field_group(
		array(
			'key'                   => 'group_sg_product',
			'title'                 => 'Product Details',
			'show_in_rest'          => true,
			'location'              => array(
				array(
					array(
						'param'    => 'post_type',
						'operator' => '==',
						'value'    => 'product',
					),
				),
			),
			'menu_order'            => 0,
			'position'              => 'normal',
			'style'                 => 'default',
			'label_placement'       => 'top',
			'hide_on_screen'        => array(),
			'active'                => true,
			'description'           => 'Surfaced on the headless storefront via the Store API `extensions.spiritual_gifts` object.',
			'fields'                => array(
				array(
					'key'          => 'field_sg_badge',
					'label'        => 'Badge',
					'name'         => 'sg_badge',
					'type'         => 'text',
					'instructions' => 'Short flag shown on the product card, e.g. "Bestseller" or "New".',
					'maxlength'    => 24,
				),
				array(
					'key'          => 'field_sg_tagline',
					'label'        => 'Tagline',
					'name'         => 'sg_tagline',
					'type'         => 'text',
					'instructions' => 'One-line hook shown under the product title.',
					'maxlength'    => 120,
				),
				array(
					'key'           => 'field_sg_highlights',
					'label'         => 'Highlights',
					'name'          => 'sg_highlights',
					'type'          => 'textarea',
					'instructions'  => 'One bullet per line. Rendered as a feature list on the product page.',
					'rows'          => 5,
					'new_lines'     => '',
				),
				array(
					'key'          => 'field_sg_materials',
					'label'        => 'Materials',
					'name'         => 'sg_materials',
					'type'         => 'text',
					'instructions' => 'e.g. "Solid walnut, brass inlay".',
				),
				array(
					'key'          => 'field_sg_dimensions',
					'label'        => 'Dimensions',
					'name'         => 'sg_dimensions',
					'type'         => 'text',
					'instructions' => 'e.g. "8\" x 10\" x 1.5\"".',
				),
				array(
					'key'          => 'field_sg_care',
					'label'        => 'Care Instructions',
					'name'         => 'sg_care',
					'type'         => 'textarea',
					'rows'         => 3,
				),
				array(
					'key'          => 'field_sg_scripture',
					'label'        => 'Scripture Reference',
					'name'         => 'sg_scripture',
					'type'         => 'text',
					'instructions' => 'Optional verse associated with this piece, e.g. "1 Corinthians 12:4".',
				),
				array(
					'key'           => 'field_sg_lifestyle_image',
					'label'         => 'Lifestyle Image',
					'name'          => 'sg_lifestyle_image',
					'type'          => 'image',
					'return_format' => 'array',
					'preview_size'  => 'medium',
					'instructions'  => 'Wide in-context shot used on the product hero.',
				),
				array(
					'key'          => 'field_sg_shipping_note',
					'label'        => 'Shipping Note',
					'name'         => 'sg_shipping_note',
					'type'         => 'text',
					'instructions' => 'e.g. "Made to order — ships in 5–7 days".',
				),
				array(
					'key'           => 'field_sg_featured',
					'label'         => 'Feature on homepage',
					'name'          => 'sg_featured',
					'type'          => 'true_false',
					'ui'            => 1,
					'default_value' => 0,
				),
			),
		)
	);

	/* ------------------------------------------------------------------
	 * Shop hero — editable marketing content for the storefront landing page.
	 * Attached to the page with slug `shop` (created by the provision script).
	 * ---------------------------------------------------------------- */
	acf_add_local_field_group(
		array(
			'key'          => 'group_sg_shop_hero',
			'title'        => 'Shop Hero',
			'show_in_rest' => true,
			'location'     => array(
				array(
					array(
						'param'    => 'page',
						'operator' => '==',
						'value'    => 'shop',
					),
				),
			),
			'active'       => true,
			'description'  => 'Read by the storefront at /wp-json/wp/v2/pages?slug=shop.',
			'fields'       => array(
				array(
					'key'   => 'field_sg_hero_eyebrow',
					'label' => 'Eyebrow',
					'name'  => 'sg_hero_eyebrow',
					'type'  => 'text',
				),
				array(
					'key'   => 'field_sg_hero_heading',
					'label' => 'Heading',
					'name'  => 'sg_hero_heading',
					'type'  => 'text',
				),
				array(
					'key'   => 'field_sg_hero_body',
					'label' => 'Body',
					'name'  => 'sg_hero_body',
					'type'  => 'textarea',
					'rows'  => 3,
				),
				array(
					'key'   => 'field_sg_hero_cta_label',
					'label' => 'CTA Label',
					'name'  => 'sg_hero_cta_label',
					'type'  => 'text',
				),
				array(
					'key'   => 'field_sg_hero_cta_url',
					'label' => 'CTA URL',
					'name'  => 'sg_hero_cta_url',
					'type'  => 'text',
				),
				array(
					'key'           => 'field_sg_hero_image',
					'label'         => 'Hero Image',
					'name'          => 'sg_hero_image',
					'type'          => 'image',
					'return_format' => 'array',
				),
				array(
					'key'          => 'field_sg_hero_promo',
					'label'        => 'Promo Bar Text',
					'name'         => 'sg_hero_promo',
					'type'         => 'text',
					'instructions' => 'Shown in the sitewide announcement bar. Leave empty to hide it.',
				),
			),
		)
	);
}
