<?php
/**
 * Reusable button-element style emitter for BUILT-IN (non-sgs/button) CTA
 * elements — e.g. the product-card's built-in `<a>`/`<button>` CTA.
 *
 * Mirrors the sgs/button block's preset-as-seed colour/border/typography
 * model (see src/blocks/button/render.php + presets.js) but scoped down to
 * the subset a built-in element needs: colour, border, font-weight, width.
 * Reused by any block that renders its own button-like element from a
 * PREFIXED attribute set, so every such block shares ONE styling path
 * instead of hand-rolling its own CSS emitter.
 *
 * Does NOT touch sgs/button (src/blocks/button/**) — that block keeps its
 * own, richer render.php emitter (padding, box-shadow, responsive width,
 * hover-scale, icon, etc.). This helper is deliberately smaller: it only
 * covers the properties a simple built-in CTA element needs.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-box.php';

if ( ! function_exists( 'sgs_button_element_style_css' ) ) {

	/**
	 * Build a scoped CSS string (base rule + hover/focus rule) for a
	 * built-in button-like element, reading a prefixed attribute set.
	 *
	 * Attribute shape (prefix 'cta' shown; any prefix works):
	 *   ctaColourBackground       string  (token slug | raw CSS colour)
	 *   ctaColourText             string
	 *   ctaColourBorder           string
	 *   ctaColourBackgroundHover  string
	 *   ctaColourTextHover        string
	 *   ctaColourBorderHover      string
	 *   ctaBorderStyle            string  (solid|dashed|dotted|none)
	 *   ctaBorderWidth            number  (px)
	 *   ctaBorderRadius           number  (px)
	 *   ctaFontWeight             string  (100-900)
	 *   ctaFontSize               number  (px)
	 *   ctaPadding                object  {top,right,bottom,left} box padding
	 *                                     (box-object standard, FR-31-22 —
	 *                                     shorthanded via the shared
	 *                                     sgs_box_object_shorthand() helper)
	 *   ctaWidthType              string  (fit|full)
	 *
	 * Every property is independently optional — an unset/empty attribute
	 * emits nothing for that property and the element falls through to its
	 * normal CSS default (e.g. the block's own hardcoded style.css rule).
	 *
	 * @param array  $attrs    Block attributes.
	 * @param string $prefix   Attribute prefix (e.g. 'cta').
	 * @param string $selector Fully-formed, already-safe CSS selector — may
	 *                         be a comma-separated selector list (e.g. an
	 *                         id/class-scoped selector for every render
	 *                         branch that shares this CTA element).
	 * @return string CSS text (no <style> wrapper); '' when nothing is set.
	 */
	function sgs_button_element_style_css( array $attrs, string $prefix, string $selector ): string {
		$read = static function ( string $base ) use ( $attrs, $prefix ) {
			$key = $prefix . $base;
			return isset( $attrs[ $key ] ) ? $attrs[ $key ] : '';
		};

		$colour_bg           = (string) $read( 'ColourBackground' );
		$colour_text         = (string) $read( 'ColourText' );
		$colour_border       = (string) $read( 'ColourBorder' );
		$colour_bg_hover     = (string) $read( 'ColourBackgroundHover' );
		$colour_text_hover   = (string) $read( 'ColourTextHover' );
		$colour_border_hover = (string) $read( 'ColourBorderHover' );
		$font_weight         = (string) $read( 'FontWeight' );
		$width_type          = (string) $read( 'WidthType' );

		$border_style_raw = (string) $read( 'BorderStyle' );
		$allowed_borders  = array( 'solid', 'dashed', 'dotted', 'none' );
		$border_style     = in_array( $border_style_raw, $allowed_borders, true ) ? $border_style_raw : '';

		$border_width_raw = $read( 'BorderWidth' );
		$border_width     = ( '' !== $border_width_raw && null !== $border_width_raw ) ? absint( $border_width_raw ) : null;

		$border_radius_raw = $read( 'BorderRadius' );
		$border_radius     = ( '' !== $border_radius_raw && null !== $border_radius_raw ) ? absint( $border_radius_raw ) : null;

		$font_size_raw = $read( 'FontSize' );
		$font_size     = ( '' !== $font_size_raw && null !== $font_size_raw ) ? absint( $font_size_raw ) : null;

		$padding_raw = $read( 'Padding' );
		$padding_obj = is_array( $padding_raw ) ? $padding_raw : array();

		// ── Base rule ─────────────────────────────────────────────────────
		$base_decls = array();

		if ( '' !== $colour_bg ) {
			$base_decls[] = 'background-color:' . sgs_colour_value( $colour_bg ) . ';';
		}
		if ( '' !== $colour_text ) {
			$base_decls[] = 'color:' . sgs_colour_value( $colour_text ) . ';';
		}
		if ( '' !== $colour_border ) {
			$base_decls[] = 'border-color:' . sgs_colour_value( $colour_border ) . ';';
		}
		if ( '' !== $border_style ) {
			$base_decls[] = 'border-style:' . $border_style . ';';
		}
		if ( null !== $border_width ) {
			$base_decls[] = 'border-width:' . $border_width . 'px;';
		}
		if ( null !== $border_radius ) {
			$base_decls[] = 'border-radius:' . $border_radius . 'px;';
		}
		if ( '' !== $font_weight ) {
			$base_decls[] = 'font-weight:' . preg_replace( '/[^a-z0-9]/i', '', $font_weight ) . ';';
		}
		if ( null !== $font_size ) {
			$base_decls[] = 'font-size:' . $font_size . 'px;';
		}
		// Padding — box-object standard (FR-31-22): a single {top,right,bottom,left}
		// object attr, shorthanded via the shared sgs_box_object_shorthand() helper
		// (the same one sgs/label + the product-card trial tag use, via
		// sgs_label_box_css_rule()). An unset side falls back to '0' inside the
		// helper so the shorthand stays valid.
		$padding_shorthand = sgs_box_object_shorthand( $padding_obj );
		if ( null !== $padding_shorthand ) {
			$base_decls[] = 'padding:' . $padding_shorthand . ';';
		}
		if ( 'full' === $width_type ) {
			$base_decls[] = 'width:100%;';
		}

		$css = '';
		if ( ! empty( $base_decls ) ) {
			$css .= $selector . '{' . implode( '', $base_decls ) . '}';
		}

		// ── Hover / focus-visible rule ────────────────────────────────────
		$hover_decls = array();

		if ( '' !== $colour_bg_hover ) {
			$hover_decls[] = 'background-color:' . sgs_colour_value( $colour_bg_hover ) . ';';
		}
		if ( '' !== $colour_text_hover ) {
			$hover_decls[] = 'color:' . sgs_colour_value( $colour_text_hover ) . ';';
		}
		if ( '' !== $colour_border_hover ) {
			$hover_decls[] = 'border-color:' . sgs_colour_value( $colour_border_hover ) . ';';
		}

		if ( ! empty( $hover_decls ) ) {
			$selector_parts = array_map( 'trim', explode( ',', $selector ) );

			$hover_selector = implode(
				',',
				array_map(
					static function ( $part ) {
						return $part . ':hover';
					},
					$selector_parts
				)
			);
			$focus_selector = implode(
				',',
				array_map(
					static function ( $part ) {
						return $part . ':focus-visible';
					},
					$selector_parts
				)
			);

			$css .= $hover_selector . ',' . $focus_selector . '{' . implode( '', $hover_decls ) . '}';
		}

		return $css;
	}
}
