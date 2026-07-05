<?php
/**
 * General responsive CSS-rule emitter — Pattern A (Kadence-confirmed).
 *
 * For ANY property with per-device attribute variants, the desktop/base value
 * MUST be emitted on the SAME selector as the tablet (max-width:1023px) and
 * mobile (max-width:767px) tier overrides inside a scoped <style> tag — never
 * as an inline style="" on the element. Inline style has a higher effective
 * specificity than any selector (including id selectors) so a base value
 * written inline permanently defeats a same-id media-query override; moving
 * base + tiers onto one selector makes normal CSS cascade order (mobile rule
 * declared after tablet rule, both after the base rule) do the overriding
 * correctly. Non-responsive scalar properties (no tablet/mobile counterpart)
 * are unaffected by this helper and may stay inline.
 *
 * `sgs_typography_css_rule()` (helpers-typography.php) is implemented on top
 * of `sgs_responsive_css_rule()` below — same 9 existing callers, same output
 * shape, now generalised so any block can emit any responsive property family
 * through one mechanism instead of hand-rolling per-block responsive builders.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_responsive_sanitise_unit' ) ) {
	/**
	 * Strip a CSS unit down to safe letters/percent only.
	 *
	 * @param string $unit Raw unit string.
	 * @return string Sanitised unit (may be '').
	 */
	function sgs_responsive_sanitise_unit( $unit ) {
		return preg_replace( '/[^a-z%]/i', '', (string) $unit );
	}
}

if ( ! function_exists( 'sgs_responsive_css_rule' ) ) {
	/**
	 * Build a scoped responsive CSS rule (base + tablet + mobile) for one or
	 * more independent CSS properties on the SAME selector.
	 *
	 * Each entry in $prop_map describes one property family:
	 *   'attr'              (string, required)  Base/desktop attribute key.
	 *   'css'               (string, required)  CSS property name (e.g. 'font-size').
	 *   'unit_attr'         (string, optional)   Attribute key holding the unit.
	 *   'unit_default'      (string, optional)   Unit used when unit_attr absent/empty. Default ''.
	 *   'unitless_sentinel' (string, optional)   A unit_attr value meaning "no unit".
	 *   'tablet_attr'       (string, optional)   Tablet override attribute key.
	 *   'mobile_attr'       (string, optional)   Mobile override attribute key.
	 *   'cast'              ('float'|'int', optional) Numeric cast. Default 'float'.
	 *   'transform'         (callable, optional) Value transform (e.g. 'sgs_colour_value').
	 *                       When set, unit handling is skipped — the callable
	 *                       returns the full CSS value.
	 *
	 * Only present, valid (numeric, unless a transform is supplied) values are
	 * emitted — an absent/blank attribute falls through to the element's
	 * existing CSS default, exactly like the original per-block helpers.
	 *
	 * @param array  $attributes Block attributes.
	 * @param array  $prop_map   List of property specs (see above).
	 * @param string $selector   Fully-formed, already-safe CSS selector.
	 * @return string CSS text (no <style> wrapper); '' when nothing is set.
	 */
	function sgs_responsive_css_rule( array $attributes, array $prop_map, $selector ) {
		$base_decls   = array();
		$tablet_decls = array();
		$mobile_decls = array();

		foreach ( $prop_map as $spec ) {
			if ( empty( $spec['attr'] ) || empty( $spec['css'] ) ) {
				continue;
			}

			$css_prop  = $spec['css'];
			$cast      = $spec['cast'] ?? 'float';
			$transform = $spec['transform'] ?? null;

			$unit = $spec['unit_default'] ?? '';
			if ( ! empty( $spec['unit_attr'] ) && isset( $attributes[ $spec['unit_attr'] ] ) && '' !== $attributes[ $spec['unit_attr'] ] ) {
				$raw_unit = (string) $attributes[ $spec['unit_attr'] ];
				if ( isset( $spec['unitless_sentinel'] ) && $spec['unitless_sentinel'] === $raw_unit ) {
					$unit = '';
				} else {
					$unit = sgs_responsive_sanitise_unit( $raw_unit );
				}
			}

			$emit_value = function ( $raw ) use ( $css_prop, $unit, $cast, $transform ) {
				if ( $transform ) {
					return $css_prop . ':' . call_user_func( $transform, $raw ) . ';';
				}
				$num = 'int' === $cast ? (string) intval( $raw ) : (string) floatval( $raw );
				return $css_prop . ':' . $num . $unit . ';';
			};

			$is_valid = function ( $raw ) use ( $transform ) {
				return null !== $raw && '' !== $raw && ( $transform || is_numeric( $raw ) );
			};

			if ( isset( $attributes[ $spec['attr'] ] ) && $is_valid( $attributes[ $spec['attr'] ] ) ) {
				$base_decls[] = $emit_value( $attributes[ $spec['attr'] ] );
			}
			if ( ! empty( $spec['tablet_attr'] ) && isset( $attributes[ $spec['tablet_attr'] ] ) && $is_valid( $attributes[ $spec['tablet_attr'] ] ) ) {
				$tablet_decls[] = $emit_value( $attributes[ $spec['tablet_attr'] ] );
			}
			if ( ! empty( $spec['mobile_attr'] ) && isset( $attributes[ $spec['mobile_attr'] ] ) && $is_valid( $attributes[ $spec['mobile_attr'] ] ) ) {
				$mobile_decls[] = $emit_value( $attributes[ $spec['mobile_attr'] ] );
			}
		}

		$css = '';
		if ( $base_decls ) {
			$css .= $selector . '{' . implode( '', $base_decls ) . '}';
		}
		if ( $tablet_decls ) {
			$css .= '@media (max-width:1023px){' . $selector . '{' . implode( '', $tablet_decls ) . '}}';
		}
		if ( $mobile_decls ) {
			$css .= '@media (max-width:767px){' . $selector . '{' . implode( '', $mobile_decls ) . '}}';
		}

		return $css;
	}
}

