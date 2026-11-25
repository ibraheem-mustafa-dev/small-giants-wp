<?php
/**
 * Standalone test: a shape divider's flip, invert and top position
 * (includes/shape-dividers.php::sgs_render_shape_divider, ::sgs_shape_divider_transform).
 *
 * The SVG `transform` attribute takes the `translate(...) scale(...)` form every
 * browser honours; the CSS form `scaleX(-1)` is ignored in an attribute, which left
 * Flip and Invert dead. A top divider is mirrored vertically by default (every path's
 * solid mass sits on the lower edge of its box), and Invert undoes that.
 *
 * Run: php plugins/sgs-blocks/tests/php/run-shape-divider-standalone.php
 *
 * @package SGS\Blocks
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ) {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/shape-dividers.php';

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

$bottom_plain = sgs_render_shape_divider( 'wave', false, false, 'bottom' );
ok( false === strpos( $bottom_plain, 'transform' ), 'a bottom divider with no flip or invert carries no transform' );

$bottom_flip = sgs_render_shape_divider( 'wave', true, false, 'bottom' );
ok( false !== strpos( $bottom_flip, ' transform="translate(1200 0) scale(-1 1)"' ), 'flip mirrors left to right about the box' );

$bottom_invert = sgs_render_shape_divider( 'wave', false, true, 'bottom' );
ok( false !== strpos( $bottom_invert, ' transform="translate(0 120) scale(1 -1)"' ), 'invert mirrors top to bottom about the box' );

$bottom_both = sgs_render_shape_divider( 'wave', true, true, 'bottom' );
ok( false !== strpos( $bottom_both, ' transform="translate(1200 120) scale(-1 -1)"' ), 'flip and invert together' );

$top_plain = sgs_render_shape_divider( 'wave', false, false, 'top' );
ok( false !== strpos( $top_plain, ' transform="translate(0 120) scale(1 -1)"' ), 'a top divider is mirrored vertically by default, so its solid mass hugs the top edge' );

$top_invert = sgs_render_shape_divider( 'wave', false, true, 'top' );
ok( false === strpos( $top_invert, 'transform' ), 'invert on a top divider puts the unmirrored shape back' );

$top_flip = sgs_render_shape_divider( 'wave', true, false, 'top' );
ok( false !== strpos( $top_flip, ' transform="translate(1200 120) scale(-1 -1)"' ), 'flip on a top divider keeps the top mirror' );

foreach ( array( $bottom_flip, $bottom_invert, $top_plain ) as $i => $svg ) {
	ok( false === strpos( $svg, 'scaleX(' ) && false === strpos( $svg, 'scaleY(' ) && false === strpos( $svg, 'transform-origin' ), "no CSS-function transform or transform-origin attribute is written ($i)" );
}

// The pattern (X scale) route puts the same transform on the path inside the tile.
$tiled_top = sgs_render_shape_divider( 'wave', true, false, 'top', 50 );
ok( false !== strpos( $tiled_top, '<g transform="scale(0.5 1)"><path d="' ) && false !== strpos( $tiled_top, ' transform="translate(1200 120) scale(-1 -1)"/>' ), 'the tiled route mirrors the path inside the tile, not the rect' );

// Negative control: the parity that makes a top divider mirror is what the tests above guard.
ok( sgs_shape_divider_transform( false, false, 'top' ) !== sgs_shape_divider_transform( false, false, 'bottom' ), 'negative control: top and bottom differ when nothing is set' );

echo "\n$pass passed, $fail failed\n";
exit( $fail ? 1 : 0 );
