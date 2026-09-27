<?php
/**
 * Eye Care shop facets the draft filters on, from data.json (safe to re-run):
 * - Gender (pa_gender): Women, Men; a Unisex frame carries both, so the shop's
 *   one-choice Gender filter shows it under either, as the draft does.
 * - Size (pa_size): Small (eye ≤ 52mm), Medium (≤ 57), Large, the draft's bands.
 * - menu_order: the draft's PRODUCTS order, which is its "Featured" order.
 * - Colour (pa_colour) and Style (pa_shape) term order: the draft's swatch and chip
 *   orders (Black, Havana, Gold, ...; Pilot, Wayfarer, Square, ...), each attribute
 *   sorted by that custom order.
 * Both attributes are filters only: not variations, not shown on the product page.
 *
 * Run: wp eval-file seed-facets.php data.json --user=Claude
 *
 * @package SGS\EyeCare
 */

defined( 'ABSPATH' ) || exit;

$data_path = $args[0] ?? '';
if ( ! is_readable( $data_path ) ) {
	WP_CLI::error( 'Pass the path to data.json.' );
}
$data = json_decode( (string) file_get_contents( $data_path ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local seed file.

/**
 * The global attribute's taxonomy, created on first run.
 *
 * @param string $label Attribute name.
 * @param string $slug  Attribute slug without pa_.
 * @return string Taxonomy name.
 */
function sgs_facets_attribute( string $label, string $slug ): string {
	$taxonomy = 'pa_' . $slug;
	if ( ! wc_attribute_taxonomy_id_by_name( $taxonomy ) ) {
		$id = wc_create_attribute(
			array(
				'name'         => $label,
				'slug'         => $slug,
				'type'         => 'select',
				'order_by'     => 'menu_order',
				'has_archives' => false,
			)
		);
		if ( is_wp_error( $id ) ) {
			WP_CLI::error( $id->get_error_message() );
		}
		register_taxonomy( $taxonomy, array( 'product' ), array( 'hierarchical' => false ) );
		WP_CLI::log( "created attribute $taxonomy" );
	}
	return $taxonomy;
}

/**
 * The term's ID, created on first run, in the given menu order.
 *
 * @param string $name     Term name.
 * @param string $taxonomy Attribute taxonomy.
 * @param int    $order    Position in the attribute's term order.
 * @return int Term ID.
 */
function sgs_facets_term( string $name, string $taxonomy, int $order ): int {
	$term = get_term_by( 'name', $name, $taxonomy );
	$id   = $term ? (int) $term->term_id : (int) ( wp_insert_term( $name, $taxonomy )['term_id'] ?? 0 );
	update_term_meta( $id, 'order', $order );
	return $id;
}

$gender = sgs_facets_attribute( 'Gender', 'gender' );
$size   = sgs_facets_attribute( 'Size', 'size' );
$terms  = array(
	$gender => array(
		'Women' => sgs_facets_term( 'Women', $gender, 0 ),
		'Men'   => sgs_facets_term( 'Men', $gender, 1 ),
	),
	$size   => array(
		'Small'  => sgs_facets_term( 'Small', $size, 0 ),
		'Medium' => sgs_facets_term( 'Medium', $size, 1 ),
		'Large'  => sgs_facets_term( 'Large', $size, 2 ),
	),
);

/**
 * Sorts a global attribute by its custom term order and puts its terms in the given order.
 *
 * @param string   $slug  Attribute slug without pa_.
 * @param string[] $names Term names in order.
 * @return void
 */
function sgs_facets_order_terms( string $slug, array $names ): void {
	$id = wc_attribute_taxonomy_id_by_name( 'pa_' . $slug );
	if ( ! $id ) {
		WP_CLI::warning( "no attribute $slug" );
		return;
	}
	$attribute = wc_get_attribute( $id );
	if ( $attribute && 'menu_order' !== $attribute->order_by ) {
		wc_update_attribute(
			$id,
			array(
				'name'         => $attribute->name,
				'slug'         => $slug,
				'type'         => $attribute->type,
				'order_by'     => 'menu_order',
				'has_archives' => $attribute->has_archives,
			)
		);
	}
	foreach ( $names as $position => $name ) {
		$term = get_term_by( 'name', $name, 'pa_' . $slug );
		if ( $term ) {
			update_term_meta( $term->term_id, 'order', $position );
		} else {
			WP_CLI::warning( "no $slug term $name" );
		}
	}
	WP_CLI::log( "$slug terms ordered" );
}

// The draft's swatch and style chip orders; the shop's Colour and Style filters list terms in them.
sgs_facets_order_terms( 'colour', array( 'Black', 'Havana', 'Gold', 'Tortoise', 'Gunmetal', 'Ivory', 'Rose gold', 'Silver', 'Navy', 'Crystal', 'Brown', 'Red' ) );
sgs_facets_order_terms( 'shape', array( 'Pilot', 'Wayfarer', 'Square', 'Rectangle', 'Round', 'Oval', 'Cat-eye', 'Butterfly', 'Browline', 'Geometric', 'Shield', 'Oversized' ) );

foreach ( $data['PRODUCTS'] as $index => $p ) {
	// The same SKU rule as seed.php::sgs_seed_sku_from_code.
	$sku        = trim( (string) preg_replace( '/[^A-Za-z0-9]+/u', '-', (string) $p['code'] ), '-' );
	$product_id = wc_get_product_id_by_sku( $sku );
	$product    = $product_id ? wc_get_product( $product_id ) : null;
	if ( ! $product ) {
		WP_CLI::warning( "no product with SKU $sku" );
		continue;
	}
	$genders = 'Unisex' === $p['gender'] ? array( 'Women', 'Men' ) : array( (string) $p['gender'] );
	$eye     = (int) $p['eye'];
	$band    = $eye <= 52 ? 'Small' : ( $eye <= 57 ? 'Medium' : 'Large' );
	$wanted  = array(
		$gender => array_map( static fn( $g ) => $terms[ $gender ][ $g ], $genders ),
		$size   => array( $terms[ $size ][ $band ] ),
	);

	$attributes = $product->get_attributes();
	$position   = count( $attributes );
	foreach ( $wanted as $facet_taxonomy => $ids ) {
		$facet = new WC_Product_Attribute();
		$facet->set_id( wc_attribute_taxonomy_id_by_name( $facet_taxonomy ) );
		$facet->set_name( $facet_taxonomy );
		$facet->set_options( $ids );
		$facet->set_visible( false );
		$facet->set_variation( false );
		$facet->set_position( isset( $attributes[ $facet_taxonomy ] ) ? $attributes[ $facet_taxonomy ]->get_position() : $position++ );
		$attributes[ $facet_taxonomy ] = $facet;
		wp_set_object_terms( $product_id, $ids, $facet_taxonomy );
	}
	$product->set_attributes( $attributes );
	$product->set_menu_order( (int) $index );
	$product->save();
	WP_CLI::log( sprintf( '%s: %s, %s, order %d', $product->get_name(), implode( '+', $genders ), $band, $index ) );
}
WP_CLI::success( 'Facets seeded.' );
