<?php
/**
 * Spec 49 §7.6 markup check: `wp_filter_content_tags` leaves an attachment-backed slot image correct.
 *
 * Needs real WordPress. Run on a local mirror:
 *   wp eval-file tests/php/run-media-sizes-filter-standalone.php [attachment-id]
 *
 * Renders one lazy slot image and one eager one through `SGS_Media_Element::render()`, passes the markup through
 * `wp_filter_content_tags()`, and fails (exit 1) when core changes `sizes`, `srcset`, `loading`, `fetchpriority`,
 * `width` or `height`, or doubles the `auto, ` prefix.
 *
 * @package SGS\Blocks\Tests
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( 1 );
}

$sgs_att = isset( $args[0] ) ? absint( $args[0] ) : 0;
if ( 0 === $sgs_att ) {
	$sgs_found = get_posts(
		array(
			'post_type'      => 'attachment',
			'post_mime_type' => 'image/jpeg',
			'posts_per_page' => 1,
			'fields'         => 'ids',
		)
	);
	$sgs_att   = $sgs_found ? (int) $sgs_found[0] : 0;
}
if ( 0 === $sgs_att ) {
	WP_CLI::error( 'No JPEG attachment found.' );
}

$sgs_fail  = 0;
$sgs_check = static function ( bool $ok, string $what ) use ( &$sgs_fail ): void {
	WP_CLI::log( ( $ok ? 'ok   ' : 'FAIL ' ) . $what );
	if ( ! $ok ) {
		++$sgs_fail;
	}
};

$sgs_meta = wp_get_attachment_metadata( $sgs_att );
$sgs_src  = array(
	'kind'   => 'image',
	'id'     => $sgs_att,
	'url'    => (string) wp_get_attachment_url( $sgs_att ),
	'width'  => (int) ( $sgs_meta['width'] ?? 0 ),
	'height' => (int) ( $sgs_meta['height'] ?? 0 ),
);

// The slot with no Priority class: lazy, `auto, ` prefix.
$sgs_slot = array(
	'prefix' => '',
	'kinds'  => array( 'image' ),
);
foreach ( array( 'px' => '320px', 'vw' => '50vw', 'none' => '' ) as $sgs_label => $sgs_width ) {
	$sgs_attrs = array(
		'source' => array( 'desktop' => $sgs_src ),
		'alt'    => 'Check',
	);
	if ( '' !== $sgs_width ) {
		$sgs_attrs['width'] = $sgs_width;
	}
	$sgs_out    = SGS_Media_Element::render( $sgs_slot, $sgs_attrs, array( 'uid' => 'sizes-check' ) );
	$sgs_before = $sgs_out['html'];
	$sgs_after  = wp_filter_content_tags( $sgs_before, 'the_content' );

	$sgs_sizes = static function ( string $html ): string {
		return preg_match( '/\ssizes="([^"]*)"/', $html, $m ) ? $m[1] : '';
	};
	$sgs_check( '' !== $sgs_before, "[$sgs_label] slot printed an image" );
	$sgs_check( 1 === substr_count( $sgs_before, ' srcset=' ) || 0 === substr_count( $sgs_before, ' srcset=' ) && ! wp_get_attachment_image_srcset( $sgs_att, 'full' ), "[$sgs_label] srcset printed once" );
	$sgs_check( 0 === strpos( $sgs_sizes( $sgs_before ), 'auto, ' ), "[$sgs_label] lazy sizes carry the auto prefix: " . $sgs_sizes( $sgs_before ) );
	$sgs_check( $sgs_sizes( $sgs_before ) === $sgs_sizes( $sgs_after ), "[$sgs_label] core left sizes unchanged: " . $sgs_sizes( $sgs_after ) );
	$sgs_check( false === strpos( $sgs_sizes( $sgs_after ), 'auto, auto' ), "[$sgs_label] no doubled prefix" );
	$sgs_check( $sgs_before === $sgs_after, "[$sgs_label] core filter changed no other attribute" );
	$sgs_check( 1 === preg_match( '/\swidth="\d+"\s+height="\d+"/', $sgs_after ), "[$sgs_label] width and height kept" );
	$sgs_check( false !== strpos( $sgs_after, 'loading="lazy"' ), "[$sgs_label] loading kept" );
}

if ( $sgs_fail > 0 ) {
	WP_CLI::error( $sgs_fail . ' check(s) failed.' );
}
WP_CLI::success( 'wp_filter_content_tags leaves every slot image as printed.' );
