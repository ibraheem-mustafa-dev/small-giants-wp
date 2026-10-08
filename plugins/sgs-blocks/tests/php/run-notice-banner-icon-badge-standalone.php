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
require_once __DIR__ . '/stubs/style-engine-border-radius.php';
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
// 3. A `;}` injection in the radius cannot break out of its declaration.
// The badge border goes through sgs_border_element_decls(); its radius reader,
// sgs_border_radius_tiers(), runs a uniform string through sgs_css_length_value().
// ════════════════════════════════════════════════════════════════════════════
$malicious_radius = '50%;} body{color:red';

/**
 * True when CSS carries the breakout: the injected rule or its property.
 *
 * @param string $css CSS to inspect.
 */
function breaks_out( string $css ): bool {
	return false !== strpos( $css, 'body{' ) || false !== strpos( $css, 'color:red' );
}

ok( null === sgs_border_radius_tiers( array( 'borderRadius' => $malicious_radius ) )['base'], 'RADIUS SANITISER: the radius reader rejects a `;}` breakout string outright (no radius)' );

$injection_css_joined = implode(
	'',
	sgs_notice_banner_icon_badge_css(
		array(
			'iconStyle'              => 'circle',
			'iconCircleBorderRadius' => $malicious_radius,
		),
		$root_sel
	)
);
ok( ! breaks_out( $injection_css_joined ), 'RADIUS SANITISER (through the full CSS builder): the malicious value cannot break out of the border-radius declaration' );

$legit_css = implode(
	'',
	sgs_notice_banner_icon_badge_css(
		array(
			'iconStyle'              => 'circle',
			'iconCircleBorderRadius' => '12px',
		),
		$root_sel
	)
);
ok( false !== strpos( $legit_css, 'border-radius:12px' ), 'RADIUS: a legitimate radius still prints' );

// ════════════════════════════════════════════════════════════════════════════
// 4. Border style: an allow-listed style passes; an off-enum or non-string
// value paints solid, the framework rule for a set width.
// ════════════════════════════════════════════════════════════════════════════
$style_css = static function ( $style ) use ( $root_sel ): string {
	return implode(
		'',
		sgs_notice_banner_icon_badge_css(
			array(
				'iconStyle'             => 'circle',
				'iconCircleBorderWidth' => array( 'top' => '2px' ),
				'iconCircleBorderStyle' => $style,
			),
			$root_sel
		)
	);
};
ok( false !== strpos( $style_css( 'dashed' ), 'border-style:dashed' ), 'BORDER STYLE: an allow-listed value passes through unchanged' );
ok( false !== strpos( $style_css( 'not-a-real-style' ), 'border-style:solid' ), 'BORDER STYLE: an off-enum value falls back to solid, never fatals' );
ok( false !== strpos( $style_css( array( 'not', 'a', 'string' ) ), 'border-style:solid' ), 'BORDER STYLE: a non-scalar value falls back to solid, never fatals' );

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
// NEGATIVE CONTROL — the breakout check in test 3 is not vacuous: the same
// malicious value concatenated without the sanitiser turns it RED.
// ════════════════════════════════════════════════════════════════════════════
ok( breaks_out( $root_sel . '{border-radius:' . $malicious_radius . ';}' ), 'NEGATIVE CONTROL: an unsanitised border-radius declaration built from the same input IS caught as a breakout' );

echo "\n==== $pass passed, $fail failed ====\n";
exit( $fail > 0 ? 1 : 0 );
