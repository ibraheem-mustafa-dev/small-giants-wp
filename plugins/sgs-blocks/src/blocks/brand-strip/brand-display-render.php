<?php
/**
 * Display-mode helpers for sgs/brand-strip (Logos / Text only / Logo, else
 * text).
 *
 * Extracted out of render.php (already well past this project's 300-line PHP
 * guideline — see its own header) rather than growing it further. Pure
 * helpers only; no state, no output — render.php calls these and uses the
 * return values in its existing tile-building loop and scoped-CSS array.
 *
 * GROUND-TRUTH: read verbatim from render.php's own caption-typography
 * emission (the `.sgs-brand-strip__name` block) — this file mirrors that
 * exact shape (sgs_typography_css_rule() + sgs_resolve_text_colour_or_
 * gradient() + sgs_text_colour_decl() + sgs_text_colour_gradient_fallback_
 * rule() + the ancestor-hover pattern for *Hover) for the new
 * `.sgs-brand-strip__brand-text` element, so the two typography systems
 * stay visually and mechanically consistent.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_brand_strip_resolve_display' ) ) {
	/**
	 * Sanitise the `brandDisplay` attribute to one of the three allowed values.
	 *
	 * @param array $attributes Block attributes.
	 * @return string 'logos' (default) | 'text' | 'logo-else-text'.
	 */
	function sgs_brand_strip_resolve_display( array $attributes ) {
		$raw     = $attributes['brandDisplay'] ?? 'logos';
		$allowed = array( 'logos', 'text', 'logo-else-text' );
		return in_array( $raw, $allowed, true ) ? $raw : 'logos';
	}
}

if ( ! function_exists( 'sgs_brand_strip_is_text_item' ) ) {
	/**
	 * Whether a single logo entry should render as text rather than an image,
	 * given the resolved Display setting and that entry's own media.
	 *
	 * @param string     $display Resolved brandDisplay value.
	 * @param array|null $media   The item's resolved media shape (or null).
	 * @return bool
	 */
	function sgs_brand_strip_is_text_item( $display, $media ) {
		if ( 'text' === $display ) {
			return true;
		}
		if ( 'logo-else-text' === $display ) {
			return null === $media || empty( $media['url'] );
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_brand_strip_text_style_css' ) ) {
	/**
	 * Build the scoped CSS rules for the text-fallback element
	 * (`.sgs-brand-strip__brand-text`) — typography (prefix 'brandText') +
	 * colour/gradient + hover, mirroring the block's own caption emission.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The block's own scoped root selector (render.php's $root_sel).
	 * @return string[] CSS rule strings to append to render.php's $scoped_css.
	 */
	function sgs_brand_strip_text_style_css( array $attributes, $root_sel ) {
		$rules = array();
		$sel   = "{$root_sel} .sgs-brand-strip__brand-text";

		if ( function_exists( 'sgs_typography_css_rule' ) ) {
			$typography_css = sgs_typography_css_rule( $attributes, 'brandText', $sel );
			if ( '' !== $typography_css ) {
				$rules[] = $typography_css;
			}
		}

		if ( function_exists( 'sgs_resolve_text_colour_or_gradient' ) && function_exists( 'sgs_text_colour_decl' ) ) {
			$colour          = $attributes['brandTextColour'] ?? '';
			$colour_gradient = $attributes['brandTextColourGradient'] ?? '';
			$effective       = sgs_resolve_text_colour_or_gradient( $colour, $colour_gradient );
			$decl            = sgs_text_colour_decl( $effective );
			if ( '' !== $decl ) {
				$rules[] = "{$sel}{" . $decl . ';}';
			}
			if ( function_exists( 'sgs_text_colour_gradient_fallback_rule' ) ) {
				$fallback_rule = sgs_text_colour_gradient_fallback_rule( $sel, $effective );
				if ( '' !== $fallback_rule ) {
					$rules[] = $fallback_rule;
				}
			}
		}

		$hover_colour = $attributes['brandTextColourHover'] ?? '';
		if ( '' !== $hover_colour && function_exists( 'sgs_colour_value' ) ) {
			$rules[] = "{$root_sel}:hover .sgs-brand-strip__brand-text,"
				. "{$root_sel}:focus-within .sgs-brand-strip__brand-text"
				. '{color:' . sgs_colour_value( $hover_colour ) . ';}';
		}

		return $rules;
	}
}
