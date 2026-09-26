<?php
/**
 * Idempotent seed script: "Classic Lactation Cookies" variable product on sandybrown.
 *
 * @package SGS\Sites\MamasMunches
 *
 * Model (owner-approved):
 *   - ONE variable product, slug classic-lactation-cookies.
 *   - pa_number-in-pack is the ONLY attribute used for variations (4 variations: 8/12/20/40).
 *   - pa_flavour, pa_topping, pa_dietary attach as visible product attributes, NOT used for variations.
 *   - pa_flavour already exists globally on this site (product 540 uses it) — reuse it and its
 *     existing "chocolate" term; only "Classic Oat" is new.
 *   - Product 513 (Zookies line draft, slug lactation-cookies) and pa_size are left completely
 *     untouched by this script.
 *
 * Run via: wp eval-file seed-lactation-cookies.php
 */

// phpcs:disable WordPress.WP.AlternativeFunctions.file_system_operations_fwrite, WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI-only seed script run via `wp eval-file`; STDERR/STDOUT text, not a WordPress request response, so WP_Filesystem and output escaping do not apply.
if ( ! defined( 'ABSPATH' ) ) {
	fwrite( STDERR, "This script must be run via wp-cli (wp eval-file).\n" );
	exit( 1 );
}

if ( ! class_exists( 'WooCommerce' ) ) {
	fwrite( STDERR, "WooCommerce is not active.\n" );
	exit( 1 );
}

const SEED_SLUG = 'classic-lactation-cookies';

// -----------------------------------------------------------------------
// Idempotency guard — stop if the product already exists.
// -----------------------------------------------------------------------
$existing = get_page_by_path( SEED_SLUG, OBJECT, 'product' );
if ( $existing ) {
	echo "ALREADY EXISTS: product ID {$existing->ID}, status {$existing->post_status}. Nothing changed.\n";
	exit( 0 );
}

/**
 * Get an existing global attribute taxonomy id by short name, or create it.
 *
 * @param string $name  Short attribute name (no pa_ prefix), e.g. 'number-in-pack'.
 * @param string $label Attribute label, e.g. 'Number in Pack'.
 * @return int Attribute taxonomy id.
 */
function seed_get_or_create_attribute( string $name, string $label ): int {
	$attribute_id = wc_attribute_taxonomy_id_by_name( $name );

	if ( ! $attribute_id ) {
		$new_id = wc_create_attribute(
			array(
				'name'         => $label,
				'slug'         => $name,
				'type'         => 'select',
				'order_by'     => 'menu_order',
				'has_archives' => false,
			)
		);

		if ( is_wp_error( $new_id ) ) {
			fwrite( STDERR, 'Failed to create attribute ' . $name . ': ' . $new_id->get_error_message() . "\n" );
			exit( 1 );
		}

		$attribute_id = (int) $new_id;
	}

	// A pa_* taxonomy created (this run or a previous one) after 'init' already ran
	// is not a registered WP taxonomy in THIS request, so wp_insert_term() and
	// WC_Product_Attribute below would fail with "Invalid taxonomy". Register it
	// directly on every call, mirroring WC_Post_Types::register_taxonomies().
	$taxonomy_name = wc_attribute_taxonomy_name( $name );
	if ( ! taxonomy_exists( $taxonomy_name ) ) {
		register_taxonomy(
			$taxonomy_name,
			apply_filters( 'woocommerce_taxonomy_objects_' . $taxonomy_name, array( 'product' ) ),
			apply_filters(
				'woocommerce_taxonomy_args_' . $taxonomy_name,
				array(
					'labels'       => array( 'name' => $label ),
					'hierarchical' => false,
					'show_ui'      => false,
					'query_var'    => true,
					'rewrite'      => false,
				)
			)
		);
	}

	return (int) $attribute_id;
}

/**
 * Get an existing term by name (case-insensitive) on a taxonomy, or insert it.
 *
 * @param string $taxonomy Full taxonomy name, e.g. 'pa_flavour'.
 * @param string $name     Term display name, e.g. 'Classic Oat'.
 * @return int Term id.
 */
function seed_get_or_create_term( string $taxonomy, string $name ): int {
	$existing_terms = get_terms(
		array(
			'taxonomy'   => $taxonomy,
			'hide_empty' => false,
		)
	);

	if ( ! is_wp_error( $existing_terms ) ) {
		foreach ( $existing_terms as $term ) {
			if ( strcasecmp( $term->name, $name ) === 0 ) {
				return (int) $term->term_id;
			}
		}
	}

	$inserted = wp_insert_term( $name, $taxonomy );
	if ( is_wp_error( $inserted ) ) {
		fwrite( STDERR, "Failed to insert term '{$name}' on {$taxonomy}: " . $inserted->get_error_message() . "\n" );
		exit( 1 );
	}

	return (int) $inserted['term_id'];
}

// -----------------------------------------------------------------------
// 1. Attributes: pa_number-in-pack, pa_topping, pa_dietary are created if missing.
// pa_flavour is reused as-is (never created/modified here). pa_size is never touched.
// -----------------------------------------------------------------------
$pack_attr_id    = seed_get_or_create_attribute( 'number-in-pack', 'Number in Pack' );
$topping_attr_id = seed_get_or_create_attribute( 'topping', 'Topping' );
$dietary_attr_id = seed_get_or_create_attribute( 'dietary', 'Dietary Requirements' );

