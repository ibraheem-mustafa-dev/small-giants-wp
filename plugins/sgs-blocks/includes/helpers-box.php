<?php
/**
 * Shared "label-style box" render helper (FS3).
 *
 * A label-style box is the small padded, optionally-coloured, optionally-rounded
 * pill/eyebrow/tag chrome shared by sgs/label AND the product-card TRIAL tag (and
 * any future block that renders the same shape). Keeping ONE renderer here means
 * label and product-card produce byte-identical box CSS from the same normalised
 * struct — Bean's composite wrapper requirement (R-31-9): no per-block divergence.
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

// This file's helpers delegate to sgs_css_length_value() (Spec 32 §6.1 (a2)).
// Require it HERE, not just via render-helpers.php, because a render.php may
// require_once this file directly without ever loading render-helpers.php —
// without this line those pages would fatal on "Call to undefined function
// sgs_css_length_value()". Both files guard with function_exists(), so load
// order does not matter — only that both load before either is CALLED.
require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-css-sizing-keyword.php';
require_once __DIR__ . '/helpers-border-style.php';

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
		return sgs_css_length_or_sizing_keyword( $value );
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
		$top    = sgs_css_length_value( $box['top'] ?? '' );
		$right  = sgs_css_length_value( $box['right'] ?? '' );
		$bottom = sgs_css_length_value( $box['bottom'] ?? '' );
		$left   = sgs_css_length_value( $box['left'] ?? '' );
		if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
			return null;
		}
		return ( '' !== $top ? $top : '0' ) . ' '
			. ( '' !== $right ? $right : '0' ) . ' '
			. ( '' !== $bottom ? $bottom : '0' ) . ' '
			. ( '' !== $left ? $left : '0' );
	}
}

if ( ! function_exists( 'sgs_box_object_longhand_list' ) ) {
	/**
	 * Build one longhand declaration per SET side of a padding or margin box
	 * object ("padding-top:12px"), in top, right, bottom, left order. An unset
	 * side emits nothing, so it keeps what a wider @media tier or the block's own
	 * stylesheet gives it; a shorthand would force it to 0 instead.
	 *
	 * Padding and margin only. A border width keeps sgs_box_object_shorthand():
	 * there an unset side SHOULD be 0, because border-style is written for all
	 * four sides and a width longhand would leave the others at the browser's
	 * `medium`, painting borders the client never set.
	 *
	 * The side order is written out here rather than read from
	 * sgs_responsive_side_order(), so this file still loads on its own (the
	 * standalone tests require helpers-box.php without helpers-responsive.php).
	 *
	 * @param mixed  $box    Box object with optional top/right/bottom/left keys; anything
	 *                       else yields no declarations.
	 * @param string $family 'padding' or 'margin'.
	 * @return string[] Declarations without a trailing semicolon; empty when no side is set.
	 */
	function sgs_box_object_longhand_list( $box, string $family ): array {
		if ( ! is_array( $box ) || ! in_array( $family, array( 'padding', 'margin' ), true ) ) {
			return array();
		}
		$decls = array();
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			$value = sgs_css_length_value( $box[ $side ] ?? '' );
			if ( '' !== $value ) {
				$decls[] = $family . '-' . $side . ':' . $value;
			}
		}
		return $decls;
	}
}

if ( ! function_exists( 'sgs_box_object_longhands' ) ) {
	/**
	 * The set sides of a padding or margin box as one declaration block
	 * ("padding-top:12px;padding-left:24px"), or null when no side is set, so a
	 * caller guarding with `null !==` skips the rule exactly as it does for
	 * sgs_box_object_shorthand().
	 *
	 * @param mixed  $box    Box object with optional top/right/bottom/left keys.
	 * @param string $family 'padding' or 'margin'.
	 * @return string|null Declarations joined with ';', or null when the box is empty.
	 */
	function sgs_box_object_longhands( $box, string $family ): ?string {
		$decls = sgs_box_object_longhand_list( $box, $family );
		return $decls ? implode( ';', $decls ) : null;
	}
}

