<?php
/**
 * SGS Colour Helpers
 *
 * Palette generation using spatie/color.
 * Requires Composer autoloader (registered in sgs-blocks.php).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

use Spatie\Color\Hex;
use Spatie\Color\Hsl;

/**
 * Generate a 10-step tint/shade scale from a single brand hex.
 *
 * Returns an associative array of CSS custom property names → hex values:
 *   [ '--sgs-{name}-50' => '#f0fafa', '--sgs-{name}-500' => '#0F7E80', ... ]
 *
 * Steps: 50, 100, 200, 300, 400, 500 (base), 600, 700, 800, 900
 *
 * @param string $hex  Brand hex string. Accepts '#0F7E80' or '0F7E80'.
 * @param string $name CSS custom property prefix, e.g. 'primary', 'accent'.
 * @return array<string,string> Token name => hex value.
 */
function sgs_generate_palette( string $hex, string $name = 'primary' ): array {
	if ( ! class_exists( Hex::class ) ) {
		return [];
	}

	try {
		$colour   = Hex::fromString( ltrim( $hex, '#' ) );
		$hsl      = $colour->toHsl();
		$h        = $hsl->hue();
		$s        = $hsl->saturation();
		$base_l   = $hsl->lightness();
	} catch ( \Exception $e ) {
		return [];
	}

	/**
	 * Lightness targets per step.
	 * 500 = base colour. Steps above lighten, steps below darken.
	 * Values are absolute lightness percentages (clamped to 5–95).
	 */
	$lightness_map = [
		 50  => 97,
		100  => 93,
		200  => 84,
		300  => 72,
		400  => 58,
		500  => $base_l,            // exact brand colour
		600  => max(  5, $base_l - 12 ),
		700  => max(  5, $base_l - 22 ),
		800  => max(  5, $base_l - 32 ),
		900  => max(  5, $base_l - 42 ),
	];

	$tokens = [];

	foreach ( $lightness_map as $step => $lightness ) {
		$lightness = min( 95, max( 5, round( $lightness ) ) );

		try {
			$token_hex = Hsl::fromString( "hsl({$h},{$s}%,{$lightness}%)" )
				->toHex()
				->__toString();
		} catch ( \Exception $e ) {
			continue;
		}

		$tokens[ "--sgs-{$name}-{$step}" ] = '#' . ltrim( $token_hex, '#' );
	}

	return $tokens;
}

/**
 * Register a generated palette as WordPress theme colour presets.
 *
 * Call this in an 'after_setup_theme' hook or block init.
 * Generated colours will appear in the Gutenberg colour picker
 * under a labelled group.
 *
 * @param string $hex   Brand hex.
 * @param string $name  Internal name ('primary', 'accent', etc.).
 * @param string $label Human-readable label ('Brand Primary', etc.).
 */
function sgs_register_palette( string $hex, string $name, string $label ): void {
	$tokens = sgs_generate_palette( $hex, $name );
	if ( empty( $tokens ) ) {
		return;
	}

	$presets = [];
	foreach ( $tokens as $property => $value ) {
		// Extract step number from '--sgs-primary-500' → '500'.
		preg_match( '/(\d+)$/', $property, $m );
		$step = $m[1] ?? '0';

		$presets[] = [
			'name'  => "{$label} {$step}",
			'slug'  => "{$name}-{$step}",
			'color' => $value,
		];
	}

	add_theme_support( 'editor-color-palette', $presets );
}

/**
 * Output a palette as inline CSS custom properties on a given element.
 *
 * Typically called in render.php to expose palette tokens as block-scoped
 * CSS variables, or in wp_head to register globally.
 *
 * @param string $hex  Brand hex.
 * @param string $name Token prefix ('primary', 'accent', etc.).
 * @return string CSS custom property declarations (no selector wrapping).
 *
 * Example output:
 *   --sgs-primary-50:#f0fafa;--sgs-primary-500:#0F7E80;...
 */
function sgs_palette_css( string $hex, string $name = 'primary' ): string {
	$tokens = sgs_generate_palette( $hex, $name );
	if ( empty( $tokens ) ) {
		return '';
	}

	return implode( ';', array_map(
		fn( $k, $v ) => esc_attr( $k ) . ':' . esc_attr( $v ),
		array_keys( $tokens ),
		$tokens
	) ) . ';';
}
