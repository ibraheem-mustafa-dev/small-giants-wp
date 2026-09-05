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

// This file's helpers delegate to sgs_css_length_value() (Spec 32 §6.1 (a2)).
// Require it HERE, not just via render-helpers.php, because a render.php may
// require_once this file directly without ever loading render-helpers.php —
// without this line those pages would fatal on "Call to undefined function
// sgs_css_length_value()". Both files guard with function_exists(), so load
// order does not matter — only that both load before either is CALLED.
require_once __DIR__ . '/helpers-css-safety.php';

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

if ( ! function_exists( 'sgs_native_border_style_width_args' ) ) {
	/**
	 * Gate a WP-native `style.border.style` + `style.border.width` PAIR so a
	 * border-style set with no width never falls through to the browser's
	 * initial `border-width: medium` (~3px) — Bean's ruling (G5, 2026-08-26):
	 * "border with no width should mean no border by default."
	 *
	 * WP core's own style engine (`WP_Style_Engine::BLOCK_STYLE_DEFINITIONS_METADATA`,
	 * `border.style`/`border.width`) treats these two properties as fully
	 * independent declarations — a caller that hands it `style` without
	 * `width` produces a lone `border-style:solid;`, and CSS's initial
	 * `border-width` is `medium`, so the browser paints a ~3px border nobody
	 * asked for. This is the SAME defect class as `sgs_button_element_style_css()`
	 * (`helpers-button-style.php`) fixes for the CTA-element path; this helper
	 * is the equivalent single gate for every WP-native `style.border` caller,
	 * so the rule lives in ONE place rather than being re-derived per block
	 * (R-31-9 — no per-block carve-outs).
	 *
	 * Decision: ABSENCE, not `border-width:0`. A `0`-width border still beats
	 * an inherited border from a parent/theme rule; Bean's "no border by
	 * default" means the declaration is never emitted at all, matching what
	 * an operator who never touched the border controls already sees.
	 *
	 * The inverse case — `width` set with `style` absent — is NOT altered
	 * here. CSS's initial `border-style` is `none`, so a lone `border-width`
	 * declaration already renders no visible border; that shape was already
	 * correct and is left as every caller already had it.
	 *
	 * @param mixed $style_raw Raw `style.border.style` value (string|null).
	 * @param mixed $width_raw Raw `style.border.width` value (string|null).
	 * @return array{style?:string,width?:string} `style` is present ONLY when
	 *         `width` is also present and non-empty. Empty array when nothing
	 *         should render.
	 */
	function sgs_native_border_style_width_args( $style_raw, $width_raw ): array {
		$args      = array();
		$has_width = isset( $width_raw ) && '' !== $width_raw;

		if ( $has_width ) {
			$args['width'] = sgs_css_length_value( $width_raw );
		}
		if ( $has_width && isset( $style_raw ) && '' !== $style_raw ) {
			$args['style'] = sgs_css_keyword_sanitise( $style_raw );
		}

		return $args;
	}
}

