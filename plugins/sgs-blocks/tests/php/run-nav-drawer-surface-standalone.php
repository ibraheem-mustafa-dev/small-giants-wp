<?php
/**
 * Standalone runner for the sgs/nav-drawer surface ground (Wave 3C U-1 commit 4c).
 *
 * The drawer's render.php cannot be included whole outside WordPress (it needs the block
 * context and dozens of helpers), so this runner extracts the surface section from the REAL
 * render.php (from the `$sgs_nd_fill_css` assignment to the "Background image media layer"
 * comment) and evaluates that exact text against fixtures. A change to the shipped code is
 * therefore a change to what is tested; nothing here is a copy.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-nav-drawer-surface-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-surface-ground.php';

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

// ── Extract the real surface section from render.php ────────────────────────────
$render_path = dirname( __DIR__, 2 ) . '/src/blocks/nav-drawer/render.php';
$source      = (string) file_get_contents( $render_path );
$start       = strpos( $source, '$sgs_nd_fill_css' );
$end         = strpos( $source, 'Background image media layer' );
ok( false !== $start && false !== $end && $end > $start, 'the surface section is found in the real nav-drawer/render.php' );
if ( false === $start || false === $end || $end <= $start ) {
	echo "\n==== $pass passed, $fail failed ====\n";
	exit( 1 );
}
// Cut back to the start of the comment line that introduces the media layer.
$section = substr( $source, $start, $end - $start );
$section = substr( $section, 0, (int) strrpos( $section, "\n//" ) );

/**
 * Run a surface section against one drawer's attributes and return the CSS it wrote.
 *
 * @param string $code       The PHP text of the surface section.
 * @param array  $attributes The drawer attributes.
 * @return string The CSS appended to $css.
 */