if ( ! function_exists( 'sgs_responsive_box_shorthand_rule' ) ) {
	/**
	 * Build a scoped responsive 4-side shorthand rule (e.g. margin / padding)
	 * for one selector. Mirrors the heading block's original wrapper spacing
	 * behaviour: a tier's shorthand is emitted ONLY when at least one side is
	 * set at that tier, and any side left unset at an active tier fills to
	 * '0' for that declaration (matches the pre-existing per-block contract —
	 * do not change this fill behaviour when migrating a block that already
	 * relies on it).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $css_prop   'margin' | 'padding' (or any 4-side shorthand prop).
	 * @param array  $sides      array( 'top' => array('base'=>attr,'tablet'=>attr,'mobile'=>attr), 'right'=>…, 'bottom'=>…, 'left'=>… ).
	 * @param string $unit_attr  Attribute key holding the (single, shared) unit.
	 * @param string $selector   Fully-formed, already-safe CSS selector.
	 * @param string $unit_default Fallback unit when $unit_attr is unset. Default 'px'.
	 * @return string CSS text; '' when nothing is set.
	 */
	function sgs_responsive_box_shorthand_rule( array $attributes, $css_prop, array $sides, $unit_attr, $selector, $unit_default = 'px' ) {
		$unit = isset( $attributes[ $unit_attr ] ) && '' !== $attributes[ $unit_attr ]
			? sgs_responsive_sanitise_unit( $attributes[ $unit_attr ] )
			: $unit_default;

		$order = array( 'top', 'right', 'bottom', 'left' );

		$sanitise_val = function ( $raw ) {
			$trimmed = trim( (string) $raw );
			if ( '' === $trimmed || ! preg_match( '/^-?\d+(\.\d+)?$/', $trimmed ) ) {
				return null;
			}
			return $trimmed;
		};

		$build_tier = function ( $tier_key ) use ( $attributes, $sides, $order, $sanitise_val, $unit ) {
			$any  = false;
			$vals = array();
			foreach ( $order as $side ) {
				$attr_key = $sides[ $side ][ $tier_key ] ?? null;
				$raw      = $attr_key && isset( $attributes[ $attr_key ] ) ? $attributes[ $attr_key ] : null;
				$val      = null !== $raw ? $sanitise_val( $raw ) : null;
				if ( null !== $val ) {
					$any = true;
				}
				$vals[ $side ] = null !== $val ? $val . $unit : '0';
			}
			return $any ? implode( ' ', array( $vals['top'], $vals['right'], $vals['bottom'], $vals['left'] ) ) : null;
		};

		$css       = '';
		$base_val  = $build_tier( 'base' );
		$tab_val   = $build_tier( 'tablet' );
		$mob_val   = $build_tier( 'mobile' );

		if ( null !== $base_val ) {
			$css .= $selector . '{' . $css_prop . ':' . $base_val . ';}';
		}
		if ( null !== $tab_val ) {
			$css .= '@media (max-width:1023px){' . $selector . '{' . $css_prop . ':' . $tab_val . ';}}';
		}
		if ( null !== $mob_val ) {
			$css .= '@media (max-width:767px){' . $selector . '{' . $css_prop . ':' . $mob_val . ';}}';
		}

		return $css;
	}
}
