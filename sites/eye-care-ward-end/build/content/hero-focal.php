<?php
/**
 * Eye Care home (post 208): the hero photo's phone focal point moves from Custom CSS (sgsCustomCssId r12hero,
 * `object-position: 62% 12%` below 768px) to the hero's own focal setting (backgroundFocal.mobile). The desktop value
 * (78% 45%) is already the setting's and tablet inherits it, so the rule's other half is the setting already.
 *   wp --user=Claude eval-file eyecare-focal.php          dry run
 *   wp --user=Claude eval-file eyecare-focal.php write
 */
$mode = in_array( 'write', (array) $args, true ) ? 'write' : 'dry';
if ( ! current_user_can( 'unfiltered_html' ) ) {
	WP_CLI::error( 'Run as an administrator.' );
}
$post   = get_post( 208 );
$blocks = parse_blocks( $post->post_content );
$hits   = 0;
$names  = static function ( array $bs, array &$n ) use ( &$names ): void {
	foreach ( $bs as $b ) {
		$n[] = $b['blockName'];
		$names( $b['innerBlocks'], $n );
	}
};
$walk = static function ( array &$bs ) use ( &$walk, &$hits ): void {
	foreach ( $bs as &$b ) {
		if ( 'sgs/hero' === $b['blockName'] && 'r12hero' === ( $b['attrs']['sgsCustomCssId'] ?? '' ) ) {
			++$hits;
			WP_CLI::log( 'before: backgroundFocal ' . wp_json_encode( $b['attrs']['backgroundFocal'] ?? null ) . ', sgsCustomCss ' . wp_json_encode( $b['attrs']['sgsCustomCss'] ?? '' ) );
			$b['attrs']['backgroundFocal']           = is_array( $b['attrs']['backgroundFocal'] ?? null ) ? $b['attrs']['backgroundFocal'] : array();
			$b['attrs']['backgroundFocal']['mobile'] = array( 'x' => 0.62, 'y' => 0.12 );
			$b['attrs']['sgsCustomCss']              = '';
			$b['attrs']['sgsCustomCssNote']          = 'Round 12 (Bean): the photo sits 9% taller than the hero, as the draft does, so the parallax travels without a gap. Its focal points are the hero\'s own focal setting (phone 62% 12%, from 768px 78% 45%) since 2026-11-23.';
			WP_CLI::log( 'after:  backgroundFocal ' . wp_json_encode( $b['attrs']['backgroundFocal'] ) . ', sgsCustomCss ""' );
		}
		$walk( $b['innerBlocks'] );
	}
};
$walk( $blocks );
if ( 1 !== $hits ) {
	WP_CLI::error( "expected one hero with sgsCustomCssId r12hero, found $hits; nothing written" );
}
$new = serialize_blocks( $blocks );
$n0  = array();
$n1  = array();
$names( parse_blocks( $post->post_content ), $n0 );
$names( parse_blocks( $new ), $n1 );
if ( $n0 !== $n1 ) {
	WP_CLI::error( 'the block list changed on re-serialising; nothing written' );
}
if ( 'write' !== $mode ) {
	WP_CLI::success( 'dry run: nothing written' );
	return;
}
$r = wp_update_post( array( 'ID' => 208, 'post_content' => wp_slash( $new ) ), true );
if ( is_wp_error( $r ) ) {
	WP_CLI::error( $r->get_error_message() );
}
$cc = substr_count( get_post( 208 )->post_content, '"sgsCustomCssId"' );
WP_CLI::log( "blocks with a Custom CSS id after: $cc (before " . substr_count( $post->post_content, '"sgsCustomCssId"' ) . ')' );
wp_cache_flush();
WP_CLI::success( 'written' );
