<?php
/**
 * Sgs/notice-banner — icon glyph size + optional circle/rounded-square badge.
 *
 * Replicates sgs/trust-bar's icon-circle attribute family (iconCircleSize,
 * iconCircleBackground[+Gradient], iconCircleBackgroundHover[+Gradient],
 * iconCircleBorderRadius, iconCircleShadow[+Colour][+ColourHover],
 * iconCircleBorderWidth/Style/Colour — trust-bar/render.php + block.json) but
 * emits through notice-banner's own no-inline `$scoped_css` contract
 * (Spec 32) instead of trust-bar's inline custom-property `style` attribute —
 * notice-banner never emits an inline `style="…"` declaration
 * (scripts/audit-inline-styling.js --check).
 *
 * Every declaration below is gated on differing from the value style.css
 * ALREADY paints by default (mirrors trust-bar's own "only emit when it
 * differs" convention, render.php:144/166/177) — an unmodified block, or one
 * still on `iconStyle:'bare'`, adds ZERO new scoped CSS.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_notice_banner_resolve_icon_style' ) ) {
	/**
	 * Sanitise the iconStyle enum. Off-enum/non-string coerces to 'bare'
	 * (today's look) — never fatals on a stray value.
	 *
	 * @param mixed $value Raw attribute value.
	 * @return string 'bare' or 'circle'.
	 */
	function sgs_notice_banner_resolve_icon_style( $value ): string {
		$value = is_string( $value ) ? $value : '';
		return in_array( $value, array( 'bare', 'circle' ), true ) ? $value : 'bare';
	}
}

if ( ! function_exists( 'sgs_notice_banner_clamp_icon_size' ) ) {
	/**
	 * Clamp the glyph size (8 to 96 px). Non-numeric falls back to the default.
	 *
	 * @param mixed $value         Raw attribute value.
	 * @param int   $default_value Default when unset/non-numeric.
	 * @return int Clamped px value.
	 */
	function sgs_notice_banner_clamp_icon_size( $value, int $default_value = 20 ): int {
		$size = is_numeric( $value ) ? (int) $value : $default_value;
		return max( 8, min( 96, $size ) );
	}
}

if ( ! function_exists( 'sgs_notice_banner_clamp_icon_circle_size' ) ) {
	/**
	 * Clamp the badge diameter (24 to 96 px). Non-numeric falls back to the default.
	 *
	 * @param mixed $value         Raw attribute value.
	 * @param int   $default_value Default when unset/non-numeric.
	 * @return int Clamped px value.
	 */
	function sgs_notice_banner_clamp_icon_circle_size( $value, int $default_value = 44 ): int {
		$size = is_numeric( $value ) ? (int) $value : $default_value;
		return max( 24, min( 96, $size ) );
	}
}

if ( ! function_exists( 'sgs_notice_banner_icon_circle_border_style' ) ) {
	/**
	 * Sanitise the badge border-style allow-list — mirrors trust-bar's
	 * iconCircleBorderStyle exactly (render.php:188-191): unset (empty string)
	 * stays empty so style.css's own framework-default fallback (solid) keeps
	 * painting; a non-empty off-enum value falls back to 'solid' rather than
	 * being dropped or fatalling.
	 *
	 * @param mixed $value Raw attribute value.
	 * @return string Allow-listed border-style keyword, or '' when unset.
	 */
	function sgs_notice_banner_icon_circle_border_style( $value ): string {
		$value = is_string( $value ) ? $value : '';
		if ( '' === $value ) {
			return '';
		}
		$allowed = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
		return in_array( $value, $allowed, true ) ? $value : 'solid';
	}
}

if ( ! function_exists( 'sgs_notice_banner_icon_circle_radius' ) ) {
	/**
	 * Sanitise a free-text border-radius value for scoped-CSS concatenation —
	 * mirrors trust-bar's own inline sanitiser (render.php:168) exactly: letters,
	 * digits, whitespace, `%`, `(`, `)`, `.`, `,`, `-` only. Strips `;`, `{`,
	 * `}` and every other character, so a value can never break out of the
	 * `border-radius:…;` declaration it is concatenated into.
	 *
	 * @param string $value Raw border-radius value.
	 * @return string Sanitised value (may be '').
	 */
	function sgs_notice_banner_icon_circle_radius( string $value ): string {
		$safe = preg_replace( '/[^A-Za-z0-9\s%().,\-]/', '', $value );
		return trim( (string) $safe );
	}
}