if ( ! function_exists( 'sgs_native_border_has_width' ) ) {
	/**
	 * True when a native `style.border` array carries a width in EITHER shape.
	 *
	 * WP writes a flat `width` when the four sides are linked and a per-side
	 * `{top,right,bottom,left}.width` when the operator unlinks them. Both are
	 * a width; a gate that recognises only the flat key would treat an unlinked
	 * border as widthless.
	 *
	 * @param array $border Native `style.border` array.
	 * @return bool
	 */
	function sgs_native_border_has_width( array $border ): bool {
		if ( isset( $border['width'] ) && '' !== $border['width'] ) {
			return true;
		}
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
			if ( isset( $border[ $side ]['width'] ) && '' !== $border[ $side ]['width'] ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_gate_native_border_style' ) ) {
	/**
	 * Apply the SAME "no width = no border" gate (see
	 * `sgs_native_border_style_width_args()` above) to an ALREADY-BUILT
	 * native `style.border` array — for callers that pass the whole
	 * `style.border` group straight through to `wp_style_engine_get_styles()`
	 * rather than hand-picking individual keys (e.g. `sgs/brand-strip`,
	 * `sgs/countdown-timer`, `sgs/product-faq`). Strips `style` when `width`
	 * is absent/empty; every other key (`color`, `radius`, per-side props)
	 * is left untouched.
	 *
	 * ⚠ A width may be declared FLAT (`width`) or PER SIDE
	 * (`top.width` / `right.width` / `bottom.width` / `left.width`) — WP's
	 * BorderBoxControl emits the per-side shape whenever the operator unlinks
	 * the sides. Either shape counts as "has a width": gating on the flat key
	 * alone would strip a legitimate style from a per-side border and DELETE a
	 * border the operator can see, which is a worse defect than the ~3px one
	 * this helper exists to prevent.
	 *
	 * @param array $border Raw/partially-sanitised `style.border` array.
	 * @return array Same array, with `style` removed when ungated.
	 */
	function sgs_gate_native_border_style( array $border ): array {
		if ( ! isset( $border['style'] ) ) {
			return $border;
		}
		if ( ! sgs_native_border_has_width( $border ) ) {
			unset( $border['style'] );
		}
		return $border;
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

if ( ! function_exists( 'sgs_border_radius_tiers' ) ) {
	/**
	 * Resolve a block's `borderRadius` attribute into desktop/tablet/mobile
	 * corner objects, shape-agnostic (Phase 2 tier-object migration,
	 * 2026-09-06): correctly handles BOTH the migrated shape (one tier-object
	 * attribute `{desktop,tablet,mobile}`, each a corner object) and the
	 * legacy flat shape (a bare corner object at `borderRadius`, with
	 * `borderRadiusTablet`/`borderRadiusMobile` as separate sibling
	 * attributes — passed in via `$legacy_tablet`/`$legacy_mobile` since a
	 * block with the OLD shape still has them declared and readable).
	 *
	 * Extracted from the identical ~19-line block duplicated across every
	 * block's render.php (the same duplication class `helpers-box.php`'s
	 * other helpers were built to close, D722) — this is that same fix for
	 * the border-radius family, one function instead of 46+ inline copies.
	 *
	 * @param array $attributes    The block's render attributes.
	 * @param mixed $legacy_tablet Raw `$attributes['borderRadiusTablet'] ?? null`,
	 *                             for a block that hasn't migrated yet.
	 * @param mixed $legacy_mobile Raw `$attributes['borderRadiusMobile'] ?? null`.
	 * @return array{base: array|string|null, tablet: array, mobile: array}
	 */
	function sgs_border_radius_tiers( array $attributes, $legacy_tablet = null, $legacy_mobile = null ): array {
		$raw = $attributes['borderRadius'] ?? null;

		$has_tier_key = is_array( $raw ) && (
			array_key_exists( 'desktop', $raw ) || array_key_exists( 'tablet', $raw ) || array_key_exists( 'mobile', $raw )
		);

		if ( $has_tier_key ) {
			$desktop_raw = $raw['desktop'] ?? null;
			$tablet_obj  = is_array( $raw['tablet'] ?? null ) ? $raw['tablet'] : array();
			$mobile_obj  = is_array( $raw['mobile'] ?? null ) ? $raw['mobile'] : array();
		} else {
			$desktop_raw = $raw;
			$tablet_obj  = is_array( $legacy_tablet ) ? $legacy_tablet : array();
			$mobile_obj  = is_array( $legacy_mobile ) ? $legacy_mobile : array();
		}

		$base = null;
		if ( is_string( $desktop_raw ) && '' !== $desktop_raw ) {
			$base = $desktop_raw;
		} elseif ( is_array( $desktop_raw ) ) {
			$clean   = array();
			$has_any = false;
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
				$clean[ $corner ] = isset( $desktop_raw[ $corner ] ) ? sgs_css_length_value( $desktop_raw[ $corner ] ) : '';
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
			$padding = sgs_box_object_shorthand( $box['padding'] );
			if ( null !== $padding ) {
				$decls[] = 'padding:' . $padding;
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
