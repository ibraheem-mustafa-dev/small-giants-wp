<?php
/**
 * Live WP test for the shared stylesheet delivery (Spec 32 FR-32-32, includes/class-sgs-css-delivery.php).
 *
 * Builds a fresh WP_Styles registry with real files under uploads, runs Css_Delivery in each mode and prints it with
 * core's own WP_Styles::do_items(), then checks:
 *   - print order is resolved from dependencies and the real `to_do` list is left untouched;
 *   - a run keeps every handle's file content and inline additions in print order, in one block;
 *   - a stylesheet for some media joins the run inside `@media`, its inline additions outside it;
 *   - a media value with `{`, an `@import`, another origin, a missing file and a `</style` sequence each end the run
 *     and print as WordPress would;
 *   - relative `url()` references are rewritten from the file's own folder;
 *   - `bundle` writes one content-hashed file per run of two or more files (no `ver`), whose name changes with
 *     its content, and leaves a one-file run alone;
 *   - a path that leaves ABSPATH and WP_CONTENT_DIR is refused;
 *   - `?sgs-css-delivery=links` and an invalid option fall back as documented.
 *   - the merge is hooked to `wp_print_styles` at the last priority, so later head additions are inside the run.
 * Negative control: comment out Css_Delivery::apply()'s merge call and the run checks fail.
 *
 *   wp eval-file wp-eval-css-delivery.php
 *
 * @package SGS\Blocks\Tests
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable WordPress.WP.AlternativeFunctions

use SGS\Blocks\Css_Delivery;

if ( ! class_exists( Css_Delivery::class ) ) {
	require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-css-delivery.php';
}

$fails = 0;
$check = static function ( string $name, bool $ok, string $detail = '' ) use ( &$fails ): void {
	echo ( $ok ? 'pass  ' : 'FAIL  ' ) . $name . ( $ok || '' === $detail ? '' : '  -- ' . $detail ) . "\n";
	if ( ! $ok ) {
		++$fails;
	}
};

$up  = wp_upload_dir();
$dir = $up['basedir'] . '/sgs-delivery-test';
$url = $up['baseurl'] . '/sgs-delivery-test';
wp_mkdir_p( $dir );
$files = array(
	'a.css' => '.a{background:url(img/a.png)}',
	'z.css' => '.z{color:red}',
	'b.css' => '.b{color:blue}',
	'm.css' => '.m{color:green}',
	'n.css' => '.n{color:olive}',
	'c.css' => '@import url(x.css);.c{color:teal}',
	'f.css' => '@charset "UTF-8";.f{color:navy}',
	'h.css' => '.h{content:"</style>"}',
);
foreach ( $files as $name => $css ) {
	file_put_contents( $dir . '/' . $name, $css );
}
$outside = sys_get_temp_dir() . '/sgs-delivery-outside.css';
file_put_contents( $outside, '.evil{}' );

$build = static function () use ( $url ): WP_Styles {
	$s           = new WP_Styles();
	$s->base_url = site_url();
	$s->add( 'a', $url . '/a.css', array(), '1' );
	$s->add_data( 'a', 'after', array( '.a-after{}' ) );
	$s->add( 'z', $url . '/z.css', array( 'a' ), '1' );
	$s->add( 'i', false );
	$s->add_data( 'i', 'after', array( '.i-only{}' ) );
	$s->add( 'b', $url . '/b.css', array(), '1' );
	$s->add( 'm', $url . '/m.css', array(), '1', '(max-width:600px)' );
	$s->add_data( 'm', 'after', array( '.m-after{}' ) );
	$s->add( 'n', $url . '/n.css', array(), '1', 'screen{' );
	$s->add( 'c', $url . '/c.css', array(), '1' );
	$s->add( 'f', wp_make_link_relative( $url . '/f.css' ), array(), '1' );
	$s->add( 'e', 'https://example.com/e.css', array(), '1' );
	$s->add( 'g', $url . '/missing.css', array(), '1' );
	$s->add( 'h', $url . '/h.css', array(), '1' );
	foreach ( array( 'z', 'i', 'b', 'm', 'n', 'c', 'f', 'e', 'g', 'h' ) as $h ) {
		$s->enqueue( $h );
	}
	return $s;
};
$print = static function ( WP_Styles $s ): string {
	ob_start();
	$s->do_items();
	return (string) ob_get_clean();
};

// Order.
$s     = $build();
$order = Css_Delivery::print_order( $s );
$check( 'print order follows dependencies', array( 'a', 'z', 'i', 'b', 'm', 'n', 'c', 'f', 'e', 'g', 'h' ) === $order, implode( ',', $order ) );
$check( 'real to_do untouched', array() === $s->to_do );

// Runs.
$runs = array_map( static fn( $r ) => $r['handles'], Css_Delivery::plan( $s, $order ) );
$check( 'a media sheet joins the run; an unsafe media value, @import, origin, missing file and </style break it', array( array( 'a', 'z', 'i', 'b', 'm' ), array( 'f' ) ) === $runs, wp_json_encode( $runs ) );

// Inline mode.
Css_Delivery::apply( $s, 'inline' );
$out = $print( $s );
$check( 'one style block for the first run', 1 === substr_count( $out, "id='a-inline-css'" ) || 1 === substr_count( $out, 'id="a-inline-css"' ), $out );
$pa = strpos( $out, '.a{' );
$pz = strpos( $out, '.z{' );
$pi = strpos( $out, '.i-only{' );
$pb = strpos( $out, '.b{' );
$check( 'file then inline additions, in print order', false !== $pa && $pa < strpos( $out, '.a-after{' ) && strpos( $out, '.a-after{' ) < $pz && $pz < $pi && $pi < $pb, $out );
$check( 'merged handles print no tag of their own', false === strpos( $out, 'z-css' ) && false === strpos( $out, 'b-css' ) && false === strpos( $out, 'i-inline-css' ) );
$check( 'media sheet folded inside its @media, inline additions outside', false !== strpos( $out, "@media (max-width:600px){.m{color:green}}
.m-after{}" ) && false === strpos( $out, 'm-css' ), $out );
$check( 'media sheet after b in the run, before f', strpos( $out, '.m{color:green}' ) > $pb && strpos( $out, '.m{color:green}' ) < strpos( $out, '.f{' ) );
$check( 'unsafe media value stays a link', false !== strpos( $out, 'n-css' ) && false !== strpos( $out, 'n.css' ) );
$check( '@import sheet stays a link', false !== strpos( $out, 'c-css' ) );
$check( 'other origin stays a link', false !== strpos( $out, 'example.com/e.css' ) );
$check( 'missing file stays a link', false !== strpos( $out, 'missing.css' ) );
$check( '</style sheet stays a link', false !== strpos( $out, 'h.css' ) );
$check( 'one-file run inlined, @charset dropped', false !== strpos( $out, '.f{color:navy}' ) && false === strpos( $out, '@charset' ) );
$rel = wp_make_link_relative( $url . '/img/a.png' );
$check( 'relative url() rewritten from the file folder', false !== strpos( $out, 'url(' . $rel . ')' ), $out );

// Bundle mode.
$s      = $build();
$merged = Css_Delivery::apply( $s, 'bundle' );
$out    = $print( $s );
$check( 'bundle only for the run with two or more files', 1 === count( $merged ) && array( 'a', 'z', 'i', 'b', 'm' ) === $merged[0]['handles'], wp_json_encode( $merged ) );
$src1 = 1 === count( $merged ) ? (string) $merged[0]['src'] : '';
$check( 'bundle file in uploads/sgs-css with the run prefix', (bool) preg_match( '#/sgs-css/sgs-\d+-run-[0-9a-f]{32}\.css$#', $src1 ), $src1 );
$check( 'bundle link carries no ver', false !== strpos( $out, $src1 . "'" ) || false !== strpos( $out, $src1 . '"' ), $out );
$bundle_file = '' !== $src1 ? str_replace( $up['baseurl'], $up['basedir'], $src1 ) : '';
$body        = '' !== $bundle_file && is_readable( $bundle_file ) ? (string) file_get_contents( $bundle_file ) : '';
$check( 'bundle holds the run in order', '' !== $body && strpos( $body, '.a{' ) < strpos( $body, '.a-after{' ) && strpos( $body, '.a-after{' ) < strpos( $body, '.z{' ) && strpos( $body, '.z{' ) < strpos( $body, '.i-only{' ) && strpos( $body, '.i-only{' ) < strpos( $body, '.b{' ), $body );
$check( 'one-file run left as its own link in bundle mode', false !== strpos( $out, 'f.css' ) );
file_put_contents( $dir . '/b.css', '.b{color:purple}' );
$s2     = $build();
$merged = Css_Delivery::apply( $s2, 'bundle' );
$src2   = $merged ? (string) $merged[0]['src'] : '';
$check( 'bundle name changes with its content', '' !== $src2 && $src1 !== $src2 );

// Path safety.
$s3 = new WP_Styles();
$s3->base_url = site_url();
$s3->add( 'evil', content_url( '/' . str_repeat( '../', 8 ) . ltrim( $outside, '/' ) ) );
$check( 'path outside ABSPATH and WP_CONTENT_DIR refused', null === Css_Delivery::file_for( $s3, 'evil' ) );
$s3->add( 'not-css', includes_url( 'version.php' ) );
$check( 'non-.css file refused', null === Css_Delivery::file_for( $s3, 'not-css' ) );

// Mode.
$_GET[ Css_Delivery::QUERY_FLAG ] = 'links';
$check( 'query flag gives links', 'links' === Css_Delivery::mode() );
unset( $_GET[ Css_Delivery::QUERY_FLAG ] );
$filter = static fn() => 'nonsense';
add_filter( 'sgs_css_shared_delivery', $filter );
$check( 'invalid mode falls back to the default', Css_Delivery::DEFAULT_MODE === Css_Delivery::mode() );
remove_filter( 'sgs_css_shared_delivery', $filter );

// Timing: the merge runs on the wp_print_styles action at the last priority, after every later head addition.
remove_all_actions( 'wp_print_styles' );
Css_Delivery::register();
$check( PHP_INT_MAX === has_action( 'wp_print_styles', array( Css_Delivery::class, 'run' ) ), 'merge hooked to wp_print_styles at the last priority' );
$check( false === has_action( 'wp_head', array( Css_Delivery::class, 'run' ) ), 'no early wp_head merge left' );

// Clean up.
foreach ( array_merge( array_keys( $files ), array() ) as $name ) {
	@unlink( $dir . '/' . $name );
}
@rmdir( $dir );
@unlink( $outside );
foreach ( array( $bundle_file, '' !== $src2 ? str_replace( $up['baseurl'], $up['basedir'], $src2 ) : '' ) as $f ) {
	if ( '' !== $f ) {
		@unlink( $f );
	}
}

echo $fails ? "\n{$fails} FAILED\n" : "\nall passed\n";
if ( $fails && class_exists( 'WP_CLI' ) ) {
	WP_CLI::halt( 1 );
}
