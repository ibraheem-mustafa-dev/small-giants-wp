<?php
/**
 * Standalone runner for the shared surface-ground mechanism (Wave 3C U-1 commit 4a):
 * includes/helpers-surface-ground.php, and its hook in SGS_Container_Wrapper.
 *
 * Plain PHP, no PHPUnit. Exits non-zero on any failure.
 *   php plugins/sgs-blocks/tests/php/run-surface-ground-standalone.php
 *
 * The stubs below are the ones run-container-wrapper-standalone.php uses for its first render.
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

// ── Minimal WordPress function stubs ─────────────────────────────────────────
// Only what SGS_Container_Wrapper::render() + its required helpers actually
// call for the fixtures exercised below (no bg-image/video/svg/shape-divider
// fixture is used, so wp_kses() etc. are deliberately NOT stubbed — if a future
// fixture needs them, add the stub then).

if ( ! function_exists( 'wp_json_encode' ) ) {
	/**
	 * Minimal wp_json_encode() stub — the uid is derived from this.
	 *
	 * @param mixed $data Data to encode.
	 * @return string|false JSON string.
	 */
	function wp_json_encode( $data ) {
		return json_encode( $data ); // phpcs:ignore WordPress.WP.AlternativeFunctions.json_encode_json_encode -- CLI stub.
	}
}

