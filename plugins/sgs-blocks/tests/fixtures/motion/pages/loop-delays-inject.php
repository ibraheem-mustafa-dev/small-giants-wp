<?php
/**
 * Stores the loop stagger on the core query and the WooCommerce product collection of the loop-delays fixture page.
 * Core blocks register no `sgsMotion` attribute, so `wp-build-page.js` refuses it in `loop-delays.json`; the stagger is
 * written into the stored block comments instead, where `Sgs_Motion_Loop_Delays::capture_context` reads it.
 * Run after every rebuild of the page:  wp eval-file loop-delays-inject.php <post id> --user=Claude
 *
 * @package SGS\Blocks
 */

$post_id = isset( $args[0] ) ? (int) $args[0] : 0;
$post    = get_post( $post_id );
if ( ! $post ) {
	WP_CLI::error( 'Give the fixture page ID.' );
}
$stagger = '"sgsMotion":{"v":1,"stagger":{"apply":false,"offset":0,"step":80,"order":"row-first","perRow":true,"closeOrder":"same"}},';
$content = preg_replace( '/<!-- wp:query \{(?!"sgsMotion")/', '<!-- wp:query {' . $stagger, $post->post_content, 1, $n_query );
$content = preg_replace( '/<!-- wp:woocommerce\/product-collection \{(?!"sgsMotion")/', '<!-- wp:woocommerce/product-collection {' . $stagger, $content, 1, $n_products );
$result  = wp_update_post( array( 'ID' => $post_id, 'post_content' => wp_slash( $content ) ), true );
if ( is_wp_error( $result ) ) {
	WP_CLI::error( $result->get_error_message() );
}
WP_CLI::success( "query: $n_query, product collection: $n_products" );