function run_surface( string $code, array $attributes ): string {
	$css            = '';
	$root_sel       = '.sgs-nav-drawer-test.wp-block-sgs-nav-drawer';
	$drawer_bg_slug = isset( $attributes['drawerBg'] ) ? sanitize_slug_for_test( $attributes['drawerBg'] ) : 'surface';
	eval( $code ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating the extracted render.php section.
	return $css;
}

function sanitize_slug_for_test( $value ): string {
	return preg_replace( '/[^A-Za-z0-9_-]/', '', (string) $value );
}

// ── Default: byte-identical (nothing emitted) ───────────────────────────────────
ok( '' === run_surface( $section, array() ), 'no attributes: nothing emitted (byte-identical to a drawer that never had the controls)' );
ok( '' === run_surface( $section, array( 'surfaceOpacity' => 1 ) ), 'opacity 1 (the old block.json default): nothing emitted' );
ok( '' === run_surface( $section, array( 'surfaceBlur' => '', 'shadow' => '', 'shadowColour' => '' ) ), 'every new attribute at its default: nothing emitted' );

// ── Blur and saturate ───────────────────────────────────────────────────────────
$blur = run_surface( $section, array( 'surfaceBlur' => '24px', 'surfaceSaturate' => 150 ) );
ok( false !== strpos( $blur, 'backdrop-filter:saturate(150%) blur(24px)' ), 'blur and saturate are emitted together, saturate first' );
ok( false !== strpos( $blur, '-webkit-backdrop-filter:saturate(150%) blur(24px)' ), 'the -webkit- twin is emitted' );
ok( false !== strpos( run_surface( $section, array( 'surfaceBlur' => '8px' ) ), 'backdrop-filter:blur(8px)' ), 'blur alone' );
ok( false !== strpos( run_surface( $section, array( 'surfaceSaturate' => 0 ) ), 'backdrop-filter:saturate(0%)' ), 'saturate 0 is a legal value, not treated as empty' );
ok( '' === run_surface( $section, array( 'surfaceBlur' => '16px 12px' ) ), 'a two-value blur (invalid inside blur()) is refused' );
ok( '' === run_surface( $section, array( 'surfaceBlur' => 'red;}body{x' ) ), 'a declaration breakout in blur emits nothing' );

// ── Fill opacity ────────────────────────────────────────────────────────────────
$half = run_surface( $section, array( 'surfaceOpacity' => 0.5 ) );
ok( false !== strpos( $half, 'background-color:color-mix(in srgb, var(--wp--preset--color--surface) 50%, transparent)' ), 'opacity 0.5 makes a colour-mix on the palette token' );
ok( false !== strpos( run_surface( $section, array( 'surfaceOpacity' => 0 ) ), '0%, transparent)' ), 'opacity 0 is legal (fully transparent), not treated as empty' );
ok( false !== strpos( run_surface( $section, array( 'drawerBg' => 'primary', 'surfaceOpacity' => 0.25 ) ), 'var(--wp--preset--color--primary) 25%, transparent)' ), 'the mixed colour follows the chosen drawerBg' );
ok( '' === run_surface( $section, array( 'drawerBg' => '', 'surfaceOpacity' => 0.5 ) ), 'an empty drawerBg has nothing to make translucent: nothing emitted' );

// ── Shadow ──────────────────────────────────────────────────────────────────────
ok( false === strpos( run_surface( $section, array( 'surfaceBlur' => '8px' ) ), 'box-shadow' ), 'shadow default (empty) emits no box-shadow' );
ok( false === strpos( run_surface( $section, array( 'shadow' => '', 'shadowColour' => '#ff0000' ) ), 'box-shadow' ), 'an empty shadow with a colour still emits no box-shadow' );
$preset = run_surface( $section, array( 'shadow' => 'floating' ) );
ok( false !== strpos( $preset, 'box-shadow:var(--wp--preset--shadow--floating)' ), 'a theme preset slug becomes its preset variable' );
ok( false !== strpos( $preset, 'forced-colors' ) && false !== strpos( $preset, 'CanvasText' ), 'a shadow carries the forced-colours outline fallback' );
$raw = run_surface( $section, array( 'shadow' => '0 8px 24px 0', 'shadowColour' => '#00000033' ) );
ok( false !== strpos( $raw, 'box-shadow:0px 8px 24px 0px #00000033;' ), 'a raw single-layer shape is emitted (normalised to px) with its colour' );
ok( false === strpos( run_surface( $section, array( 'shadow' => '0 0 0 red;}body{x' ) ), 'box-shadow:0 0 0 red' ), 'a hostile shadow value is not passed through' );
ok( '' === run_surface( $section, array( 'shadow' => 'x;}body{background:red;}' ) ), 'a hostile shadow value emits nothing' );
ok( '' === run_surface( $section, array( 'shadow' => 'url(javascript:alert(1))' ) ), 'a url() shadow value emits nothing' );

// ── Spec 32: no inline style attribute is written by this section ───────────────
ok( false === strpos( $section, 'style="' ), 'the section writes no inline style attribute (Spec 32)' );

// ── Negative controls: bypassing the shared helpers must be caught ──────────────
// Variant A: the pre-4c behaviour, blur written from the raw attribute with no single-length check.
$bypass_blur = str_replace(
	"sgs_surface_backdrop_decls( \$attributes['surfaceBlur'] ?? '', \$attributes['surfaceSaturate'] ?? null )",
	"array( 'backdrop-filter:blur(' . ( \$attributes['surfaceBlur'] ?? '' ) . ')' )",
	$section
);
ok( $bypass_blur !== $section, 'negative control A: the blur bypass was applied to the extracted text' );
ok( '' !== run_surface( $bypass_blur, array( 'surfaceBlur' => '16px 12px' ) ), 'negative control A: with the helper bypassed, a two-value blur IS emitted (so the refusal test above can fail)' );

// Variant B: shadow written raw, bypassing sgs_shadow_box_decls().
$bypass_shadow = str_replace(
	"sgs_shadow_box_decls( \$sgs_nd_shadow_raw, isset( \$attributes['shadowColour'] ) ? (string) \$attributes['shadowColour'] : '' )",
	"array( 'box-shadow:' . \$sgs_nd_shadow_raw )",
	$section
);
ok( $bypass_shadow !== $section, 'negative control B: the shadow bypass was applied to the extracted text' );
ok( '' !== run_surface( $bypass_shadow, array( 'shadow' => 'x;}body{background:red;}' ) ), 'negative control B: with the composer bypassed, a hostile shadow IS emitted (so the refusal test above can fail)' );

// Variant C: fill written without the helper, so opacity 1 would still emit.
$bypass_fill = str_replace(
	"sgs_surface_fill_alpha( \$sgs_nd_fill_css, \$attributes['surfaceOpacity'] ?? null )",
	"'color-mix(in srgb, ' . \$sgs_nd_fill_css . ' 100%, transparent)'",
	$section
);
ok( $bypass_fill !== $section, 'negative control C: the fill bypass was applied to the extracted text' );
ok( '' !== run_surface( $bypass_fill, array() ), 'negative control C: with the fill helper bypassed, a default drawer IS changed (so the byte-identical test above can fail)' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
