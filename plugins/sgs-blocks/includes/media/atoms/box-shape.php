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
 * (`--sgs-media-border-{corner}-radius`, one property per corner) targeting the MEDIA ELEMENT itself, not the
 * wrapper. See the JS twin's docblock for the full reasoning, the collision
 * risk this leaves open for a future block, the ratio format bridge, and the two `reads` traps
 * (product-card `imageHeight` flat string, hero `splitMediaWidth` number).
 *
 * `MaxWidthPercent` was DELETED (2026-09-07) — a percentage max-width IS a
 * max-width with a `%` unit, and `%` is already an allowed unit in the length string
 * value, so the dedicated attribute/custom-property/control row was a
 * second cascade layer for zero capability loss. `sgs/decorative-image`
 * (which never adopted this atom) holds its own per-device `maxWidth` length.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';
require_once dirname( __DIR__, 2 ) . '/helpers-tokens.php';

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
	 * Resolve the sizing mode: an in-vocabulary `MediaSizing` value wins; an
	 * unset or unknown one is derived from the stored Height / AspectRatio.
	 *
	 * @param mixed $raw_sizing Raw `MediaSizing` value.
	 * @param mixed $object_fit The surface's own object-fit value (not read; kept for the twin's signature).
	 * @return string 'auto' | 'height' | 'ratio' | 'fill'.
	 */
	function sgs_media_atom_box_shape_resolve_sizing_mode( $raw_sizing, $object_fit, array $attributes = array(), $prefix = '', $block_slug = '' ) {
		$vocabulary = array( 'auto', 'height', 'ratio', 'fill' );
		if ( is_string( $raw_sizing ) && in_array( $raw_sizing, $vocabulary, true ) ) {
			return $raw_sizing;
		}
		// DERIVED MODE (D1001). An absent `MediaSizing` used to fall straight to
		// 'auto' -- which is the one mode that HIDES the Height control AND
		// suppresses its CSS. The result was a stored value that rendered
		// nothing while the control that would reveal it was invisible: a clone
		// stored `height: {"desktop":"440px"}` and the image rendered at
		// intrinsic size, with the client unable to find any control to fix it.
		//
		// `MediaSizing` deliberately has NO block.json default, and adding
		// `"default": "auto"` would ship the SAME bug behind a defensible-looking
		// diff, because 'auto' is precisely the hiding state. So the mode is
		// DERIVED from what the client actually stored: a Height value means
		// they meant 'height'; an AspectRatio means they meant 'ratio'.
		//
		// Presence is tested with the SAME helpers `css()` uses to EMIT
		// (`resolve_tier_object` / `normalise_ratio`), never a second notion of
		// "set" -- a divergence there would resurrect the original defect from
		// the opposite side (mode says height, emitter finds nothing).
		//
		// An explicit in-vocabulary value ALWAYS wins (checked first), so a
		// client who deliberately chooses Auto keeps Auto even with a stale
		// height stored from a previous mode.
		if ( array() !== $attributes ) {
			$height_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Height' );
			$resolved   = sgs_media_atom_box_shape_resolve_tier_object( $attributes[ $height_key ] ?? null );
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				if ( isset( $resolved[ $tier ] ) && '' !== (string) $resolved[ $tier ] ) {
					return 'height';
				}
			}
			$ratio_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'AspectRatio' );
			if ( '' !== sgs_media_atom_box_shape_normalise_ratio( $attributes[ $ratio_key ] ?? null ) ) {
				return 'ratio';
			}
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
	 * `sgs_media_atom_box_shape_corner_radius_decls()` below; CANNOT
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
	 * Read a Height/Width/MaxWidth/MaxHeight-shaped value: this atom's
	 * per-device tier object of CSS length strings, or (Height only) a flat
	 * unit-embedded STRING such as `sgs/product-card`'s `imageHeight`, read
	 * as the desktop value.
	 *
	 * @param mixed $raw Raw attribute value.
	 * @return array{desktop?:string,tablet?:string,mobile?:string}
	 */
	function sgs_media_atom_box_shape_resolve_tier_object( $raw ) {
		if ( is_string( $raw ) && '' !== $raw ) {
			return array( 'desktop' => $raw );
		}
		$out = array();
		if ( is_array( $raw ) ) {
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				if ( isset( $raw[ $tier ] ) && is_string( $raw[ $tier ] ) && '' !== $raw[ $tier ] ) {
					$out[ $tier ] = $raw[ $tier ];
				}
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_corner_radius_decls' ) ) {
	/**
	 * Per-corner `border-radius` custom-property declarations for ONE tier, in
	 * the order top-left, top-right, bottom-right, bottom-left. Corners are
	 * read by NAME (`topLeft` …), and only the corners the client set are
	 * emitted, so an unset corner falls through to the wider tier's value in
	 * the stylesheet instead of being zeroed. Mirrors the JS twin's
	 * `cornerRadiusDecls()`.
	 *
	 * @param mixed  $corners Raw `BorderRadius`-shaped value for one tier.
	 * @param string $suffix  Tier suffix: '', '-tablet' or '-mobile'.
	 * @return string[] `--sgs-media-border-<corner>-radius<suffix>:<value>` declarations.
	 */
	function sgs_media_atom_box_shape_corner_radius_decls( $corners, $suffix ) {
		$decls = array();
		if ( ! is_array( $corners ) ) {
			return $decls;
		}
		$order = array(
			'topLeft'     => 'top-left',
			'topRight'    => 'top-right',
			'bottomRight' => 'bottom-right',
			'bottomLeft'  => 'bottom-left',
		);
		foreach ( $order as $k => $css_name ) {
			if ( isset( $corners[ $k ] ) && '' !== $corners[ $k ] ) {
				$decls[] = '--sgs-media-border-' . $css_name . '-radius' . $suffix . ':' . sgs_media_atom_box_shape_to_length_value( $corners[ $k ] );
			}
		}
		return $decls;
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_tier_length_decls' ) ) {
	/**
	 * One `--name`, `--name-tablet`, `--name-mobile` declaration per set
	 * device, each value passed through `sgs_css_length_value()`.
	 *
	 * @param string $name  Custom property name without a device suffix.
	 * @param array  $tiers Per-device length strings.
	 * @return string[]
	 */
	function sgs_media_atom_box_shape_tier_length_decls( $name, array $tiers ) {
		$decls  = array();
		$suffix = array(
			'desktop' => '',
			'tablet'  => '-tablet',
			'mobile'  => '-mobile',
		);
		foreach ( $suffix as $tier => $tier_suffix ) {
			$val = sgs_css_length_value( $tiers[ $tier ] ?? '' );
			if ( '' !== $val ) {
				$decls[] = $name . $tier_suffix . ':' . $val;
			}
		}
		return $decls;
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
		$mode       = sgs_media_atom_box_shape_resolve_sizing_mode( $attributes[ $sizing_key ] ?? null, $attributes[ $fit_key ] ?? null, $attributes, $prefix, $block_slug );

		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
			'mode'         => $mode,
			'heightState'  => 'height' === $mode ? 'visible' : 'hidden',
			'ratioState'   => 'ratio' === $mode ? 'visible' : 'hidden',
		);
	}
}
