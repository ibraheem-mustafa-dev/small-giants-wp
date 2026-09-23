<?php
/**
 * Standalone tests for the automatic hover shadow: includes/helpers-shadow-hover.php.
 *
 * Design: `.claude/reports/2026-09-23-shadow-hover-lift-design.md` (H1/H2). Covers the map
 * lookup (preset -> preset, preset -> literal, no entry), the procedural lift for a custom
 * layered shape, the literal-validation gate (a hostile snapshot value must yield ''), and the
 * real theme.json's own map (nothing else binds this test to what the theme actually ships).
 *
 *   php plugins/sgs-blocks/tests/php/run-shadow-hover-standalone.php
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
if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}
$GLOBALS['sgs_test_hover_map'] = array();
if ( ! function_exists( 'wp_get_global_settings' ) ) {
	function wp_get_global_settings( array $path ) {
		if ( 'custom' === $path[0] && 'shadowHover' === ( $path[1] ?? null ) ) {
			return $GLOBALS['sgs_test_hover_map'];
		}
		return null;
	}
}
require_once dirname( __DIR__, 2 ) . '/includes/helpers-tokens.php';

$fail = 0;
function t_eq( $expected, $actual, string $label, bool $quiet = false ): void {
	global $fail;
	if ( $expected !== $actual ) {
		++$fail;
		if ( ! $quiet ) {
			fwrite( STDERR, "FAIL {$label}\n  expected: " . json_encode( $expected ) . "\n  actual:   " . json_encode( $actual ) . "\n" );
		}
	}
}

// ── `none`, empty and unparseable resting shapes never hover ───────────────────────
$GLOBALS['sgs_test_hover_map'] = array( 'soft' => 'lifted' );
t_eq( '', sgs_shadow_hover_value( 'none', null ), '"none" has no hover' );
t_eq( '', sgs_shadow_hover_value( 'NONE', null ), '"NONE" is case-insensitively none' );
t_eq( '', sgs_shadow_hover_value( '', null ), 'empty shape has no hover' );
t_eq( '', sgs_shadow_hover_value( null, null ), 'null shape has no hover' );
t_eq( '', sgs_shadow_hover_value( '   ', null ), 'whitespace shape has no hover' );
t_eq( '', sgs_shadow_hover_value( 'inset', null ), 'the word inset alone has no hover' );

// ── A preset slug with a map entry that is ANOTHER preset slug ─────────────────────
t_eq( 'var(--wp--preset--shadow--lifted)', sgs_shadow_hover_value( 'soft', null ), 'a preset-to-preset hover becomes a preset variable reference' );
t_eq( 'var(--wp--preset--shadow--lifted)', sgs_shadow_hover_value( 'Soft', '#FF0000' ), 'a preset slug is case-insensitive and ignores the resting colour' );

// ── A preset slug with a map entry that is a LITERAL ───────────────────────────────
$GLOBALS['sgs_test_hover_map'] = array( 'floating' => '0px 3px 5px 0px #000000' );
t_eq( 'var(--wp--custom--shadow-hover--floating)', sgs_shadow_hover_value( 'floating', null ), 'a literal hover becomes the generated custom-property reference, keyed by the RESTING slug' );

// ── A preset slug with no map entry ─────────────────────────────────────────────────
$GLOBALS['sgs_test_hover_map'] = array( 'soft' => 'lifted' );
t_eq( '', sgs_shadow_hover_value( 'floating', null ), 'a preset slug with no map entry has no hover' );
t_eq( '', sgs_shadow_hover_value( 'nonexistent-preset', null ), 'an unknown preset slug has no hover' );

// ── Every map literal is validated through the strict parser before being trusted ──
// (A layer whose EMBEDDED colour is hostile text is sanitised into a harmless var() slug by the
// composer itself — see the golden "breakout in a shape" case — so the literal to prove the
// validation gate here is one the composer refuses outright: an unclosed comment opener.)
$GLOBALS['sgs_test_hover_map'] = array( 'soft' => '0px 0px 0px 0px /* #000' );
t_eq( '', sgs_shadow_hover_value( 'soft', null ), 'a map literal the composer cannot parse fails validation and yields no hover, not a reference to it' );
$GLOBALS['sgs_test_hover_map'] = array( 'soft' => '0 1px 2px color-mix(in srgb, red;}body{x:y 10%, transparent)' );
t_eq( '', sgs_shadow_hover_value( 'soft', null ), 'a hostile color-mix() inner value also fails validation' );
$GLOBALS['sgs_test_hover_map'] = array( 'soft' => '' );
t_eq( '', sgs_shadow_hover_value( 'soft', null ), 'an empty-string map entry is treated as no entry' );

// Negative control: prove the validation gate CAN fail, by showing the SAME literal, if
// trusted unvalidated (skipping straight to the var() reference), would carry no visible
// danger sign either -- the gate is the only thing standing between an unparseable literal
// and a reference to a custom property nothing ever declares a safe fallback for.
$GLOBALS['sgs_test_hover_map'] = array( 'soft' => '0px 0px 0px 0px /* #000' );
t_eq(
	true,
	'' === sgs_shadow_layers( $GLOBALS['sgs_test_hover_map']['soft'], null ),
	'negative control: the underlying composer itself also refuses the same literal (the gate is not inventing a stricter rule)'
);

// ── A custom layered shape (not a preset slug) lifts procedurally ─────────────────
$GLOBALS['sgs_test_hover_map'] = array();
t_eq(
	'0px 5px 15px 0px #000000',
	sgs_shadow_hover_value( '0px 4px 12px 0px', '#000000' ),
	'y and blur are multiplied by 1.25 and rounded to a whole pixel; spread and colour unchanged'
);
t_eq(
	'0px 5px 15px 0px #000000, inset 0px 2px 4px 0px #000000',
	sgs_shadow_hover_value( '0px 4px 12px 0px, inset 0px 2px 4px 0px', '#000000' ),
	'an inset layer is carried through unchanged while outer layers lift'
);
t_eq(
	'0px 1px 3px -3px #000000',
	sgs_shadow_hover_value( '0px 1px 2px -3px', '#000000' ),
	'spread (the fourth length) is never touched by the lift; y 1*1.25=1.25 rounds to 1, blur 2*1.25=2.5 rounds to 3'
);
t_eq(
	'0px 5px 15px 0px red',
	sgs_shadow_hover_value( '0px 4px 12px 0px red', null ),
	'a layer that carries its own embedded colour keeps it through the lift, ignoring the colour argument'
);
t_eq(
	'0px 3px 5px 0px color-mix(in srgb, var(--wp--custom--shadow-colour) 10%, transparent), 0px 10px 20px 0px color-mix(in srgb, var(--wp--custom--shadow-colour) 10%, transparent)',
	sgs_shadow_hover_value( '0px 2px 4px 0px, 0px 8px 16px 0px', null ),
	'the real theme floating-preset ratio, lifted, with no colour argument falls back to the default'
);

// ── Grammar rejection: anything the composer itself would reject yields '' too ─────
t_eq( '', sgs_shadow_hover_value( '0px 0px -4px 0px', '#000000' ), 'a negative blur is not a layer; the lift refuses it' );
t_eq( '', sgs_shadow_hover_value( '0 2px inset 4px', '#000000' ), 'inset in the middle is not a layer; the lift refuses it' );
t_eq( '', sgs_shadow_hover_value( str_repeat( '0px 1px 2px 0px, ', 9 ) . '0px 1px 2px 0px', '#000000' ), 'ten layers exceed the layer cap' );
t_eq(
	'',
	sgs_shadow_hover_value( '0px 0px 0px red) blur(9999px', '#000000' ),
	'a filter-smuggle layer is dropped by the underlying composer, leaving nothing to draw'
);

// ── The real theme.json map: nothing else binds this test to what the theme ships ─
$theme_path = dirname( __DIR__, 4 ) . '/theme/sgs-theme/theme.json';
t_eq( true, is_readable( $theme_path ), 'the real theme.json is found at ' . $theme_path );
$theme_json         = json_decode( (string) file_get_contents( $theme_path ), true );
$real_hover_map     = $theme_json['settings']['custom']['shadowHover'] ?? array();
$real_presets       = $theme_json['settings']['shadow']['presets'] ?? array();
$real_preset_slugs  = array_column( $real_presets, 'slug' );
t_eq( true, count( $real_hover_map ) > 1, 'the real theme.json declares a shadow hover map (' . count( $real_hover_map ) . ')' );
t_eq(
	count( $real_preset_slugs ),
	count( array_intersect( $real_preset_slugs, array_keys( $real_hover_map ) ) ),
	'every real preset has a hover map entry'
);
$GLOBALS['sgs_test_hover_map'] = $real_hover_map;
$with_hover                    = 0;
foreach ( $real_preset_slugs as $slug ) {
	$value = sgs_shadow_hover_value( $slug, null );
	if ( '' !== $value ) {
		++$with_hover;
	}
	t_eq( true, '' !== $value, 'real preset "' . $slug . '" resolves to a real hover value' );
	if ( '' !== $value ) {
		t_eq( 1, preg_match( '/^var\(--wp--(?:preset--shadow|custom--shadow-hover)--[a-z0-9-]+\)$/', $value ), 'real preset "' . $slug . '" hover is a var() reference, never a raw literal' );
	}
}
t_eq( count( $real_preset_slugs ), $with_hover, 'every real preset resolves to a hover value (' . $with_hover . ' of ' . count( $real_preset_slugs ) . ')' );
t_eq( 'pressed', $real_hover_map['pressed'] ?? null, 'pressed lifts to itself (the inset "pushed in" look stays as it is)' );

// ── Negative control: the harness must be able to fail ──────────────────────────────
$before = $fail;
t_eq( 'x', 'y', 'deliberate mismatch (expected to fail)', true );
if ( $fail === $before + 1 ) {
	$fail = $before;
} else {
	fwrite( STDERR, "FAIL negative control: the harness did not report the deliberate mismatch\n" );
}

/**
 * Negative-control stub: never lifts anything, just composes the resting value unchanged.
 * The lift assertions above must be caught by this stub, proving they can fail.
 *
 * @param string|null $shape  Resting shape.
 * @param string|null $colour Resting colour.
 * @return string The resting value, composed but never lifted.
 */
function sgs_shadow_hover_value_passthrough_stub( ?string $shape, ?string $colour ): string {
	return sgs_shadow_layers( $shape, $colour );
}
$caught = 0;
foreach (
	array(
		array( '0px 4px 12px 0px', '#000000', '0px 5px 15px 0px #000000' ),
		array( '0px 4px 12px 0px, inset 0px 2px 4px 0px', '#000000', '0px 5px 15px 0px #000000, inset 0px 2px 4px 0px #000000' ),
	) as $case
) {
	if ( sgs_shadow_hover_value_passthrough_stub( $case[0], $case[1] ) !== $case[2] ) {
		++$caught;
	}
}
t_eq( true, $caught >= 2, "negative control: a passthrough stub (no lift) is caught by {$caught} of 2 lift cases" );

echo $fail ? "Shadow hover: {$fail} failed\n" : "Shadow hover: all passed\n";
exit( $fail > 0 ? 1 : 0 );
