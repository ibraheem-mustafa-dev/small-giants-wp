<?php
/**
 * Standalone tests for U-13 §4.3's image top-tone measurement
 * (includes/media-top-tone.php) and its consumer, sgs_surface_tone()'s image
 * layer (includes/helpers-surface-tone.php).
 *
 * Covers:
 *   1. sgs_media_top_tone_sample_top_luminance() against two generated GD
 *      fixture PNGs (a white-topped and a black-topped image) — with a
 *      negative control proving the function samples the TOP 20% only, not
 *      a whole-image mean.
 *   2. sgs_media_top_tone() reading `_sgs_top_tone` post meta (mocked
 *      get_post_meta()) — with meta present ('dark') and absent ('').
 *   3. sgs_surface_tone()'s image layer: an attachment_id whose measured
 *      tone is known decides the layer; without one it stays ''.
 *
 * Plain PHP, no PHPUnit, no WordPress installation. Exits non-zero on any
 * failure.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-media-top-tone-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

if ( ! extension_loaded( 'gd' ) ) {
	fwrite( STDERR, "SKIP: the gd extension is not loaded in this PHP CLI — cannot run the pixel-sampling tests.\n" );
	exit( 0 );
}

// media-top-tone.php calls add_filter() at file-load time (registering its
// wp_generate_attachment_metadata callback) — stub it as a no-op recorder so
// the require below does not fatal outside WordPress.
$sgs_test_added_filters = array();
if ( ! function_exists( 'add_filter' ) ) {
	function add_filter( string $hook, $callback, int $priority = 10, int $accepted_args = 1 ): bool {
		global $sgs_test_added_filters;
		$sgs_test_added_filters[] = array( $hook, $callback, $priority, $accepted_args );
		return true;
	}
}

// Mocked post-meta store for sgs_media_top_tone()'s reader test — a plain
// array keyed by attachment id, set directly by the test below.
$sgs_test_post_meta = array();
if ( ! function_exists( 'get_post_meta' ) ) {
	function get_post_meta( int $post_id, string $key, bool $single = false ) {
		global $sgs_test_post_meta;
		if ( ! $single ) {
			return array(); // Not used by this file's callers.
		}
		return $sgs_test_post_meta[ $post_id ][ $key ] ?? '';
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-surface-tone.php';
require_once dirname( __DIR__, 2 ) . '/includes/media-top-tone.php';

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label\n";
	} else {
		++$fail;
		echo "FAIL  $label\n";
	}
}

// ---------------------------------------------------------------------------
// 1. Pixel sampling — generated GD fixtures.
// ---------------------------------------------------------------------------

/**
 * Build a 100x100 PNG whose top $top_fraction is one solid colour and the
 * rest is another, and return its temp file path.
 *
 * @param float $top_fraction Fraction of the height (0..1) painted $top_rgb.
 * @param array $top_rgb      [r,g,b] for the top band.
 * @param array $rest_rgb     [r,g,b] for everything below the top band.
 * @return string Path to the written PNG (caller deletes it).
 */
function sgs_test_make_fixture_png( float $top_fraction, array $top_rgb, array $rest_rgb ): string {
	$width  = 100;
	$height = 100;
	$image  = imagecreatetruecolor( $width, $height );

	$top_colour  = imagecolorallocate( $image, $top_rgb[0], $top_rgb[1], $top_rgb[2] );
	$rest_colour = imagecolorallocate( $image, $rest_rgb[0], $rest_rgb[1], $rest_rgb[2] );

	$split = (int) round( $height * $top_fraction );
	imagefilledrectangle( $image, 0, 0, $width - 1, max( 0, $split - 1 ), $top_colour );
	imagefilledrectangle( $image, 0, $split, $width - 1, $height - 1, $rest_colour );

	$path = tempnam( sys_get_temp_dir(), 'sgs-tone-fixture' ) . '.png';
	imagepng( $image, $path );
	imagedestroy( $image );

	return $path;
}

// White top 20%, black rest -> top-20% mean luminance is white (~1.0) -> light.
$white_top_path = sgs_test_make_fixture_png( 0.2, array( 255, 255, 255 ), array( 0, 0, 0 ) );
$white_top_luminance = sgs_media_top_tone_sample_top_luminance( $white_top_path );
ok( null !== $white_top_luminance && $white_top_luminance > 0.9, 'white-topped fixture: sampled top-20% luminance is near 1.0 (actual: ' . var_export( $white_top_luminance, true ) . ')' );
ok( 'light' === ( sgs_wcag_white_wins_for_luminance( (float) $white_top_luminance ) ? 'dark' : 'light' ), 'white-topped fixture classifies as light' );
unlink( $white_top_path );

