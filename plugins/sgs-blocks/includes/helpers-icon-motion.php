<?php
/**
 * Hover motion and shadow custom properties for `sgs/icon` and the `sgs/social-icons` row.
 *
 * One reader for both blocks: an icon prints `--sgs-icon-*` and a row prints `--sgs-si-*` (its group defaults), and
 * `src/blocks/icon/style.css` reads own value, then the row's, then the default. Values are numbers or validated
 * keywords, never raw strings, so nothing reaches a stylesheet unchecked.
 *
 * - Hover move: `hover-x` / `hover-y` (px, +-40) and `hover-rotate` (deg, +-180), added to the hover transform.
 * - Motion: `move-duration` (the transform) and `paint-duration` (shadow, colours, borders) in ms; `move-easing`.
 * - Shadow: `shadow` (resting) and `shadow-hover`, composed by the shared shadow composer (`sgs_shadow_decls()`), so
 *   colours come from the site colour, the palette or a hex, and a preset slug keeps its automatic hover partner.
 *
 * Editor twin: `src/blocks/icon/icon-motion.js`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-motion-easing.php';
require_once __DIR__ . '/helpers-colour-variants.php';
require_once __DIR__ . '/helpers-shadow-hover.php';

if ( ! function_exists( 'sgs_icon_motion_decls' ) ) {
	/**
	 * The hover-move and motion custom properties for one set of values.
	 *
	 * An unset or zero value prints nothing, so an untouched icon is unaffected and a wrapping row's default shows
	 * through.
	 *
	 * @param array  $values {
	 *     Raw stored values (numbers, or '' / null for unset).
	 *
	 *     @type mixed  $x             Hover move along x, px.
	 *     @type mixed  $y             Hover move along y, px.
	 *     @type mixed  $rotate        Hover rotation, deg.
	 *     @type mixed  $move_ms       Transform duration, ms.
	 *     @type mixed  $paint_ms      Shadow, colour and border duration, ms.
	 *     @type string $easing        Named easing for the transform (see sgs_motion_easing_css()).
	 *     @type string $easing_custom A cubic-bezier() curve, read when easing is `custom`.
	 * }
	 * @param string $prefix `--sgs-icon` or `--sgs-si`.
	 * @return string[] Declarations ('--sgs-icon-hover-x:-2px').
	 */
	function sgs_icon_motion_decls( array $values, string $prefix ): array {
		$out   = array();
		$moves = array(
			'hover-x'      => array( $values['x'] ?? null, 40.0, 'px' ),
			'hover-y'      => array( $values['y'] ?? null, 40.0, 'px' ),
			'hover-rotate' => array( $values['rotate'] ?? null, 180.0, 'deg' ),
		);
		foreach ( $moves as $name => $spec ) {
			if ( is_numeric( $spec[0] ) && abs( (float) $spec[0] ) > 0.001 ) {
				$clamped = max( -$spec[1], min( $spec[1], (float) $spec[0] ) );
				$out[]   = $prefix . '-' . $name . ':' . round( $clamped, 2 ) . $spec[2];
			}
		}
		foreach ( array(
			'move-duration'  => $values['move_ms'] ?? null,
			'paint-duration' => $values['paint_ms'] ?? null,
		) as $name => $raw ) {
			$ms = sgs_motion_ms( $raw, 0 );
			if ( $ms > 0 ) {
				$out[] = $prefix . '-' . $name . ':' . $ms . 'ms';
			}
		}
		$easing = trim( (string) ( $values['easing'] ?? '' ) );
		if ( '' !== $easing ) {
			$css = sgs_motion_easing_css( $easing, (string) ( $values['easing_custom'] ?? '' ), '' );
			if ( '' !== $css ) {
				$out[] = $prefix . '-move-easing:' . $css;
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_icon_shadow_vars' ) ) {
	/**
	 * The resting and hover shadow as custom properties.
	 *
	 * `$pin_hover` (an icon with a shadow of its own): when the hover resolves to nothing, the hover is pinned to the
	 * resting shadow, so a wrapping row's hover shadow cannot replace the icon's own resting one.
	 *
	 * @param array  $attributes Attributes holding the shadow (and `shadowLiftOnHover`).
	 * @param array  $map        Attribute names: base, colour, hover, hover_colour (see sgs_shadow_decls()).
	 * @param string $prefix     `--sgs-icon` or `--sgs-si`.
	 * @param bool   $pin_hover  Pin an unset hover to the resting shadow.
	 * @return string[] Declarations ('--sgs-icon-shadow:3px 3px 0px 0px #3A2A22').
	 */
	function sgs_icon_shadow_vars( array $attributes, array $map, string $prefix, bool $pin_hover = false ): array {
		$decls = sgs_shadow_decls( $attributes, $map, '' );
		// sgs-shadow-fallback: reads back the declarations sgs_shadow_decls() composed (the resting one carries the fallback); it writes none.
		$value = static function ( array $list ): string {
			foreach ( $list as $decl ) {
				// sgs-shadow-fallback: a read of the composed declaration, not a writer.
				if ( 0 === strpos( $decl, 'box-shadow:' ) ) {
					// sgs-shadow-fallback: a read of the composed declaration, not a writer.
					return substr( $decl, strlen( 'box-shadow:' ) );
				}
			}
			return '';
		};
		$rest  = $value( $decls['normal'] );
		$hover = $value( $decls['hover'] );
		if ( '' === $hover && $pin_hover ) {
			$hover = $rest;
		}
		$out = array();
		if ( '' !== $rest ) {
			$out[] = $prefix . '-shadow:' . $rest;
		}
		if ( '' !== $hover ) {
			$out[] = $prefix . '-shadow-hover:' . $hover;
		}
		return $out;
	}
}
