<?php
/**
 * Site-build record: the Zookies (product 257) data for the buy box "Pick a set" mode, on local-mamas.
 * Run: wp eval-file configurator-data.php --user=1 (idempotent).
 */
if ( ! defined( 'ABSPATH' ) ) { exit( 1 ); }

$pid = 257;
$flavours = array(
	'Vanilla' => '#F6E7B8', 'Chocolate' => '#5A3522', 'Strawberry' => '#E8505B', 'Mango' => '#F5A623',
	'Banana' => '#F4D35E', 'Coffee' => '#8A5A3B', 'Mint' => '#8FD1A8', 'Caramel' => '#C98A3A',
	'Coconut' => '#FFFFFF', 'Pistachio' => '#9DBF6B', 'Honey' => '#E8B230',
);

if ( ! wc_attribute_taxonomy_id_by_name( 'flavour' ) ) {
	$made = wc_create_attribute( array( 'name' => 'Flavour', 'slug' => 'flavour', 'type' => 'select', 'order_by' => 'menu_order', 'has_archives' => false ) );
	if ( is_wp_error( $made ) ) { WP_CLI::error( $made->get_error_message() ); }
	delete_transient( 'wc_attribute_taxonomies' );
}
if ( ! taxonomy_exists( 'pa_flavour' ) ) {
	register_taxonomy( 'pa_flavour', array( 'product' ), array( 'hierarchical' => false, 'show_ui' => false, 'query_var' => true, 'rewrite' => false ) );
}

$ids = array();
foreach ( $flavours as $name => $hex ) {
	$t = term_exists( $name, 'pa_flavour' );
	if ( ! $t ) { $t = wp_insert_term( $name, 'pa_flavour' ); }
	if ( is_wp_error( $t ) ) { WP_CLI::error( $t->get_error_message() ); }
	$tid = (int) ( is_array( $t ) ? $t['term_id'] : $t );
	update_term_meta( $tid, '_sgs_swatch_color', $hex );
	$ids[] = $tid;
}

$product = wc_get_product( $pid );
$attrs   = $product->get_attributes();
$a       = new WC_Product_Attribute();
$a->set_id( wc_attribute_taxonomy_id_by_name( 'flavour' ) );
$a->set_name( 'pa_flavour' );
$a->set_options( $ids );
$a->set_position( count( $attrs ) );
$a->set_visible( true );
$a->set_variation( false );
$attrs['pa_flavour'] = $a;
$product->set_attributes( $attrs );
$product->save();
wp_set_object_terms( $pid, $ids, 'pa_flavour' );

update_post_meta( $pid, '_sgs_pack_size_axis', 'pa_pack-size' );
update_post_meta( $pid, '_sgs_attribute_flags', array(
	'pa_flavour' => array( 'multi' => true, 'least' => 1, 'most' => 3, 'overflow' => 'replace', 'startWith' => 'vanilla', 'share' => 'equal' ),
) );

$pack = array( 8 => array( '£1.19 each', '' ), 20 => array( '£1.08 each', 'Most popular' ), 40 => array( '£0.95 each', 'Best value' ) );
foreach ( wc_get_product_terms( $pid, 'pa_pack-size', array( 'fields' => 'all' ) ) as $t ) {
	if ( 1 !== preg_match_all( '/\d+/', $t->name, $m ) ) { WP_CLI::warning( 'unparseable ' . $t->name ); continue; }
	$n = (int) $m[0][0];
	if ( ! isset( $pack[ $n ] ) ) { continue; }
	update_term_meta( $t->term_id, '_sgs_pack_units', $n );
	update_term_meta( $t->term_id, '_sgs_term_description', $pack[ $n ][0] );
	if ( '' !== $pack[ $n ][1] ) { update_term_meta( $t->term_id, '_sgs_term_badge', $pack[ $n ][1] ); } else { delete_term_meta( $t->term_id, '_sgs_term_badge' ); }
	WP_CLI::log( $t->name . ' -> ' . $n );
}
wp_update_post( array( 'ID' => $pid, 'post_status' => get_post_status( $pid ) ) ); // refresh lookups
wc_delete_product_transients( $pid );
if ( function_exists( 'wc_update_product_lookup_tables_column' ) ) { /* lookup refreshed by save() above */ }
WP_CLI::success( 'flavour ids ' . implode( ',', $ids ) );