// Black top 20%, white rest -> top-20% mean luminance is black (~0.0) -> dark.
$black_top_path = sgs_test_make_fixture_png( 0.2, array( 0, 0, 0 ), array( 255, 255, 255 ) );
$black_top_luminance = sgs_media_top_tone_sample_top_luminance( $black_top_path );
ok( null !== $black_top_luminance && $black_top_luminance < 0.1, 'black-topped fixture: sampled top-20% luminance is near 0.0 (actual: ' . var_export( $black_top_luminance, true ) . ')' );
ok( 'dark' === ( sgs_wcag_white_wins_for_luminance( (float) $black_top_luminance ) ? 'dark' : 'light' ), 'black-topped fixture classifies as dark' );
unlink( $black_top_path );

// ---------------------------------------------------------------------------
// Negative control: the SAME black-topped/white-rest fixture, sampled as a
// WHOLE-IMAGE mean instead of top-20%, would misjudge it as light (white
// dominates 80% of the pixels) — proving the top-20% crop is load-bearing,
// not a no-op. This reproduces the exact fixture above with a naive
// full-image sampler.
// ---------------------------------------------------------------------------
function sgs_test_naive_whole_image_luminance( string $path ): ?float {
	$data  = file_get_contents( $path );
	$image = imagecreatefromstring( (string) $data );
	if ( false === $image ) {
		return null;
	}
	$width  = imagesx( $image );
	$height = imagesy( $image );
	$total  = 0.0;
	$count  = 0;
	for ( $y = 0; $y < $height; $y++ ) {
		for ( $x = 0; $x < $width; $x += 4 ) {
			$rgb       = imagecolorat( $image, $x, $y );
			$r         = ( $rgb >> 16 ) & 0xFF;
			$g         = ( $rgb >> 8 ) & 0xFF;
			$b         = $rgb & 0xFF;
			$luminance = sgs_wcag_relative_luminance( sprintf( '%02x%02x%02x', $r, $g, $b ) );
			$total    += $luminance;
			++$count;
		}
	}
	imagedestroy( $image );
	return $count > 0 ? $total / $count : null;
}

$black_top_path_2 = sgs_test_make_fixture_png( 0.2, array( 0, 0, 0 ), array( 255, 255, 255 ) );
$naive_luminance   = sgs_test_naive_whole_image_luminance( $black_top_path_2 );
$naive_tone        = sgs_wcag_white_wins_for_luminance( (float) $naive_luminance ) ? 'dark' : 'light';
ok( 'light' === $naive_tone, 'negative control: a naive whole-image mean of the black-topped fixture misjudges it as light (80% white pixels dominate)' );
$real_luminance = sgs_media_top_tone_sample_top_luminance( $black_top_path_2 );
$real_tone      = sgs_wcag_white_wins_for_luminance( (float) $real_luminance ) ? 'dark' : 'light';
ok( 'dark' === $real_tone, 'the real top-20%-only sampler correctly classifies the same fixture as dark' );
unlink( $black_top_path_2 );

// ---------------------------------------------------------------------------
// 2. sgs_media_top_tone() reader — mocked get_post_meta().
// ---------------------------------------------------------------------------
$sgs_test_post_meta[ 501 ] = array( '_sgs_top_tone' => 'dark' );
ok( 'dark' === sgs_media_top_tone( 501 ), 'sgs_media_top_tone() reads dark meta for attachment 501' );
ok( '' === sgs_media_top_tone( 502 ), 'sgs_media_top_tone() returns \'\' for an attachment with no meta set' );
ok( '' === sgs_media_top_tone( 0 ), 'sgs_media_top_tone() returns \'\' for attachment id 0' );

// ---------------------------------------------------------------------------
// 3. sgs_surface_tone()'s image layer, driven by attachment_id + meta.
// ---------------------------------------------------------------------------
$sgs_test_post_meta[ 601 ] = array( '_sgs_top_tone' => 'dark' );
ok(
	'dark' === sgs_surface_tone( array( array( 'image' => true, 'attachment_id' => 601 ) ) ),
	'sgs_surface_tone(): an image layer whose attachment_id has dark measured meta returns dark'
);

// No meta set for 602 at all.
ok(
	'' === sgs_surface_tone( array( array( 'image' => true, 'attachment_id' => 602 ) ) ),
	'sgs_surface_tone(): an image layer whose attachment_id has NO measured meta returns \'\' (unknown, same as before this change)'
);

// No attachment_id at all (the pre-existing shape) — unchanged behaviour.
ok(
	'' === sgs_surface_tone( array( array( 'image' => true ) ) ),
	'sgs_surface_tone(): an image layer with no attachment_id at all returns \'\' (pre-existing behaviour preserved)'
);

// ---------------------------------------------------------------------------
// Negative control: a wrong attachment_id (light meta) must NOT read as dark
// — proves the test isn't vacuously passing regardless of the stored tone.
// ---------------------------------------------------------------------------
$sgs_test_post_meta[ 603 ] = array( '_sgs_top_tone' => 'light' );
ok(
	'light' === sgs_surface_tone( array( array( 'image' => true, 'attachment_id' => 603 ) ) ),
	'negative control: an attachment_id with LIGHT measured meta returns light, not dark'
);

echo "\n==== {$pass} passed, {$fail} failed ====\n";
exit( $fail > 0 ? 1 : 0 );
