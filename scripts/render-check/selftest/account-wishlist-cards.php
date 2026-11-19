<?php
/**
 * Self-test seed step: sets `wishlistLayout` to `cards` on every `sgs/account` block in the account page's content, so
 * the signed-in saved-items view draws the wishlist panel's cards layout. Scratch copies only (render-check.py runs it
 * through --seed-step on both copies).
 *
 *   wp eval-file account-wishlist-cards.php
 *
 * @package SGS\RenderCheck
 */

$rc_page = (int) get_option( 'woocommerce_myaccount_page_id' );
$rc_post = $rc_page ? get_post( $rc_page ) : null;
if ( ! $rc_post ) {
	fwrite( STDERR, "account-wishlist-cards.php: no account page\n" );
	exit( 1 );
}
$rc_count = 0;
$rc_set   = static function ( array $blocks ) use ( &$rc_set, &$rc_count ): array {
	foreach ( $blocks as $i => $b ) {
		if ( 'sgs/account' === $b['blockName'] ) {
			$blocks[ $i ]['attrs']['wishlistLayout'] = 'cards';
			++$rc_count;
		}
		if ( ! empty( $b['innerBlocks'] ) ) {
			$blocks[ $i ]['innerBlocks'] = $rc_set( $b['innerBlocks'] );
		}
	}
	return $blocks;
};
$rc_blocks = $rc_set( parse_blocks( $rc_post->post_content ) );
if ( 0 === $rc_count ) {
	fwrite( STDERR, "account-wishlist-cards.php: no sgs/account block on page $rc_page\n" );
	exit( 1 );
}
global $wpdb;
$wpdb->update( $wpdb->posts, array( 'post_content' => serialize_blocks( $rc_blocks ) ), array( 'ID' => $rc_page ) );
clean_post_cache( $rc_page );
echo "account page $rc_page: wishlistLayout set to cards on $rc_count block(s)\n";
