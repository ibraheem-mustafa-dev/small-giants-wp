<?php
/**
 * Prints the site-relative path of every published front-end URL, one per line (run with wp eval-file).
 */
$paths = array();
$add = static function ( $url ) use ( &$paths ) {
	if ( ! $url || is_wp_error( $url ) ) {
		return;
	}
	$parts = wp_parse_url( $url );
	$p     = ( $parts['path'] ?? '/' ) . ( isset( $parts['query'] ) ? '?' . $parts['query'] : '' );
	$home  = rtrim( (string) wp_parse_url( home_url(), PHP_URL_PATH ), '/' );
	if ( $home && 0 === strpos( $p, $home . '/' ) ) {
		$p = substr( $p, strlen( $home ) );
	}
	$paths[ $p ] = true;
};

$add( home_url( '/' ) );
$posts_page = (int) get_option( 'page_for_posts' );
if ( $posts_page ) {
	$add( get_permalink( $posts_page ) );
}
if ( function_exists( 'wc_get_page_id' ) ) {
	$shop = (int) wc_get_page_id( 'shop' );
	if ( $shop > 0 ) {
		$add( get_permalink( $shop ) );
	}
}
foreach ( array( 'category', 'product_cat' ) as $tax ) {
	if ( taxonomy_exists( $tax ) ) {
		$terms = get_terms( array( 'taxonomy' => $tax, 'hide_empty' => true, 'number' => 1 ) );
		if ( ! is_wp_error( $terms ) && $terms ) {
			$add( get_term_link( $terms[0] ) );
		}
	}
}
$types = get_post_types( array( 'public' => true ), 'names' );
unset( $types['attachment'] );
foreach ( $types as $type ) {
	$ids = get_posts( array( 'post_type' => $type, 'post_status' => 'publish', 'numberposts' => -1, 'fields' => 'ids', 'orderby' => 'ID', 'order' => 'ASC' ) );
	foreach ( $ids as $id ) {
		$add( get_permalink( $id ) );
	}
}
foreach ( array_keys( $paths ) as $p ) {
	echo $p, "\n";
}