if ( ! function_exists( 'sgs_corner_object_shorthand' ) ) {
	/**
	 * Build a 4-CORNER CSS shorthand ("top-left top-right bottom-right bottom-left")
	 * from a corner-keyed box object, filling any unset corner with '0'. Returns null
	 * when every corner is empty so the caller can skip the declaration entirely.
	 *
	 * Sibling to sgs_box_object_shorthand(), which is keyed top/right/bottom/left and
	 * therefore CANNOT accept a corner-keyed object. This is the shared form of the
	 * per-block `$sgs_corner_shorthand` / `$sgs_radius_shorthand` closures.
	 *
	 * The parameter is deliberately UNTYPED with an internal is_array() guard: callers
	 * legitimately pass a raw null (e.g. `$attributes['borderRadiusTablet'] ?? null` in
	 * before-after/render.php). A typed `array` would throw TypeError and fatal the page.
	 *
	 * @param mixed $box Box object with optional topLeft/topRight/bottomRight/bottomLeft
	 *                   keys, or null/non-array when the attribute is unset.
	 * @return string|null Shorthand, or null when the box is empty or not an array.
	 */
	function sgs_corner_object_shorthand( $box ): ?string {
		if ( ! is_array( $box ) ) {
			return null;
		}
		$top_left     = sgs_css_length_value( $box['topLeft'] ?? '' );
		$top_right    = sgs_css_length_value( $box['topRight'] ?? '' );
		$bottom_right = sgs_css_length_value( $box['bottomRight'] ?? '' );
		$bottom_left  = sgs_css_length_value( $box['bottomLeft'] ?? '' );
		if ( '' === $top_left && '' === $top_right && '' === $bottom_right && '' === $bottom_left ) {
			return null;
		}
		return ( '' !== $top_left ? $top_left : '0' ) . ' '
			. ( '' !== $top_right ? $top_right : '0' ) . ' '
			. ( '' !== $bottom_right ? $bottom_right : '0' ) . ' '
			. ( '' !== $bottom_left ? $bottom_left : '0' );
	}
}

if ( ! function_exists( 'sgs_corner_object_longhand_list' ) ) {
	/**
	 * Build one border-radius longhand per SET corner of a corner-keyed box object
	 * ("border-top-left-radius:20px"), in top-left, top-right, bottom-right,
	 * bottom-left order. An unset corner emits nothing, so it keeps what a wider
	 * device tier or the block's own stylesheet gives it; a shorthand would square
	 * it to 0 instead. A corner has no style companion, so unlike a border width
	 * there is no case where an unset corner should be 0.
	 *
	 * The corner order is written out here, so this file still loads on its own.
	 *
	 * @param mixed $box Box object with optional topLeft/topRight/bottomRight/bottomLeft
	 *                   keys; anything else yields no declarations.
	 * @return string[] Declarations without a trailing semicolon; empty when no corner is set.
	 */
	function sgs_corner_object_longhand_list( $box ): array {
		if ( ! is_array( $box ) ) {
			return array();
		}
		$corners = array(
			'topLeft'     => 'border-top-left-radius',
			'topRight'    => 'border-top-right-radius',
			'bottomRight' => 'border-bottom-right-radius',
			'bottomLeft'  => 'border-bottom-left-radius',
		);
		$decls   = array();
		foreach ( $corners as $key => $property ) {
			$value = is_scalar( $box[ $key ] ?? null ) ? sgs_css_length_value( $box[ $key ] ) : '';
			if ( '' !== $value ) {
				$decls[] = $property . ':' . $value;
			}
		}
		return $decls;
	}
}

if ( ! function_exists( 'sgs_corner_object_longhands' ) ) {
	/**
	 * The set corners of a corner-keyed box as one declaration block
	 * ("border-top-left-radius:20px;border-bottom-right-radius:4px"), or null when
	 * no corner is set, so a caller guarding with `null !==` skips the rule exactly
	 * as it does for sgs_corner_object_shorthand().
	 *
	 * @param mixed $box Box object with optional topLeft/topRight/bottomRight/bottomLeft keys.
	 * @return string|null Declarations joined with ';', or null when the box is empty.
	 */
	function sgs_corner_object_longhands( $box ): ?string {
		$decls = sgs_corner_object_longhand_list( $box );
		return $decls ? implode( ';', $decls ) : null;
	}
}