if ( ! function_exists( 'sgs_notice_banner_icon_badge_css' ) ) {
	/**
	 * Build every scoped CSS declaration for the icon glyph size + optional
	 * circle/rounded-square badge (`iconStyle:'circle'`), keyed to the block's
	 * own `$root_sel`. Returns a flat array of CSS rule strings ready to be
	 * merged into `$scoped_css` — never an inline style (Spec 32).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $root_sel   The block's own scoped root selector (`.{uid}.wp-block-sgs-notice-banner`).
	 * @return string[] CSS rule strings.
	 */
	function sgs_notice_banner_icon_badge_css( array $attributes, string $root_sel ): array {
		$css = array();

		$icon_size  = sgs_notice_banner_clamp_icon_size( $attributes['iconSize'] ?? null );
		$icon_style = sgs_notice_banner_resolve_icon_style( $attributes['iconStyle'] ?? null );

		$icon_sel = $root_sel . ' .sgs-notice-banner__icon';

		// Glyph size — only emitted when it differs from style.css's own 20px
		// default, so an unmodified block adds zero new CSS. Applies in BOTH
		// styles: an SVG glyph (lucide/wp-icon) sizes via width/height; a
		// dashicon (WP core .dashicons class + its ::before pseudo-element both
		// hardcode their own 20px, so both need an explicit override) or an
		// emoji (plain text content of the span) sizes via font-size.
		if ( 20 !== $icon_size ) {
			$css[] = $icon_sel . '{font-size:' . $icon_size . 'px;}';
			$css[] = $icon_sel . ' svg{width:' . $icon_size . 'px;height:' . $icon_size . 'px;}';
			$css[] = $icon_sel . ' .dashicons{width:' . $icon_size . 'px;height:' . $icon_size . 'px;font-size:' . $icon_size . 'px;}';
			$css[] = $icon_sel . ' .dashicons:before{font-size:' . $icon_size . 'px;}';
		}

		if ( 'circle' !== $icon_style ) {
			return $css;
		}

		$badge_sel = $root_sel . ' .sgs-notice-banner__icon--circle';

		// --- Badge size ---------------------------------------------------
		$circle_size = sgs_notice_banner_clamp_icon_circle_size( $attributes['iconCircleSize'] ?? null );
		if ( 44 !== $circle_size ) {
			$css[] = $badge_sel . '{width:' . $circle_size . 'px;height:' . $circle_size . 'px;}';
		}

		// --- Background (flat + gradient, base + hover) ------------------
		$bg_raw                = isset( $attributes['iconCircleBackground'] ) ? (string) $attributes['iconCircleBackground'] : 'surface';
		$bg_gradient_raw       = isset( $attributes['iconCircleBackgroundGradient'] ) ? (string) $attributes['iconCircleBackgroundGradient'] : '';
		$bg_hover_raw          = isset( $attributes['iconCircleBackgroundHover'] ) ? (string) $attributes['iconCircleBackgroundHover'] : '';
		$bg_hover_gradient_raw = isset( $attributes['iconCircleBackgroundHoverGradient'] ) ? (string) $attributes['iconCircleBackgroundHoverGradient'] : '';

		$bg_gradient_value = sgs_css_gradient_value( $bg_gradient_raw );

		$base_decls = array();
		if ( 'surface' !== $bg_raw ) {
			$base_decls[] = 'background-color:' . sgs_colour_value( $bg_raw );
		}
		if ( '' !== $bg_gradient_value ) {
			$base_decls[] = 'background-image:' . $bg_gradient_value;
		}
		if ( $base_decls ) {
			$css[] = $badge_sel . '{' . implode( ';', $base_decls ) . ';}';
		}

		$hover_decls = array();
		if ( '' !== $bg_hover_raw ) {
			$hover_decls[] = 'background-color:' . sgs_colour_value( $bg_hover_raw );
		}
		$bg_hover_gradient_value = sgs_css_gradient_value( $bg_hover_gradient_raw );
		if ( '' !== $bg_hover_gradient_value ) {
			$hover_decls[] = 'background-image:' . $bg_hover_gradient_value;
		}
		if ( $hover_decls ) {
			$css[] = sgs_hover_state_rules( $badge_sel, implode( ';', $hover_decls ) );
		}

		// --- Border-radius -------------------------------------------------
		$radius_raw = isset( $attributes['iconCircleBorderRadius'] ) ? (string) $attributes['iconCircleBorderRadius'] : '50%';
		if ( '' !== $radius_raw && '50%' !== $radius_raw ) {
			$safe_radius = sgs_notice_banner_icon_circle_radius( $radius_raw );
			if ( '' !== $safe_radius ) {
				$css[] = $badge_sel . '{border-radius:' . $safe_radius . ';}';
			}
		}

		// --- Border width/style/colour --------------------------------------
		$border_width_obj = is_array( $attributes['iconCircleBorderWidth'] ?? null ) ? $attributes['iconCircleBorderWidth'] : array();
		$border_width_val = sgs_box_object_shorthand( $border_width_obj );
		if ( null !== $border_width_val ) {
			$css[] = $badge_sel . '{border-width:' . $border_width_val . ';}';
		}

		$border_style = sgs_notice_banner_icon_circle_border_style( $attributes['iconCircleBorderStyle'] ?? '' );
		if ( '' !== $border_style ) {
			$css[] = $badge_sel . '{border-style:' . $border_style . ';}';
		}

		$border_colour_raw = isset( $attributes['iconCircleBorderColour'] ) ? (string) $attributes['iconCircleBorderColour'] : '';
		if ( '' !== $border_colour_raw ) {
			$css[] = $badge_sel . '{border-color:' . sgs_colour_value( $border_colour_raw ) . ';}';
		}

		// --- Shadow (base + hover-colour) -----------------------------------
		// iconCircleShadow defaults to 'none' (Bean-ruled — a strip banner
		// should not carry a shadow by default, unlike trust-bar's 'whisper'),
		// so the CSS default already matches 'none' and nothing is emitted
		// unless the operator picks an actual shadow.
		$shadow_raw = isset( $attributes['iconCircleShadow'] ) ? (string) $attributes['iconCircleShadow'] : 'none';
		if ( 'none' !== $shadow_raw ) {
			$shadow_colour_raw = isset( $attributes['iconCircleShadowColour'] ) ? (string) $attributes['iconCircleShadowColour'] : '';
			// sgs_shadow_box_decls() composes the SHAPE-only attr (D621/D622
			// colour-panel split) with the separate colour attr AND appends the
			// forced-colours (Windows high-contrast) fallback declaration —
			// mirrors sgs/trust-bar's own badge-image shadow (render.php:563).
			$shadow_decls = sgs_shadow_box_decls( $shadow_raw, $shadow_colour_raw );
			if ( $shadow_decls ) {
				$css[] = $badge_sel . '{' . implode( ';', $shadow_decls ) . ';}';
			}

			$shadow_colour_hover_raw = isset( $attributes['iconCircleShadowColourHover'] ) ? (string) $attributes['iconCircleShadowColourHover'] : '';
			if ( '' !== $shadow_colour_hover_raw ) {
				$safe_shadow_hover = sgs_shadow_value_composed( $shadow_raw, $shadow_colour_hover_raw );
				if ( '' !== $safe_shadow_hover ) {
					// sgs-shadow-fallback: hover state only; the resting rule above carries the forced-colours fallback.
					$css[] = sgs_hover_state_rules( $badge_sel, 'box-shadow:' . $safe_shadow_hover, ':focus-within' );
				}
			} else {
				// AUTOMATIC LIFT (design H4) — only when this instance has no
				// explicit hover colour, mirrors sgs/trust-bar's own badge-image
				// shadow (render.php:575-580).
				$auto_lift_css = sgs_shadow_hover_rules( $badge_sel, $shadow_raw, $shadow_colour_raw, $attributes );
				if ( '' !== $auto_lift_css ) {
					$css[] = $auto_lift_css;
				}
			}
		}

		return $css;
	}
}
