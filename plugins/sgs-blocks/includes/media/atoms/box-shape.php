<?php
/**
 * `box-shape` atom — PHP value-setter twin of
 * `src/components/media/atoms/box-shape.js`.
 *
 * Sizing MODE (auto / height / ratio, mutually exclusive per registry.js
 * `requires`) plus an independent named SHAPE (none / rounded / circle /
 * square) expressed through `clip-path` — the block WRAPPER's `border-radius`
 * still belongs to `SgsBorderControl` (44 blocks) / native
 * `__experimentalBorder` (`sgs/media`) outright. Since 2026-09-01 this atom
 * ALSO writes a genuine editable radius via a SEPARATE custom property
 * (`--sgs-media-border-radius`) targeting the MEDIA ELEMENT itself, not the
 * wrapper. See the JS twin's docblock for the full reasoning, the collision
 * risk this leaves open for a future block, the `custom` handoff from the
 * `object-fit` atom, the ratio format bridge, and the three `reads` traps
 * (product-card `imageHeight` flat string, hero `splitMediaWidth` number,
 * decorative-image `maxWidthPercent`).
 *
 * `sgs_media_atom_box_shape_css()` must emit BYTE-IDENTICAL declarations to
 * the JS twin's `css()` for the same attribute set — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';
require_once dirname( __DIR__, 2 ) . '/helpers-tokens.php';

if ( ! function_exists( 'sgs_media_atom_box_shape_clip_paths' ) ) {
	/**
	 * The shape -> clip-path map. Never `border-radius` — see module docblock.
	 *
	 * @return array<string,string>
	 */
	function sgs_media_atom_box_shape_clip_paths() {
		return array(
			'square'  => 'inset(0)',
			'rounded' => 'inset(0 round 12px)',
			'circle'  => 'circle(50%)',
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_normalise_ratio' ) ) {
	/**
	 * Normalise a ratio string in EITHER format ("16/10" or "16 / 10") to the
	 * canonical spaced form. Refuses anything that is not two positive
	 * numbers either side of a slash.
	 *
	 * @param mixed $value Raw candidate.
	 * @return string "W / H", or '' when not a valid ratio.
	 */
	function sgs_media_atom_box_shape_normalise_ratio( $value ) {
		if ( ! is_string( $value ) ) {
			return '';
		}
		if ( ! preg_match( '/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/', trim( $value ), $m ) ) {
			return '';
		}
		return $m[1] . ' / ' . $m[2];
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_resolve_sizing_mode' ) ) {
	/**
	 * Reject an out-of-vocabulary `MediaSizing` value to 'auto'. `custom`
	 * (the object-fit atom's sizing-mode sentinel) resolves to 'height' only
	 * when nothing has explicitly chosen a mode yet.
	 *
	 * @param mixed $raw_sizing Raw `MediaSizing` value.
	 * @param mixed $object_fit The surface's own object-fit value (may be 'custom').
	 * @return string 'auto' | 'height' | 'ratio'.
	 */
	function sgs_media_atom_box_shape_resolve_sizing_mode( $raw_sizing, $object_fit ) {
		$vocabulary = array( 'auto', 'height', 'ratio' );
		if ( is_string( $raw_sizing ) && in_array( $raw_sizing, $vocabulary, true ) ) {
			return $raw_sizing;
		}
		if ( 'custom' === $object_fit ) {
			return 'height';
		}
		return 'auto';
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_validate_shape' ) ) {
	/**
	 * Reject an out-of-vocabulary `Shape` value to 'none'.
	 *
	 * @param mixed $value Raw candidate.
	 * @return string A vocabulary member.
	 */
	function sgs_media_atom_box_shape_validate_shape( $value ) {
		$vocabulary = array( 'none', 'rounded', 'circle', 'square' );
		return is_string( $value ) && in_array( $value, $vocabulary, true ) ? $value : 'none';
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_validate_border_style' ) ) {
	/**
	 * Reject an out-of-vocabulary `BorderStyle` value to ''. Mirrors the JS
	 * twin's `validateBorderStyle()` — same allowlist `sgs/before-after`'s
	 * render.php enforces for its own block-private border (Shape B).
	 *
	 * @param mixed $value Raw candidate.
	 * @return string A vocabulary member, or '' when unset/invalid.
	 */
	function sgs_media_atom_box_shape_validate_border_style( $value ) {
		$vocabulary = array( 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
		return is_string( $value ) && in_array( $value, $vocabulary, true ) ? $value : '';
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_to_length_value' ) ) {
	/**
	 * Append `px` to a bare number, matching `sgs_css_length_value()`'s own
	 * bare-number convention (mirrors the JS twin's `toLengthValue()` — see
	 * that function's docblock for the live defect this closes: an unsuffixed
	 * shorthand value is invalid CSS, and the browser silently falls back to
	 * `border-width: medium` (~3px) / `border-radius: 0`).
	 *
	 * A non-numeric string is routed through the shared hardened validator
	 * `sgs_css_length_value()` (helpers-css-safety.php, loaded transitively
	 * via helpers-tokens.php's own require) rather than passed straight
	 * through unsanitised — this atom's editor control (`SgsBorderControl`)
	 * only ever stores a plain number, but a hand-authored theme pattern or a
	 * stored value from an older shape could carry an arbitrary string, and
	 * that string reaches this function's return value directly as a CSS
	 * custom-property VALUE with no further escaping downstream.
	 *
	 * ⛔ NEGATIVE NUMBERS: a negative `border-width`/`border-radius` corner is
	 * invalid CSS and, once joined into the 4-value shorthand, invalidates
	 * the WHOLE declaration — the exact same failure class the unsuffixed-
	 * value fix above closes, triggered by a different malformed input.
	 * Clamped to `'0px'` here rather than passed through.
	 *
	 * @param mixed $value Raw corner/side value.
	 * @return string A safe `px`-suffixed or sanitised length, or `'0'` when
	 *                the input cannot be trusted.
	 */
	function sgs_media_atom_box_shape_to_length_value( $value ) {
		if ( is_numeric( $value ) ) {
			return ( (float) $value < 0 ) ? '0px' : $value . 'px';
		}
		if ( is_string( $value ) ) {
			$sanitised = sgs_css_length_value( $value );
			return '' !== $sanitised ? $sanitised : '0';
		}
		return '0';
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_sides_to_width_shorthand' ) ) {
	/**
	 * Build a 4-SIDE CSS `border-width` shorthand ("top right bottom left")
	 * from a side-keyed box object (`SgsBorderControl`'s own `widthValues`
	 * shape) — mirrors the JS twin's `sidesToWidthShorthand()`. Sibling to
	 * `sgs_media_atom_box_shape_corners_to_radius_shorthand()` below; CANNOT
	 * read a corner-keyed object and vice versa.
	 *
	 * @param mixed $sides Raw `BorderWidth`-shaped value.
	 * @return string "T R B L", or '' when nothing is set.
	 */
	function sgs_media_atom_box_shape_sides_to_width_shorthand( $sides ) {
		if ( ! is_array( $sides ) ) {
			return '';
		}
		$order   = array( 'top', 'right', 'bottom', 'left' );
		$has_any = false;
		foreach ( $order as $k ) {
			if ( isset( $sides[ $k ] ) && '' !== $sides[ $k ] ) {
				$has_any = true;
				break;
			}
		}
		if ( ! $has_any ) {
			return '';
		}
		$parts = array();
		foreach ( $order as $k ) {
			$parts[] = ( isset( $sides[ $k ] ) && '' !== $sides[ $k ] ) ? sgs_media_atom_box_shape_to_length_value( $sides[ $k ] ) : '0';
		}
		return implode( ' ', $parts );
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_resolve_tier_object' ) ) {
	/**
	 * Read a Height/Width-shaped value in EITHER stored shape: this atom's
	 * own tier object (`{desktop,tablet,mobile}`) or a flat unit-embedded
	 * STRING / bare number (the `imageHeight`/`splitMediaWidth` traps).
	 *
	 * @param mixed $raw Raw attribute value.
	 * @return array{desktop?:mixed,tablet?:mixed,mobile?:mixed,__unitEmbedded?:bool}
	 */
	function sgs_media_atom_box_shape_resolve_tier_object( $raw ) {
		if ( is_string( $raw ) && '' !== $raw ) {
			return array(
				'desktop'        => $raw,
				'__unitEmbedded' => true,
			);
		}
		if ( is_numeric( $raw ) ) {
			return array( 'desktop' => $raw );
		}
		if ( is_array( $raw ) ) {
			$out = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				if ( isset( $raw[ $tier ] ) && ( is_numeric( $raw[ $tier ] ) || ( is_string( $raw[ $tier ] ) && '' !== $raw[ $tier ] ) ) ) {
					$out[ $tier ] = $raw[ $tier ];
				}
			}
			return $out;
		}
		return array();
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_corners_to_radius_shorthand' ) ) {
	/**
	 * Convert a 4-corner box object into the CSS `border-radius` shorthand
	 * VALUE string, in the shorthand's own order (top-left, top-right,
	 * bottom-right, bottom-left) — corners are read by NAME, never assumed to
	 * already be in shorthand order. An unset corner defaults to '0' so the
	 * shorthand is always well-formed; an entirely-empty object returns ''
	 * so the caller can fall back to the shared preset.
	 *
	 * @param mixed $corners Raw `BorderRadius`-shaped value.
	 * @return string "TL TR BR BL", or '' when nothing is set.
	 */
	function sgs_media_atom_box_shape_corners_to_radius_shorthand( $corners ) {
		if ( ! is_array( $corners ) ) {
			return '';
		}
		$order   = array( 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' );
		$has_any = false;
		foreach ( $order as $k ) {
			if ( isset( $corners[ $k ] ) && '' !== $corners[ $k ] ) {
				$has_any = true;
				break;
			}
		}
		if ( ! $has_any ) {
			return '';
		}
		$parts = array();
		foreach ( $order as $k ) {
			$parts[] = ( isset( $corners[ $k ] ) && '' !== $corners[ $k ] ) ? sgs_media_atom_box_shape_to_length_value( $corners[ $k ] ) : '0';
		}
		return implode( ' ', $parts );
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_format_length' ) ) {
	/**
	 * Format a numeric-or-string tier value with its unit, unless already
	 * unit-embedded.
	 *
	 * @param mixed  $value            Tier value.
	 * @param string $unit             Unit to append when not embedded.
	 * @param bool   $already_embedded True when the source was a unit-embedded string.
	 * @return string
	 */
	function sgs_media_atom_box_shape_format_length( $value, $unit, $already_embedded ) {
		if ( null === $value || '' === $value ) {
			return '';
		}
		if ( $already_embedded || is_string( $value ) ) {
			return (string) $value;
		}
		return $value . ( $unit ? $unit : 'px' );
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_requires' ) ) {
	/**
	 * Height/Aspect ratio are mutually exclusive (registry.js `requires`);
	 * Shape and the min/max/width rows are independent of sizing mode.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null|string,mode:string,heightState:string,ratioState:string}
	 */
	function sgs_media_atom_box_shape_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		$sizing_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MediaSizing' );
		$fit_key    = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFit' );
		$mode       = sgs_media_atom_box_shape_resolve_sizing_mode( $attributes[ $sizing_key ] ?? null, $attributes[ $fit_key ] ?? null );

		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
			'mode'         => $mode,
			'heightState'  => 'height' === $mode ? 'visible' : 'hidden',
			'ratioState'   => 'ratio' === $mode ? 'visible' : 'hidden',
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_css' ) ) {
	/**
	 * Custom-property declarations for this atom. Mirrors the JS twin's
	 * `css()` exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_box_shape_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();

		$sizing_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MediaSizing' );
		$fit_key    = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFit' );
		$mode       = sgs_media_atom_box_shape_resolve_sizing_mode( $attributes[ $sizing_key ] ?? null, $attributes[ $fit_key ] ?? null );

		if ( 'height' === $mode ) {
			$height_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Height' );
			$unit_key   = sgs_media_element_stored_attr( $block_slug, $prefix, 'HeightUnit' );
			$resolved   = sgs_media_atom_box_shape_resolve_tier_object( $attributes[ $height_key ] ?? null );
			$unit       = $attributes[ $unit_key ] ?? 'px';
			$embedded   = ! empty( $resolved['__unitEmbedded'] );

			$tiers = array(
				'desktop' => '',
				'tablet'  => '-tablet',
				'mobile'  => '-mobile',
			);
			foreach ( $tiers as $tier => $suffix ) {
				$val = sgs_media_atom_box_shape_format_length( $resolved[ $tier ] ?? null, $unit, $embedded );
				if ( '' !== $val ) {
					$decls[] = '--sgs-media-height' . $suffix . ':' . $val;
				}
			}
		}

		if ( 'ratio' === $mode ) {
			$ratio_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'AspectRatio' );
			$ratio     = sgs_media_atom_box_shape_normalise_ratio( $attributes[ $ratio_key ] ?? null );
			if ( '' !== $ratio ) {
				$decls[] = '--sgs-media-aspect-ratio:' . $ratio;
			}
		}

		$width_key      = sgs_media_element_stored_attr( $block_slug, $prefix, 'Width' );
		$width_unit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'WidthUnit' );
		$resolved_width = sgs_media_atom_box_shape_resolve_tier_object( $attributes[ $width_key ] ?? null );
		$width_unit     = $attributes[ $width_unit_key ] ?? 'px';
		$width_tiers    = array(
			'desktop' => '',
			'tablet'  => '-tablet',
			'mobile'  => '-mobile',
		);
		foreach ( $width_tiers as $tier => $suffix ) {
			$val = sgs_media_atom_box_shape_format_length( $resolved_width[ $tier ] ?? null, $width_unit, false );
			if ( '' !== $val ) {
				$decls[] = '--sgs-media-width' . $suffix . ':' . $val;
			}
		}

		$min_height_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MinHeight' );
		$min_height_raw = $attributes[ $min_height_key ] ?? null;
		$min_height_obj = is_array( $min_height_raw ) ? $min_height_raw : array();
		$mh_tiers       = array(
			'desktop' => '',
			'tablet'  => '-tablet',
			'mobile'  => '-mobile',
		);
		foreach ( $mh_tiers as $tier => $suffix ) {
			$val = $min_height_obj[ $tier ] ?? null;
			if ( null !== $val && '' !== $val ) {
				$decls[] = '--sgs-media-min-height' . $suffix . ':' . $val;
			}
		}

		$max_width_key      = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxWidth' );
		$max_width_unit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxWidthUnit' );
		$max_width_raw      = $attributes[ $max_width_key ] ?? null;
		$max_width_desktop  = is_array( $max_width_raw ) ? ( $max_width_raw['desktop'] ?? null ) : null;
		if ( null !== $max_width_desktop && '' !== $max_width_desktop ) {
			$decls[] = '--sgs-media-max-width:' . $max_width_desktop . ( $attributes[ $max_width_unit_key ] ?? 'px' );
		}

		$max_height_key      = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxHeight' );
		$max_height_unit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxHeightUnit' );
		$max_height_raw      = $attributes[ $max_height_key ] ?? null;
		$max_height_desktop  = is_array( $max_height_raw ) ? ( $max_height_raw['desktop'] ?? null ) : null;
		if ( null !== $max_height_desktop && '' !== $max_height_desktop ) {
			$decls[] = '--sgs-media-max-height:' . $max_height_desktop . ( $attributes[ $max_height_unit_key ] ?? 'px' );
		}

		$max_width_percent_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxWidthPercent' );
		$max_width_percent     = $attributes[ $max_width_percent_key ] ?? null;
		if ( is_numeric( $max_width_percent ) ) {
			$decls[] = '--sgs-media-max-width-percent:' . $max_width_percent . '%;';
		}

		$shape_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Shape' );
		$shape     = sgs_media_atom_box_shape_validate_shape( $attributes[ $shape_key ] ?? null );
		if ( 'none' !== $shape ) {
			$clip_paths = sgs_media_atom_box_shape_clip_paths();
			$decls[]    = '--sgs-media-clip-path:' . $clip_paths[ $shape ];
		}

		// The border's own paint -- width/style/colour/radius, ungated by
		// $shape (2026-09-02). Mirrors the JS twin's css() exactly: emitted
		// when a real value is set, skipped entirely otherwise ("nothing for
		// an empty attribute set").
		$radius_key        = sgs_media_element_stored_attr( $block_slug, $prefix, 'BorderRadius' );
		$radius_tablet_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'BorderRadiusTablet' );
		$radius_mobile_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'BorderRadiusMobile' );
		$desktop_radius_shorthand = sgs_media_atom_box_shape_corners_to_radius_shorthand( $attributes[ $radius_key ] ?? null );
		$tablet_radius_shorthand  = sgs_media_atom_box_shape_corners_to_radius_shorthand( $attributes[ $radius_tablet_key ] ?? null );
		$mobile_radius_shorthand  = sgs_media_atom_box_shape_corners_to_radius_shorthand( $attributes[ $radius_mobile_key ] ?? null );
		if ( '' !== $desktop_radius_shorthand ) {
			$decls[] = '--sgs-media-border-radius:' . $desktop_radius_shorthand;
		}
		if ( '' !== $tablet_radius_shorthand ) {
			$decls[] = '--sgs-media-border-radius-tablet:' . $tablet_radius_shorthand;
		}
		if ( '' !== $mobile_radius_shorthand ) {
			$decls[] = '--sgs-media-border-radius-mobile:' . $mobile_radius_shorthand;
		}

		$border_width_key       = sgs_media_element_stored_attr( $block_slug, $prefix, 'BorderWidth' );
		$border_width_shorthand = sgs_media_atom_box_shape_sides_to_width_shorthand( $attributes[ $border_width_key ] ?? null );
		if ( '' !== $border_width_shorthand ) {
			$decls[] = '--sgs-media-border-width:' . $border_width_shorthand;
		}

		$border_style_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'BorderStyle' );
		$border_style      = sgs_media_atom_box_shape_validate_border_style( $attributes[ $border_style_key ] ?? null );
		if ( '' !== $border_style ) {
			$decls[] = '--sgs-media-border-style:' . $border_style;
		}

		// Colour pair -- gradient wins over flat colour, same
		// sgs_background_paint_value() primitive the `overlay` atom uses
		// (helpers-tokens.php). A gradient rides border-image (box-shape.css's
		// border-image-slice:1 companion) rather than border-color, since a
		// single CSS custom property cannot carry the masked-::before-ring
		// technique sgs_border_gradient_css() uses -- that helper builds a
		// full scoped CSS rule, and this atom's contract is custom-property
		// VALUES only, never bare rules.
		$border_colour_key          = sgs_media_element_stored_attr( $block_slug, $prefix, 'BorderColour' );
		$border_colour_gradient_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'BorderColourGradient' );
		$border_paint               = sgs_background_paint_value(
			$attributes[ $border_colour_key ] ?? null,
			$attributes[ $border_colour_gradient_key ] ?? null
		);
		if ( 'background-image' === $border_paint['property'] ) {
			$decls[] = '--sgs-media-border-image:' . $border_paint['value'];
		} elseif ( 'background-color' === $border_paint['property'] ) {
			$decls[] = '--sgs-media-border-color:' . $border_paint['value'];
		}

		return $decls;
	}
}
