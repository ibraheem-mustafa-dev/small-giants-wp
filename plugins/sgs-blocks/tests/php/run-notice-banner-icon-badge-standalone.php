<?php
/**
 * Standalone runner for sgs/notice-banner's icon size + circle/rounded-square
 * badge (`includes/notice-banner-icon-badge.php`), mirroring
 * sgs/trust-bar's icon-circle attribute family (trust-bar/render.php +
 * block.json) through notice-banner's own no-inline `$scoped_css` contract.
 *
 * Same constraint as run-notice-message-standalone.php: render.php cannot be
 * executed whole outside WordPress here (its ~30-file render-helpers.php
 * loader). This runner instead unit-tests the new PURE functions in
 * includes/notice-banner-icon-badge.php directly — real file, real requires
 * (only helpers-tokens.php, helpers-hover-state.php and helpers-box.php are
 * needed, all self-contained aside from esc_attr(), stubbed below).
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-notice-banner-icon-badge-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

// CLI test harness (not shipped code).
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound
// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// phpcs:disable Squiz.PHP.Eval.Discouraged

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', dirname( __DIR__, 2 ) . '/' );
}

// ── Minimal WordPress function stubs (mirrors run-notice-message-standalone.php) ──
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
if ( ! function_exists( '__' ) ) {
	function __( $text, $domain = 'default' ): string {
		return $text;
	}
}

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

require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-hover-state.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-box.php';
require_once dirname( __DIR__, 2 ) . '/includes/notice-banner-icon-badge.php';

$root_sel = '.sgs-notice-banner-test.wp-block-sgs-notice-banner';

// ════════════════════════════════════════════════════════════════════════════
// 1. Bare default emits NO badge CSS at all — and no glyph-size override
// either (iconSize's own default, 20, matches style.css's own default).
// ════════════════════════════════════════════════════════════════════════════
$bare_default_css = sgs_notice_banner_icon_badge_css( array(), $root_sel );
ok( array() === $bare_default_css, 'BARE DEFAULT: an attributes array with none of the new keys emits zero scoped CSS' );

$bare_explicit_css = sgs_notice_banner_icon_badge_css(
	array(
		'iconStyle' => 'bare',
		'iconSize'  => 20,
	),
	$root_sel
);
ok( array() === $bare_explicit_css, 'BARE, explicit defaults: iconStyle=bare + iconSize=20 (the schema defaults) still emit zero scoped CSS' );

// Same case, framed as the required "no new attributes" byte-identical
// claim: a banner rendered before this feature existed passes an $attributes
// array with none of the new keys; the scoped CSS this function contributes
// must be identical (empty) to what it contributed before the feature shipped
// (nothing — the function did not exist).
ok(
	array() === sgs_notice_banner_icon_badge_css(
		array(
			'variant' => 'info',
			'text'    => 'Hello',
		),
		$root_sel
	),
	'NO NEW ATTRIBUTES: an old-shape $attributes array (pre-existing keys only) produces no new CSS — byte-identical to before this feature'
);

// ════════════════════════════════════════════════════════════════════════════
// 2. Circle emits background, radius, size.
// ════════════════════════════════════════════════════════════════════════════
$circle_css        = sgs_notice_banner_icon_badge_css(
	array(
		'iconStyle'              => 'circle',
		'iconCircleSize'         => 60,
		'iconCircleBackground'   => 'accent',
		'iconCircleBorderRadius' => '12px',
	),
	$root_sel
);
$circle_css_joined = implode( '', $circle_css );
ok( false !== strpos( $circle_css_joined, '.sgs-notice-banner__icon--circle{width:60px;height:60px;}' ), 'CIRCLE: badge size (iconCircleSize) is emitted' );
ok( false !== strpos( $circle_css_joined, 'background-color:var(--wp--preset--color--accent, currentColor)' ), 'CIRCLE: badge background colour (iconCircleBackground) is emitted, resolved via sgs_colour_value()' );
ok( false !== strpos( $circle_css_joined, 'border-radius:12px' ), 'CIRCLE: badge border-radius (iconCircleBorderRadius) is emitted' );

// A circle badge left on every default still emits nothing (mirrors the bare
// case above) — only a genuine operator change adds CSS.
ok( array() === sgs_notice_banner_icon_badge_css( array( 'iconStyle' => 'circle' ), $root_sel ), 'CIRCLE, no other overrides: iconCircleSize=44/Background=surface/BorderRadius=50%/Shadow=none (all defaults) emit zero scoped CSS' );

// ════════════════════════════════════════════════════════════════════════════
// 3. Radius sanitiser strips a `;}` injection attempt.
// ════════════════════════════════════════════════════════════════════════════
$malicious_radius = '50%;} body{color:red';
$safe_radius      = sgs_notice_banner_icon_circle_radius( $malicious_radius );
ok( false === strpos( $safe_radius, ';' ), 'RADIUS SANITISER: the semicolon of a `;}` breakout attempt is stripped' );
ok( false === strpos( $safe_radius, '{' ) && false === strpos( $safe_radius, '}' ), 'RADIUS SANITISER: the curly braces of a `;}` breakout attempt are stripped' );

$injection_css        = sgs_notice_banner_icon_badge_css(
	array(
		'iconStyle'              => 'circle',
		'iconCircleBorderRadius' => $malicious_radius,
	),
	$root_sel
);
$injection_css_joined = implode( '', $injection_css );
ok( 1 === substr_count( $injection_css_joined, '{' ) - 0 && false === strpos( $injection_css_joined, '}body' ), 'RADIUS SANITISER (through the full CSS builder): the malicious value cannot break out of the border-radius declaration it is concatenated into' );

// ════════════════════════════════════════════════════════════════════════════
// 4. Off-enum border style falls back.
// ════════════════════════════════════════════════════════════════════════════
ok( '' === sgs_notice_banner_icon_circle_border_style( '' ), 'BORDER STYLE: unset (empty string) stays empty (falls through to style.css\'s own solid default)' );
ok( 'dashed' === sgs_notice_banner_icon_circle_border_style( 'dashed' ), 'BORDER STYLE: an allow-listed value passes through unchanged' );
ok( 'solid' === sgs_notice_banner_icon_circle_border_style( 'not-a-real-style' ), 'BORDER STYLE: an off-enum value falls back to solid, never fatals' );
ok( '' === sgs_notice_banner_icon_circle_border_style( array( 'not', 'a', 'string' ) ), 'BORDER STYLE: a non-scalar value coerces to \'\' (treated as unset), never fatals' );

// ════════════════════════════════════════════════════════════════════════════
// 5. iconSize / iconCircleSize clamps.
// ════════════════════════════════════════════════════════════════════════════
ok( 20 === sgs_notice_banner_clamp_icon_size( 20 ), 'ICON SIZE CLAMP: the default (20) passes through' );
ok( 96 === sgs_notice_banner_clamp_icon_size( 500 ), 'ICON SIZE CLAMP: a too-large value clamps to 96' );
ok( 8 === sgs_notice_banner_clamp_icon_size( 1 ), 'ICON SIZE CLAMP: a too-small value clamps to 8' );
ok( 20 === sgs_notice_banner_clamp_icon_size( 'not-a-number' ), 'ICON SIZE CLAMP: a non-numeric value falls back to the 20px default' );

ok( 44 === sgs_notice_banner_clamp_icon_circle_size( 44 ), 'BADGE SIZE CLAMP: the default (44) passes through' );
ok( 96 === sgs_notice_banner_clamp_icon_circle_size( 500 ), 'BADGE SIZE CLAMP: a too-large value clamps to 96' );
ok( 24 === sgs_notice_banner_clamp_icon_circle_size( 1 ), 'BADGE SIZE CLAMP: a too-small value clamps to 24 (badges have a higher floor than the bare glyph)' );
ok( 44 === sgs_notice_banner_clamp_icon_circle_size( 'nonsense' ), 'BADGE SIZE CLAMP: a non-numeric value falls back to the 44px default' );

// Glyph size override only emitted when it actually differs from 20.
$size_css        = sgs_notice_banner_icon_badge_css( array( 'iconSize' => 32 ), $root_sel );
$size_css_joined = implode( '', $size_css );
ok( false !== strpos( $size_css_joined, 'font-size:32px' ) && false !== strpos( $size_css_joined, 'svg{width:32px;height:32px;}' ), 'ICON SIZE: a genuine override (32) emits font-size + svg width/height' );
ok( array() === sgs_notice_banner_icon_badge_css( array( 'iconSize' => 20 ), $root_sel ), 'ICON SIZE: an explicit 20 (the default) emits nothing, matching the unset case' );

// ════════════════════════════════════════════════════════════════════════════
// NEGATIVE CONTROL — with the radius guard removed, the same malicious input
// used in test 3 must be able to break out of the declaration, proving that
// assertion watches a real, removable guard rather than being vacuously true.
// ════════════════════════════════════════════════════════════════════════════
$source = (string) file_get_contents( dirname( __DIR__, 2 ) . '/includes/notice-banner-icon-badge.php' );

$sanitiser_needle = "\t\t\$safe = preg_replace( '/[^A-Za-z0-9\\s%().,\\-]/', '', \$value );\n";
ok( false !== strpos( $source, $sanitiser_needle ), 'negative control setup: the exact sanitiser line is found in the shipped source (so the mutation below is real, not a typo that no-ops)' );

// Mutated function: identical to the shipped one, MINUS the sanitisation —
// an unsafe passthrough, under a different name so it never collides with
// the real (safe) one already loaded above.
$mutated_source = str_replace(
	$sanitiser_needle,
	"\t\t\$safe = \$value; // UNSAFE_TEST_ONLY -- sanitiser deliberately removed\n",
	$source
);
$mutated_source = str_replace(
	'sgs_notice_banner_icon_circle_radius',
	'sgs_notice_banner_icon_circle_radius_UNSAFE_TEST_ONLY',
	$mutated_source
);
// Every OTHER function in the file is already loaded (function_exists-guarded
// above) — redeclaring them under the same names would fatal, so isolate
// just the one mutated function by extracting its body between its own
// markers (same "extract, don't eval the whole file" discipline as
// run-notice-message-standalone.php's extract_section()).
$fn_start = strpos( $mutated_source, 'function sgs_notice_banner_icon_circle_radius_UNSAFE_TEST_ONLY' );
$fn_start = strrpos( substr( $mutated_source, 0, $fn_start ), 'if ( ! function_exists' );
ok( false !== $fn_start, 'negative control setup: the enclosing function_exists() guard is found before the mutated function' );
$fn_end     = strpos( $mutated_source, "\n}\n", $fn_start ) + 3;
$mutated_fn = substr( $mutated_source, $fn_start, $fn_end - $fn_start );

ok( false !== strpos( $mutated_fn, 'UNSAFE_TEST_ONLY' ) && false === strpos( $mutated_fn, 'preg_replace' ), 'negative control setup: the extracted mutated function genuinely has the sanitiser removed (no preg_replace left)' );

eval( $mutated_fn ); // phpcs:ignore Squiz.PHP.Eval.Discouraged -- CLI harness evaluating a deliberately-unsafe mutation for the negative control only.

$unsafe_result = sgs_notice_banner_icon_circle_radius_UNSAFE_TEST_ONLY( $malicious_radius );
ok(
	false !== strpos( $unsafe_result, ';' ) && false !== strpos( $unsafe_result, '{' ) && false !== strpos( $unsafe_result, '}' ),
	'NEGATIVE CONTROL: with the sanitiser removed, the SAME malicious input keeps its `;`, `{` and `}` — the "no breakout" assertion in test 3 goes RED for this mutation, proving it watches the real guard'
);

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