if ( ! function_exists( 'sgs_corner_object_property_list' ) ) {
	/**
	 * Build one custom property per SET corner of a corner-keyed box object
	 * ("--sgs-x-radius-top-left:20px"), in top-left, top-right, bottom-right,
	 * bottom-left order. The custom-property twin of sgs_corner_object_longhand_list():
	 * for a stylesheet that reads each corner through its own var() chain, so an
	 * unset corner keeps the stylesheet's value instead of being squared to 0.
	 *
	 * @param mixed  $box    Box object with optional topLeft/topRight/bottomRight/bottomLeft keys.
	 * @param string $prefix Custom-property name up to and including its trailing dash ("--sgs-x-radius-"); the corner is appended. The dash lets the wiring fingerprint match the property's readers by prefix.
	 * @return string[] Declarations without a trailing semicolon; empty when no corner is set.
	 */
	function sgs_corner_object_property_list( $box, string $prefix ): array {
		if ( ! is_array( $box ) ) {
			return array();
		}
		$corners = array(
			'topLeft'     => 'top-left',
			'topRight'    => 'top-right',
			'bottomRight' => 'bottom-right',
			'bottomLeft'  => 'bottom-left',
		);
		$decls   = array();
		foreach ( $corners as $key => $suffix ) {
			$value = sgs_css_length_value( $box[ $key ] ?? '' );
			if ( '' !== $value ) {
				$decls[] = $prefix . $suffix . ':' . $value;
			}
		}
		return $decls;
	}
}

if ( ! function_exists( 'sgs_box_object_property_list' ) ) {
	/**
	 * Build one custom property per SET side of a side-keyed box object
	 * ("--sgs-x-pad-top:20px"), in top, right, bottom, left order. The custom-property
	 * twin of sgs_box_object_longhand_list().
	 *
	 * @param mixed  $box    Box object with optional top/right/bottom/left keys.
	 * @param string $prefix Custom-property name up to and including its trailing dash ("--sgs-x-pad-"); the side is appended. The dash lets the wiring fingerprint match the property's readers by prefix.
	 * @return string[] Declarations without a trailing semicolon; empty when no side is set.
	 */
	function sgs_box_object_property_list( $box, string $prefix ): array {
		if ( ! is_array( $box ) ) {
			return array();
		}
		$decls = array();
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			$value = sgs_css_length_value( $box[ $side ] ?? '' );
			if ( '' !== $value ) {
				$decls[] = $prefix . $side . ':' . $value;
			}
		}
		return $decls;
	}
}

