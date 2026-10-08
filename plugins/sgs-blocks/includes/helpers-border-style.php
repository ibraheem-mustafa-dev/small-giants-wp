<?php
/**
 * Border style resolution — the one rule every SGS border emitter follows.
 *
 * Rule: a border the client gave a width paints SOLID unless they chose
 * another style. An explicit style (dashed, dotted, none …) always wins.
 *
 * Why this is the rule: the style picker (`BorderStyleControl`, a copy of
 * WP core's `BorderControlStylePicker`) offers Solid/Dashed/Dotted and writes
 * '' when the active option is clicked again, exactly as core's picker writes
 * `undefined`. Core then paints that border solid through its
 * `:where([style*=border-width]){border-style:solid}` rule. That rule matches
 * inline styles only, and no SGS block renders an inline style (Spec 32), so
 * this helper is its equivalent for every SGS border.
 *
 * A width is still required before any style is emitted (G5, Bean
 * 2026-08-26): a style with no width would fall through to the browser's
 * initial `medium` (~3px) width. Callers keep that gate; this file only
 * decides WHICH style a width paints with.
 *
 * Editor twin: `src/utils/border-style.js` (same allow-list, same fallback).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-typography.php';
require_once __DIR__ . '/helpers-box.php';

if ( ! function_exists( 'sgs_border_style_allowed' ) ) {
	/**
	 * Every CSS border-style keyword an SGS border may emit.
	 *
	 * @return string[]
	 */
	function sgs_border_style_allowed(): array {
		return array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
	}
}

if ( ! function_exists( 'sgs_border_style_keyword' ) ) {
	/**
	 * Resolve a stored border-style value to the keyword a width paints with.
	 *
	 * @param mixed $raw Stored style attribute ('' / null when the client never
	 *                   picked one or deselected the active option).
	 * @return string An allow-listed keyword; 'solid' when unset or unknown.
	 */
	function sgs_border_style_keyword( $raw ): string {
		$style = is_string( $raw ) ? strtolower( trim( $raw ) ) : '';
		return in_array( $style, sgs_border_style_allowed(), true ) ? $style : 'solid';
	}
}

if ( ! function_exists( 'sgs_border_box_decls' ) ) {
	/**
	 * Build the border-style + border-width declarations for a 4-side width
	 * box and a stored style.
	 *
	 * Returns an empty array when no side has a width (no border) or when the
	 * client explicitly chose `none`. Unset sides render as `0`, so a border on
	 * some sides never picks up the browser's `medium` width on the others.
	 *
	 * @param mixed $width_box `{top,right,bottom,left}` width object (non-array = empty).
	 * @param mixed $style_raw Stored style attribute.
	 * @return string[] Declarations without trailing semicolons.
	 */
	function sgs_border_box_decls( $width_box, $style_raw ): array {
		$box       = is_array( $width_box ) ? $width_box : array();
		$sides     = array();
		$has_width = false;
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			$value = is_scalar( $box[ $side ] ?? null ) ? sgs_css_length_value( $box[ $side ] ) : '';
			if ( '' !== $value ) {
				$has_width = true;
			}
			$sides[] = '' !== $value ? $value : '0';
		}
		$style = sgs_border_style_keyword( $style_raw );
		if ( $has_width && 'none' !== $style ) {
			return array( 'border-style:' . $style, 'border-width:' . implode( ' ', $sides ) );
		}
		return array();
	}
}

