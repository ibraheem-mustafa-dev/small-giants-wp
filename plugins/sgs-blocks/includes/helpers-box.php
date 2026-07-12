<?php
/**
 * Shared "label-style box" render helper (FS3).
 *
 * A label-style box is the small padded, optionally-coloured, optionally-rounded
 * pill/eyebrow/tag chrome shared by sgs/label AND the product-card TRIAL tag (and
 * any future block that renders the same shape). Keeping ONE renderer here means
 * label and product-card produce byte-identical box CSS from the same normalised
 * struct — Bean's composite-mirror requirement (R-31-9): no per-block divergence.
 *
 * NO-INLINE (Spec 32 §6.1): this helper returns a SCOPED CSS string (rules +
 * optional @media tiers) for the caller to place inside the block's OWN
 * `<style>` tag. It never emits an inline `style="…"` declaration. Every value
 * is pre-sanitised (length/keyword sanitisers + sgs_colour_value + intval); the
 * caller wraps the returned string in wp_strip_all_tags() as a </style> guard.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_css_length_sanitise' ) ) {
	/**
	 * Strip a CSS length value down to the safe grammar (digits, letters for the
	 * unit, dot, percent) — the shared form of the local `$sgs_css_length`
	 * closures in label/hero/container render.php.
	 *
	 * @param mixed $value Raw length value (e.g. "12px", "4%").
	 * @return string Sanitised length (may be '').
	 */
	function sgs_css_length_sanitise( $value ): string {
		return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
	}
}

if ( ! function_exists( 'sgs_css_keyword_sanitise' ) ) {
	/**
	 * Strip a CSS keyword value down to letters + hyphen only (e.g. 'inline-block',
	 * 'uppercase') — the shared form of the local `$sgs_css_keyword` closures.
	 *
	 * @param mixed $value Raw keyword value.
	 * @return string Sanitised keyword (may be '').
	 */
	function sgs_css_keyword_sanitise( $value ): string {
		return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
	}
}

if ( ! function_exists( 'sgs_box_object_shorthand' ) ) {
	/**
	 * Build a 4-side CSS shorthand ("top right bottom left") from a box object,
	 * filling any unset side with '0'. Returns null when every side is empty so the
	 * caller can skip the declaration entirely (matches label/render.php's
	 * `$sgs_box_shorthand`).
	 *
	 * @param array $box Box object with optional top/right/bottom/left keys.
	 * @return string|null Shorthand, or null when the box is empty.
	 */
	function sgs_box_object_shorthand( array $box ): ?string {
		$top    = sgs_css_length_sanitise( $box['top'] ?? '' );
		$right  = sgs_css_length_sanitise( $box['right'] ?? '' );
		$bottom = sgs_css_length_sanitise( $box['bottom'] ?? '' );
		$left   = sgs_css_length_sanitise( $box['left'] ?? '' );
		if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
			return null;
		}
		return ( '' !== $top ? $top : '0' ) . ' '
			. ( '' !== $right ? $right : '0' ) . ' '
			. ( '' !== $bottom ? $bottom : '0' ) . ' '
			. ( '' !== $left ? $left : '0' );
	}
}

if ( ! function_exists( 'sgs_label_box_css_rule' ) ) {
	/**
	 * Build the SCOPED CSS for a label-style box on ONE selector.
	 *
	 * `$box` is a NORMALISED struct (NOT raw block attributes), all keys optional:
	 *   - padding        array{top,right,bottom,left} base padding.
	 *   - paddingTablet  array box (scoped @media max-width:1023px).
	 *   - paddingMobile  array box (scoped @media max-width:767px).
	 *   - radius         int|string border-radius in px (intval'd).
	 *   - background     string a resolved colour VALUE (hex / var()) OR a preset
	 *                    token slug — passed through sgs_colour_value() either way.
	 *   - display        string a CSS display keyword (e.g. 'inline-block').
	 *   - fullWidth      bool   true → display:block + width:100% (overrides display).
	 *
	 * Returns '' when nothing is emitted.
	 *
	 * @param array  $box      Normalised box struct.
	 * @param string $selector Fully-formed, already-safe CSS selector.
	 * @return string Scoped CSS (may contain @media rules); '' when empty.
	 */
	function sgs_label_box_css_rule( array $box, string $selector ): string {
		$decls = array();

		// Base padding shorthand.
		if ( isset( $box['padding'] ) && is_array( $box['padding'] ) ) {
			$padding = sgs_box_object_shorthand( $box['padding'] );
			if ( null !== $padding ) {
				$decls[] = 'padding:' . $padding;
			}
		}

		// Border radius (single uniform value).
		if ( isset( $box['radius'] ) && '' !== $box['radius'] && null !== $box['radius'] ) {
			$decls[] = 'border-radius:' . intval( $box['radius'] ) . 'px';
		}

		// Background colour (resolved value or preset token → sgs_colour_value).
		if ( isset( $box['background'] ) && '' !== $box['background'] ) {
			$bg = sgs_colour_value( (string) $box['background'] );
			if ( '' !== $bg ) {
				$decls[] = 'background-color:' . $bg;
			}
		}

		// Display model — fullWidth wins; else an explicit display keyword.
		if ( ! empty( $box['fullWidth'] ) ) {
			$decls[] = 'display:block';
			$decls[] = 'width:100%';
		} elseif ( isset( $box['display'] ) && '' !== $box['display'] ) {
			$display = sgs_css_keyword_sanitise( $box['display'] );
			if ( '' !== $display ) {
				$decls[] = 'display:' . $display;
			}
		}

		$css = '';
		if ( $decls ) {
			$css .= $selector . '{' . implode( ';', $decls ) . ';}';
		}

		// Responsive padding tiers — scoped @media on the SAME selector.
		if ( isset( $box['paddingTablet'] ) && is_array( $box['paddingTablet'] ) ) {
			$padding_tab = sgs_box_object_shorthand( $box['paddingTablet'] );
			if ( null !== $padding_tab ) {
				$css .= '@media(max-width:1023px){' . $selector . '{padding:' . $padding_tab . ';}}';
			}
		}
		if ( isset( $box['paddingMobile'] ) && is_array( $box['paddingMobile'] ) ) {
			$padding_mob = sgs_box_object_shorthand( $box['paddingMobile'] );
			if ( null !== $padding_mob ) {
				$css .= '@media(max-width:767px){' . $selector . '{padding:' . $padding_mob . ';}}';
			}
		}

		return $css;
	}
}