if ( ! function_exists( 'sgs_border_radius_tiers' ) ) {
	/**
	 * Resolve a block's `borderRadius` attribute into desktop/tablet/mobile
	 * corner objects, shape-agnostic (Phase 2 tier-object migration,
	 * 2026-09-06): correctly handles BOTH the migrated shape (one tier-object
	 * attribute `{desktop,tablet,mobile}`, each a corner object) and the
	 * legacy flat shape (a bare corner object at `borderRadius`), which still
	 * resolves as the DESKTOP tier with empty tablet/mobile.
	 *
	 * ⚠ The `$legacy_tablet`/`$legacy_mobile` parameters were REMOVED 2026-09-07.
	 * They existed to carry `$attributes['borderRadiusTablet'|'borderRadiusMobile']`
	 * for a not-yet-migrated block. Census that date: all 50 caller blocks are
	 * migrated (tier-object default), so `$has_tier_key` was always true and the
	 * params were never read; and no caller block declares those sibling attrs any
	 * more, so WordPress discarded them anyway (D338) and the callers were passing
	 * a literal null. Dead twice over — and 96 gate findings of pure noise. Removing
	 * them makes the dead path unreachable rather than merely unused.
	 *
	 * Extracted from the identical ~19-line block duplicated across every
	 * block's render.php (the same duplication class `helpers-box.php`'s
	 * other helpers were built to close, D722) — this is that same fix for
	 * the border-radius family, one function instead of 46+ inline copies.
	 *
	 * @param array $attributes The block's render attributes.
	 * @return array{base: array|string|null, tablet: array, mobile: array}
	 */
	function sgs_border_radius_tiers( array $attributes ): array {
		$raw = $attributes['borderRadius'] ?? null;

		$has_tier_key = is_array( $raw ) && (
			array_key_exists( 'desktop', $raw ) || array_key_exists( 'tablet', $raw ) || array_key_exists( 'mobile', $raw )
		);

		if ( $has_tier_key ) {
			$desktop_raw = $raw['desktop'] ?? null;
			$tablet_obj  = is_array( $raw['tablet'] ?? null ) ? $raw['tablet'] : array();
			$mobile_obj  = is_array( $raw['mobile'] ?? null ) ? $raw['mobile'] : array();
		} else {
			// Flat shape: the whole value IS the desktop tier. There is no
			// tablet/mobile source in this shape (the old sibling attributes are
			// gone everywhere — see the note above), so both are empty.
			$desktop_raw = $raw;
			$tablet_obj  = array();
			$mobile_obj  = array();
		}

		$base = null;
		if ( ( is_string( $desktop_raw ) && '' !== $desktop_raw ) || is_int( $desktop_raw ) || is_float( $desktop_raw ) ) {
			// A uniform string or number passes the same length sanitiser as each
			// corner below; a value it rejects (a `;}` breakout) is no radius at all.
			$clean_string = sgs_css_length_value( $desktop_raw );
			$base         = '' !== $clean_string ? $clean_string : null;
		} elseif ( is_array( $desktop_raw ) ) {
			$clean   = array();
			$has_any = false;
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
				$clean[ $corner ] = is_scalar( $desktop_raw[ $corner ] ?? null ) ? sgs_css_length_value( $desktop_raw[ $corner ] ) : '';
				if ( '' !== $clean[ $corner ] ) {
					$has_any = true;
				}
			}
			if ( $has_any ) {
				$base = $clean;
			}
		}

		return array(
			'base'   => $base,
			'tablet' => $tablet_obj,
			'mobile' => $mobile_obj,
		);
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
	 *   - radius         string a CSS length ('16px', '1.5rem', '50%'). A bare
	 *                    number is treated as px (legacy pre-2026-08-13 shape).
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
			$padding = sgs_box_object_longhands( $box['padding'], 'padding' );
			if ( null !== $padding ) {
				$decls[] = $padding;
			}
		}

		// Border radius (single uniform value, ANY CSS length unit).
		//
		// Was `intval( … ) . 'px'` until 2026-08-13 — that hard-coded px and
		// silently truncated any other unit (`intval('1.5rem')` is 1, so a rem
		// value rendered as `1px`). Both callers' attrs are now `type: string`
		// so the operator can pick px/rem/em/%, matching contract §4.3.
		//
		// LEGACY SHAPE: instances stored before that migration hold a BARE
		// NUMBER (e.g. 16). A bare number is not a valid CSS length, so it gets
		// `px` appended — identical output to the old intval path, which is what
		// keeps every existing instance rendering unchanged. Same rule as
		// SpacingControl.js's normaliseFreeInput(), deliberately.
		if ( isset( $box['radius'] ) && '' !== $box['radius'] && null !== $box['radius'] ) {
			$radius = sgs_css_length_value( $box['radius'] );
			if ( '' !== $radius ) {
				if ( preg_match( '/^\d+(\.\d+)?$/', $radius ) ) {
					$radius .= 'px';
				}
				$decls[] = 'border-radius:' . $radius;
			}
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
			$padding_tab = sgs_box_object_longhands( $box['paddingTablet'], 'padding' );
			if ( null !== $padding_tab ) {
				$css .= '@media(max-width:1023px){' . $selector . '{' . $padding_tab . ';}}';
			}
		}
		if ( isset( $box['paddingMobile'] ) && is_array( $box['paddingMobile'] ) ) {
			$padding_mob = sgs_box_object_longhands( $box['paddingMobile'], 'padding' );
			if ( null !== $padding_mob ) {
				$css .= '@media(max-width:767px){' . $selector . '{' . $padding_mob . ';}}';
			}
		}

		return $css;
	}
}