if ( ! function_exists( 'sgs_border_element_decls' ) ) {
	/**
	 * Every border declaration one element needs: width, style, colour (flat or
	 * gradient, resting and hover) and corner radius at three tiers.
	 *
	 * The one place a block's border is assembled. It composes the existing
	 * helpers (sgs_border_box_decls, sgs_border_gradient_css,
	 * sgs_border_radius_tiers, sgs_corner_object_longhands) and returns
	 * DECLARATIONS rather than rules, because a border shares its element's
	 * rule with padding, shadow, max-width and the rest; the caller places them.
	 *
	 * Rules it applies:
	 * - Width and style print only when a side has a width (G5); unset sides
	 *   print 0 (D-4).
	 * - An explicit `none` style prints no colour, no ring and no hover, and (with
	 *   `none_rule`) a `{border-style:none;border-width:0}` override so a
	 *   variant's stylesheet border stops painting too.
	 * - A flat colour is a plain `border-color` declaration. A gradient cannot be
	 *   a border-color value, so it paints through the masked ::before ring
	 *   (a standalone rule), which takes the hover paint with it. A flat resting
	 *   border with a hover gradient gets a hover-only ring.
	 * - Ring thickness is the top width when set, else `ring_width`.
	 *
	 * Attribute names: width, style and radius are `{prefix}BorderWidth`,
	 * `{prefix}BorderStyle` and `{prefix}BorderRadius` (prefix '' gives
	 * `borderWidth`). Colour names come from the caller's LITERAL `colour` map
	 * so the behavioural analyser keeps routing each colour attribute.
	 *
	 * @param array  $attributes The block's attributes.
	 * @param string $prefix     Attribute prefix ('' for the block root).
	 * @param string $selector   The element's scoped selector, used for the
	 *                           standalone rules only.
	 * @param array  $options    Behaviour switches: `colour` (map of `base`,
	 *                           `hover`, `gradient`, `hover_gradient` to attribute
	 *                           names, any omitted); `colour_default` (painted when
	 *                           a width is set and no colour is, e.g.
	 *                           'currentColor', default ''); `none_rule` (emit the
	 *                           explicit `none` override, default true);
	 *                           `ring_width` (ring thickness when no top width is
	 *                           set, default '1px'); `radius` (include corner
	 *                           radius, default true).
	 * @return array{base: string[], tablet: string[], mobile: string[], hover: string[], rules: string[]}
	 *         Declarations without trailing semicolons; tablet and mobile are for
	 *         the caller's max-width 1023px and 767px queries; hover is for the
	 *         caller's guarded hover rule; rules are complete CSS rules.
	 */
	function sgs_border_element_decls( array $attributes, string $prefix, string $selector, array $options = array() ): array {
		$out = array(
			'base'   => array(),
			'tablet' => array(),
			'mobile' => array(),
			'hover'  => array(),
			'rules'  => array(),
		);

		$width_box = $attributes[ sgs_typography_attr( $prefix, 'BorderWidth' ) ] ?? null;
		$style_raw = $attributes[ sgs_typography_attr( $prefix, 'BorderStyle' ) ] ?? '';
		$is_none   = 'none' === sgs_border_style_keyword( $style_raw );

		$width_decls = sgs_border_box_decls( $width_box, $style_raw );
		$out['base'] = $width_decls;

		if ( $is_none ) {
			if ( $options['none_rule'] ?? true ) {
				$out['rules'][] = $selector . '{border-style:none;border-width:0;}';
			}
		} else {
			$colour_map = is_array( $options['colour'] ?? null ) ? $options['colour'] : array();
			$read       = static function ( string $slot ) use ( $colour_map, $attributes ): string {
				$key = $colour_map[ $slot ] ?? '';
				return ( '' !== $key && is_scalar( $attributes[ $key ] ?? null ) ) ? (string) $attributes[ $key ] : '';
			};

			$flat        = $read( 'base' );
			$gradient    = sgs_css_gradient_value( $read( 'gradient' ) );
			$hover_flat  = $read( 'hover' );
			$hover_grad  = sgs_css_gradient_value( $read( 'hover_gradient' ) );
			$box         = is_array( $width_box ) ? $width_box : array();
			$top_width   = is_scalar( $box['top'] ?? null ) ? sgs_css_length_value( $box['top'] ) : '';
			$ring_width  = '' !== $top_width ? $top_width : (string) ( $options['ring_width'] ?? '1px' );
			$hover_paint = '' !== $hover_grad ? $hover_grad : ( '' !== $hover_flat ? sgs_colour_value( $hover_flat ) : '' );

			if ( '' !== $gradient ) {
				$out['rules'][] = sgs_border_gradient_css( $selector, $gradient, '' !== $hover_paint ? $hover_paint : null, $ring_width );
			} else {
				if ( '' !== $flat ) {
					$out['base'][] = 'border-color:' . sgs_colour_value( $flat );
				} elseif ( $width_decls && '' !== (string) ( $options['colour_default'] ?? '' ) ) {
					$out['base'][] = 'border-color:' . $options['colour_default'];
				}
				if ( '' !== $hover_grad ) {
					$out['rules'][] = sgs_hover_media_wrap(
						sgs_border_gradient_css( SGS_HOVER_NOT_TOUCH . ' ' . $selector . ':hover', $hover_grad, null, $ring_width )
					);
				} elseif ( '' !== $hover_flat ) {
					$out['hover'][] = 'border-color:' . sgs_colour_value( $hover_flat );
				}
			}
		}

		if ( $options['radius'] ?? true ) {
			$tiers = sgs_border_radius_tiers(
				array( 'borderRadius' => $attributes[ sgs_typography_attr( $prefix, 'BorderRadius' ) ] ?? null )
			);
			if ( null !== $tiers['base'] ) {
				$engine = wp_style_engine_get_styles( array( 'border' => array( 'radius' => $tiers['base'] ) ) );
				// WordPress returns `property => value`; the QA harness stub returns
				// `property:value` strings. Both become `property:value`.
				foreach ( (array) ( $engine['declarations'] ?? array() ) as $property => $value ) {
					$out['base'][] = is_string( $property ) ? $property . ':' . $value : (string) $value;
				}
			}
			$tablet = sgs_corner_object_longhands( $tiers['tablet'] );
			$mobile = sgs_corner_object_longhands( $tiers['mobile'] );
			if ( null !== $tablet ) {
				$out['tablet'][] = $tablet;
			}
			if ( null !== $mobile ) {
				$out['mobile'][] = $mobile;
			}
		}

		return $out;
	}
}