if ( ! function_exists( 'esc_attr' ) ) {
	function esc_attr( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_html' ) ) {
	function esc_html( $text ): string {
		return htmlspecialchars( (string) $text, ENT_QUOTES, 'UTF-8' );
	}
}

if ( ! function_exists( 'esc_url' ) ) {
	function esc_url( $url ): string {
		$filtered = filter_var( (string) $url, FILTER_SANITIZE_URL );
		return $filtered ? $filtered : '';
	}
}

if ( ! function_exists( 'absint' ) ) {
	function absint( $val ): int {
		return abs( (int) $val );
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( string $string ): string {
		return strip_tags( $string );
	}
}

if ( ! function_exists( 'get_block_wrapper_attributes' ) ) {
	/**
	 * Deterministic get_block_wrapper_attributes() stub.
	 *
	 * The REAL WP function reads the current-block global — irrelevant here
	 * since SGS_Container_Wrapper never relies on that global itself (it only
	 * forwards class/style/extra-attrs). Emits `class` first, then the rest in
	 * insertion order, matching WP core's own attribute ordering closely enough
	 * for a byte-stable golden fixture.
	 *
	 * @param array $extra_attrs Extra attributes (class/style/data-*).
	 * @return string HTML attribute string.
	 */
	function get_block_wrapper_attributes( array $extra_attrs = array() ): string {
		$parts = array();
		foreach ( $extra_attrs as $key => $value ) {
			$value = trim( (string) $value, "; \t\n\r\0\x0B" );
			if ( '' === $value ) {
				continue;
			}
			$parts[] = esc_attr( $key ) . '="' . esc_attr( $value ) . '"';
		}
		return implode( ' ', $parts );
	}
}

if ( ! function_exists( 'wp_style_engine_get_styles' ) ) {
	/**
	 * Deterministic wp_style_engine_get_styles() stub for the base-spacing
	 * (padding/margin) scoped-rule path (Spec 32, D293 no-inline contract).
	 * Only supports the 'spacing' => ['padding'=>[...], 'margin'=>[...]] shape
	 * that SGS_Container_Wrapper actually passes — enough to make the base
	 * spacing golden rule deterministic without pulling in real WP.
	 *
	 * @param array $styles  Style-engine style tree.
	 * @param array $options Must contain 'selector'.
	 * @return array{css: string}
	 */
	function wp_style_engine_get_styles( array $styles, array $options = array() ): array {
		$selector = $options['selector'] ?? '';
		$decls    = array();
		foreach ( array( 'padding', 'margin' ) as $box_prop ) {
			if ( empty( $styles['spacing'][ $box_prop ] ) || ! is_array( $styles['spacing'][ $box_prop ] ) ) {
				continue;
			}
			foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
				if ( isset( $styles['spacing'][ $box_prop ][ $side ] ) && '' !== $styles['spacing'][ $box_prop ][ $side ] ) {
					$decls[] = $box_prop . '-' . $side . ':' . $styles['spacing'][ $box_prop ][ $side ];
				}
			}
		}
		if ( ! $decls || '' === $selector ) {
			return array( 'css' => '' );
		}
		return array( 'css' => $selector . '{' . implode( ';', $decls ) . ';}' );
	}
}

require_once dirname( __DIR__, 2 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 2 ) . '/includes/helpers-surface-ground.php';

$pass = 0;
$fail = 0;

function ok( bool $cond, string $label ): void {
	global $pass, $fail;
	if ( $cond ) {
		++$pass;
		echo "PASS  $label
";
	} else {
		++$fail;
		echo "FAIL  $label
";
	}
}

// ── Helper: backdrop declarations ───────────────────────────────────────────────
ok( array() === sgs_surface_backdrop_decls( '', null ), 'nothing set: no declarations' );
ok( array() === sgs_surface_backdrop_decls( '', '' ), 'empty strings: no declarations' );
ok( array( 'backdrop-filter:blur(24px)', '-webkit-backdrop-filter:blur(24px)' ) === sgs_surface_backdrop_decls( '24px', null ), 'blur only' );
ok( array( 'backdrop-filter:saturate(150%)', '-webkit-backdrop-filter:saturate(150%)' ) === sgs_surface_backdrop_decls( '', 150 ), 'saturate only' );
ok( array( 'backdrop-filter:saturate(150%) blur(24px)', '-webkit-backdrop-filter:saturate(150%) blur(24px)' ) === sgs_surface_backdrop_decls( '24px', 150 ), 'saturate then blur' );
ok( array( 'backdrop-filter:saturate(0%)', '-webkit-backdrop-filter:saturate(0%)' ) === sgs_surface_backdrop_decls( '', 0 ), 'saturate 0 is a legal value (not treated as empty)' );
ok( array( 'backdrop-filter:saturate(500%)', '-webkit-backdrop-filter:saturate(500%)' ) === sgs_surface_backdrop_decls( '', 9999 ), 'saturate is clamped to 500' );
ok( array() === sgs_surface_backdrop_decls( '16px 12px', null ), 'a two-value blur (invalid inside blur()) emits nothing' );
ok( array() === sgs_surface_backdrop_decls( 'red;}body{x', null ), 'a declaration breakout emits nothing' );
ok( array() === sgs_surface_backdrop_decls( '', 'abc' ), 'a non-numeric saturate emits nothing' );

// ── Helper: fill translucency ───────────────────────────────────────────────────
ok( 'color-mix(in srgb, #ffffff 86%, transparent)' === sgs_surface_fill_alpha( '#ffffff', 0.86 ), 'a hex fill is mixed at 86%' );
ok( 'color-mix(in srgb, #ffffff 0%, transparent)' === sgs_surface_fill_alpha( '#ffffff', 0 ), 'opacity 0 is legal (fully transparent)' );
ok( '' === sgs_surface_fill_alpha( '#ffffff', 1 ), 'opacity 1 leaves the fill alone' );
ok( '' === sgs_surface_fill_alpha( '#ffffff', null ), 'no opacity leaves the fill alone' );
ok( '' === sgs_surface_fill_alpha( '', 0.5 ), 'an empty fill cannot be made translucent' );
ok( '' === sgs_surface_fill_alpha( 'linear-gradient(90deg,#000,#fff)', 0.5 ), 'a gradient fill is left alone' );
ok( 'color-mix(in srgb, var(--wp--preset--color--surface, transparent) 50%, transparent)' === sgs_surface_fill_alpha( 'var(--wp--preset--color--surface, currentColor)', 0.5 ), 'an orphan token falls back to transparent, not the text colour' );

// ── Wrapper hook ────────────────────────────────────────────────────────────────
$base = array(
	'layout'       => 'flex',
	'maxWidth'     => '1200px',
	'contentWidth' => 'normal',
	'gap'          => '24px',
	'style'        => array( 'spacing' => array( 'padding' => array( 'top' => '40px', 'bottom' => '40px' ) ) ),
);
$plain   = SGS_Container_Wrapper::render( $base, null, '<p>x</p>', 'section' );
$blurred = SGS_Container_Wrapper::render( $base + array( 'surfaceBlur' => '24px', 'surfaceSaturate' => 150 ), null, '<p>x</p>', 'section' );
$only_b  = SGS_Container_Wrapper::render( $base + array( 'surfaceBlur' => '8px' ), null, '<p>x</p>', 'section' );
$bad     = SGS_Container_Wrapper::render( $base + array( 'surfaceBlur' => '16px 12px' ), null, '<p>x</p>', 'section' );

ok( false !== strpos( $blurred, 'backdrop-filter:saturate(150%) blur(24px)' ), 'wrapper: a block declaring surfaceBlur and surfaceSaturate emits backdrop-filter' );
ok( false !== strpos( $blurred, '-webkit-backdrop-filter:saturate(150%) blur(24px)' ), 'wrapper: the -webkit- twin is emitted' );
ok( false !== strpos( $only_b, 'backdrop-filter:blur(8px)' ), 'wrapper: blur alone' );
ok( false === strpos( $plain, 'backdrop-filter' ), 'wrapper: NEGATIVE CONTROL - a block that declares neither emits no backdrop-filter' );
ok( false === strpos( $bad, 'backdrop-filter' ), 'wrapper: an invalid blur emits nothing' );
ok( false === strpos( $blurred, 'style="' ), 'wrapper: no inline style attribute (Spec 32)' );

echo "
==== $pass passed, $fail failed ====
";
exit( $fail > 0 ? 1 : 0 );