$flavour_attr_id = wc_attribute_taxonomy_id_by_name( 'flavour' );
if ( ! $flavour_attr_id ) {
	fwrite( STDERR, "pa_flavour was expected to already exist globally but was not found. Aborting without changes.\n" );
	exit( 1 );
}

// -----------------------------------------------------------------------
// 2. Terms.
// -----------------------------------------------------------------------
$pack_terms = array(
	'8'  => seed_get_or_create_term( 'pa_number-in-pack', '8' ),
	'20' => seed_get_or_create_term( 'pa_number-in-pack', '20' ),
	'40' => seed_get_or_create_term( 'pa_number-in-pack', '40' ),
);

$flavour_terms = array(
	'classic-oat' => seed_get_or_create_term( 'pa_flavour', 'Classic Oat' ),
	'chocolate'   => seed_get_or_create_term( 'pa_flavour', 'Chocolate' ), // Reuses the existing pa_flavour term.
);

$topping_terms = array(
	'chocolate-chip'       => seed_get_or_create_term( 'pa_topping', 'Chocolate Chip' ),
	'white-chocolate-chip' => seed_get_or_create_term( 'pa_topping', 'White Chocolate Chip' ),
	'no-topping'           => seed_get_or_create_term( 'pa_topping', 'No Topping' ),
);

$dietary_terms = array(
	'regular' => seed_get_or_create_term( 'pa_dietary', 'Regular' ),
	'vegan'   => seed_get_or_create_term( 'pa_dietary', 'Vegan' ),
);

// -----------------------------------------------------------------------
// 3. The parent variable product.
// -----------------------------------------------------------------------
$product = new WC_Product_Variable();
$product->set_name( 'Classic Lactation Cookies' );
$product->set_slug( SEED_SLUG );
$product->set_status( 'publish' );
$product->set_catalog_visibility( 'visible' );
$product->set_manage_stock( false );
$product->set_stock_status( 'instock' );

$attributes = array();

$pack_attribute = new WC_Product_Attribute();
$pack_attribute->set_id( $pack_attr_id );
$pack_attribute->set_name( 'pa_number-in-pack' );
$pack_attribute->set_options( array_values( $pack_terms ) );
$pack_attribute->set_position( 0 );
$pack_attribute->set_visible( true );
$pack_attribute->set_variation( true );
$attributes[] = $pack_attribute;

$flavour_attribute = new WC_Product_Attribute();
$flavour_attribute->set_id( $flavour_attr_id );
$flavour_attribute->set_name( 'pa_flavour' );
$flavour_attribute->set_options( array_values( $flavour_terms ) );
$flavour_attribute->set_position( 1 );
$flavour_attribute->set_visible( true );
$flavour_attribute->set_variation( false );
$attributes[] = $flavour_attribute;

$topping_attribute = new WC_Product_Attribute();
$topping_attribute->set_id( $topping_attr_id );
$topping_attribute->set_name( 'pa_topping' );
$topping_attribute->set_options( array_values( $topping_terms ) );
$topping_attribute->set_position( 2 );
$topping_attribute->set_visible( true );
$topping_attribute->set_variation( false );
$attributes[] = $topping_attribute;

$dietary_attribute = new WC_Product_Attribute();
$dietary_attribute->set_id( $dietary_attr_id );
$dietary_attribute->set_name( 'pa_dietary' );
$dietary_attribute->set_options( array_values( $dietary_terms ) );
$dietary_attribute->set_position( 3 );
$dietary_attribute->set_visible( true );
$dietary_attribute->set_variation( false );
$attributes[] = $dietary_attribute;

$product->set_attributes( $attributes );

// Default attribute: 8-pack. Default attributes are keyed by taxonomy name
// (no pa_ prefix) and valued by term SLUG.
$eight_term = get_term( $pack_terms['8'], 'pa_number-in-pack' );
$product->set_default_attributes(
	array(
		'number-in-pack' => $eight_term->slug,
	)
);

$product_id = $product->save();

// -----------------------------------------------------------------------
// 4. Variations — one per pack size, priced per the brief.
// -----------------------------------------------------------------------
$pack_prices = array(
	'8'  => '9.50',
	'20' => '21.50',
	'40' => '38.00',
);

$variation_ids = array();

foreach ( $pack_prices as $pack => $price ) {
	$pack_term = get_term( $pack_terms[ $pack ], 'pa_number-in-pack' );

	$variation = new WC_Product_Variation();
	$variation->set_parent_id( $product_id );
	// Variation attribute keys need the FULL taxonomy name (pa_ prefix), unlike
	// the parent's default_attributes which use the short name — proven live:
	// 'number-in-pack' => slug saved an unmatched attribute_number-in-pack meta key.
	$variation->set_attributes( array( 'pa_number-in-pack' => $pack_term->slug ) );
	$variation->set_regular_price( $price );
	$variation->set_manage_stock( false );
	$variation->set_stock_status( 'instock' );
	$variation->set_status( 'publish' );
	$variation_id = $variation->save();

	$variation_ids[ $pack ] = $variation_id;
}

// Resync parent price ranges etc. from the variations just created.
WC_Product_Variable::sync( $product_id );

wc_delete_product_transients( $product_id );

echo "PRODUCT_ID={$product_id}\n";
foreach ( $variation_ids as $pack => $vid ) {
	echo "VARIATION pack={$pack} id={$vid} price={$pack_prices[ $pack ]}\n";
}
