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

// The FR-S9-6 object-model emitter (sgs_emit_responsive_css) reads the shared
// breakpoint source. Require it here so any caller of this file resolves it.
require_once __DIR__ . '/class-sgs-breakpoints.php';

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

		$css      = '';
		$base_val = $build_tier( 'base' );
		$tab_val  = $build_tier( 'tablet' );
		$mob_val  = $build_tier( 'mobile' );

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

/*
 * ─────────────────────────────────────────────────────────────────────────────
 *  FR-S9-6 — object-model responsive-override engine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The functions above operate on the FLAT-tier attribute convention (separate
 * `gap` / `gapTablet` / `gapMobile` keys). The §S9 header/footer/nav blocks use
 * the OBJECT model instead: one attribute per property, shaped
 *   scalar:  { desktop:<val>, tablet:<val|null>, mobile:<val|null> }
 *   box:     { desktop:{top,right,bottom,left}, tablet:{…nullable sides}, mobile:{…} }
 * where `null` (or an absent key) means "inherit the tier above" and `desktop`
 * is always concrete.
 *
 * Design (FR-S9-6):
 *   - Cascade is mobile-first-up, fixed direction. Effective value at a tier =
 *     `tier ?? tier_above ?? … ?? desktop`, computed independently PER SIDE for
 *     box properties (`mobile.top ?? tablet.top ?? desktop.top`).
 *   - A tier's rule is emitted ONLY where its effective value diverges from the
 *     tier below (no redundant rule emission). This is done uniformly by
 *     expanding every property into scalar "atoms" (a box property → 4 side
 *     atoms), formatting each atom's effective per-tier value to a declaration
 *     string, and emitting a tier's declaration only when its string differs
 *     from the tier below's.
 *   - Box properties emit per-side LONGHAND (`padding-top` …) not shorthand, so
 *     per-side inheritance and per-side tier-diff are exact (the legacy
 *     `sgs_responsive_box_shorthand_rule` '0'-fill behaviour is deliberately
 *     NOT reused — these are new blocks with no dependency on it).
 *   - Breakpoints come from SGS_Breakpoints (R-31-1). When $opts['container'] is
 *     true each tier is ALSO emitted as an @container query alongside the @media
 *     fallback (FR-S9-6 container-queries-and-media-queries-together).
 *
 * uid stability (STOP-NO-KSORT): this engine NEVER reorders attribute keys and
 * is NEVER part of the wrapper's md5(uid) input. Key-order stability is a
 * WRITE-TIME guarantee (the editor builds objects in canonical key order); the
 * canonicalisation oracle below exists only for tests / an optional REST-save
 * filter, and is documented as not-in-the-hash-path.
 */

if ( ! function_exists( 'sgs_responsive_side_order' ) ) {
	/**
	 * Canonical side order for box properties (also the CSS shorthand order).
	 *
	 * @return array<int,string>
	 */
	function sgs_responsive_side_order() {
		return array( 'top', 'right', 'bottom', 'left' );
	}
}

if ( ! function_exists( 'sgs_responsive_normalise_object' ) ) {
	/**
	 * Coerce a stored attribute value into the `{desktop,tablet,mobile}` shape.
	 *
	 * Accepts the object model verbatim, and gracefully lifts legacy/plain values:
	 *   - a scalar (string/number)            → { desktop:<val>, tablet:null, mobile:null }
	 *   - a flat box array {top,right,…}      → { desktop:{…}, tablet:null, mobile:null }
	 *   - an already-tiered object            → returned as-is (missing tiers → null)
	 *
	 * Never reorders keys of an object it did not build (uid-safety); it only
	 * READS the tiers.
	 *
	 * @param mixed $raw    Stored attribute value.
	 * @param bool  $is_box Whether the property is a 4-side box property.
	 * @return array{desktop:mixed,tablet:mixed,mobile:mixed}
	 */
	function sgs_responsive_normalise_object( $raw, $is_box = false ) {
		$tiers = array( 'desktop', 'tablet', 'mobile' );

		// Already a tiered object?
		if ( is_array( $raw ) ) {
			$has_tier_key = false;
			foreach ( $tiers as $t ) {
				if ( array_key_exists( $t, $raw ) ) {
					$has_tier_key = true;
					break;
				}
			}
			if ( $has_tier_key ) {
				return array(
					'desktop' => $raw['desktop'] ?? null,
					'tablet'  => $raw['tablet'] ?? null,
					'mobile'  => $raw['mobile'] ?? null,
				);
			}
			// A flat box array (top/right/bottom/left) with no tiers → desktop box.
			if ( $is_box ) {
				return array(
					'desktop' => $raw,
					'tablet'  => null,
					'mobile'  => null,
				);
			}
		}

		// Plain scalar.
		return array(
			'desktop' => $raw,
			'tablet'  => null,
			'mobile'  => null,
		);
	}
}

if ( ! function_exists( 'sgs_responsive_atoms_from_spec' ) ) {
	/**
	 * Expand one property spec into a flat list of scalar "atoms".
	 *
	 * A scalar property yields one atom; a box property yields four (one per
	 * side, as a `-{side}` longhand). Each atom carries its own per-tier values
	 * so the emitter can run one uniform tier-diff loop over everything.
	 *
	 * Spec keys:
	 *   'value'        (mixed, required)  The stored attribute value (any shape).
	 *   'css'          (string, required) Base CSS property name (e.g. 'gap', 'padding').
	 *   'box'          (bool, optional)   Treat as a 4-side box property. Default false.
	 *   'unit_default' (string, optional) Unit appended to numeric values. Default ''.
	 *   'cast'         ('float'|'int', optional) Numeric cast. Default 'float'.
	 *   'transform'    (callable, optional) Returns the full CSS value for a raw
	 *                  input (unit handling skipped when set — e.g. sgs_colour_value).
	 *
	 * @param array $spec Property spec.
	 * @return array<int,array{css:string,desktop:mixed,tablet:mixed,mobile:mixed,unit:string,cast:string,transform:?callable}>
	 */
	function sgs_responsive_atoms_from_spec( array $spec ) {
		$css = $spec['css'] ?? '';
		if ( '' === $css || ! array_key_exists( 'value', $spec ) ) {
			return array();
		}

		$is_box    = ! empty( $spec['box'] );
		$unit      = $spec['unit_default'] ?? '';
		$cast      = $spec['cast'] ?? 'float';
		$transform = $spec['transform'] ?? null;
		$obj       = sgs_responsive_normalise_object( $spec['value'], $is_box );

		if ( ! $is_box ) {
			return array(
				array(
					'css'       => $css,
					'desktop'   => $obj['desktop'],
					'tablet'    => $obj['tablet'],
					'mobile'    => $obj['mobile'],
					'unit'      => sgs_responsive_sanitise_unit( $unit ),
					'cast'      => $cast,
					'transform' => $transform,
				),
			);
		}

		$atoms = array();
		foreach ( sgs_responsive_side_order() as $side ) {
			$get_side = function ( $tier_val ) use ( $side ) {
				if ( is_array( $tier_val ) && array_key_exists( $side, $tier_val ) ) {
					return $tier_val[ $side ];
				}
				return null;
			};
			$atoms[]  = array(
				'css'       => $css . '-' . $side,
				'desktop'   => $get_side( $obj['desktop'] ),
				'tablet'    => $get_side( $obj['tablet'] ),
				'mobile'    => $get_side( $obj['mobile'] ),
				'unit'      => sgs_responsive_sanitise_unit( $unit ),
				'cast'      => $cast,
				'transform' => $transform,
			);
		}
		return $atoms;
	}
}

if ( ! function_exists( 'sgs_responsive_format_atom_value' ) ) {
	/**
	 * Format one raw atom value into a CSS value string, or null if unusable.
	 *
	 * @param mixed         $raw       Raw value (may be null/''/number/string).
	 * @param string        $unit      Sanitised unit to append to numeric values.
	 * @param string        $cast      'float' | 'int'.
	 * @param callable|null $transform Optional value transform (skips unit handling).
	 * @return string|null CSS value, or null when the value is absent/invalid.
	 */
	function sgs_responsive_format_atom_value( $raw, $unit, $cast, $transform ) {
		if ( null === $raw || '' === $raw ) {
			return null;
		}
		if ( $transform ) {
			$out = call_user_func( $transform, $raw );
			return ( null === $out || '' === $out ) ? null : (string) $out;
		}
		// A bare number → append the unit (e.g. box side '10' + 'px' → '10px').
		if ( is_numeric( $raw ) ) {
			$num = 'int' === $cast ? (string) intval( $raw ) : (string) floatval( $raw );
			return $num . $unit;
		}
		// Otherwise a string that already carries its own unit / is a CSS length
		// expression ('16px', 'clamp(0.5rem,2vw,1.5rem)', 'calc(100% - 20px)') —
		// sanitise and pass through verbatim.
		$clean = sgs_responsive_sanitise_css_value( (string) $raw );
		return '' === $clean ? null : $clean;
	}
}

if ( ! function_exists( 'sgs_responsive_sanitise_css_value' ) ) {
	/**
	 * Sanitise a free-text CSS length/expression value for a scoped <style>.
	 *
	 * Permits the character set of typical length values and math functions
	 * (`clamp()`, `calc()`, `min()`, `max()`, `var()`): letters, digits, spaces,
	 * `. , % ( ) + - / *` and `#` (hex colours). Strips everything that could
	 * break out of the declaration (`; { } < > @ " ' \` and backslash), which
	 * neutralises CSS injection while leaving all legitimate values intact.
	 *
	 * @param string $value Raw value.
	 * @return string Sanitised value (may be '').
	 */
	function sgs_responsive_sanitise_css_value( $value ) {
		$value = (string) $value;
		// Drop any character outside the safe set.
		$value = preg_replace( '/[^A-Za-z0-9 .,%()+\-\/*#]/', '', $value );
		return trim( (string) $value );
	}
}

if ( ! function_exists( 'sgs_emit_responsive_css' ) ) {
	/**
	 * Emit scoped responsive CSS for object-model properties on one selector.
	 *
	 * For each property spec: expand to atoms, compute each atom's EFFECTIVE
	 * per-tier value (null-coalescing up the tiers, per-side for box props),
	 * format to a declaration, and emit a tier's declaration ONLY where it
	 * diverges from the tier below (tier-diff — no redundant rules). Tiers read
	 * their breakpoints from SGS_Breakpoints; $opts['container']=true also emits
	 * each tier as an @container query alongside the @media fallback.
	 *
	 * @param string $selector Fully-formed, already-safe CSS selector.
	 * @param array  $prop_map List of property specs (see sgs_responsive_atoms_from_spec).
	 * @param array  $opts     { container?: bool }.
	 * @return string CSS text (no <style> wrapper); '' when nothing is set.
	 */
	function sgs_emit_responsive_css( $selector, array $prop_map, array $opts = array() ) {
		$with_container = ! empty( $opts['container'] );

		$base_decls   = array();
		$tablet_decls = array();
		$mobile_decls = array();

		foreach ( $prop_map as $spec ) {
			foreach ( sgs_responsive_atoms_from_spec( $spec ) as $atom ) {
				$fmt = function ( $raw ) use ( $atom ) {
					return sgs_responsive_format_atom_value( $raw, $atom['unit'], $atom['cast'], $atom['transform'] );
				};

				// Effective per-tier value strings (null-coalesce up the cascade).
				$d       = $fmt( $atom['desktop'] );
				$t       = $fmt( null !== $atom['tablet'] && '' !== $atom['tablet'] ? $atom['tablet'] : $atom['desktop'] );
				$mob_raw = null;
				if ( null !== $atom['mobile'] && '' !== $atom['mobile'] ) {
					$mob_raw = $atom['mobile'];
				} elseif ( null !== $atom['tablet'] && '' !== $atom['tablet'] ) {
					$mob_raw = $atom['tablet'];
				} else {
					$mob_raw = $atom['desktop'];
				}
				$m = $fmt( $mob_raw );

				$prop = $atom['css'];
				if ( null !== $d ) {
					$base_decls[] = $prop . ':' . $d . ';';
				}
				// Tier-diff: tablet only when it differs from the (effective) desktop.
				$eff_desktop_for_tablet = ( null !== $d ) ? $d : null;
				if ( null !== $t && $t !== $eff_desktop_for_tablet ) {
					$tablet_decls[] = $prop . ':' . $t . ';';
				}
				// Mobile compares to the effective tablet declaration (t, already coalesced).
				$eff_tablet_for_mobile = ( null !== $t ) ? $t : $d;
				if ( null !== $m && $m !== $eff_tablet_for_mobile ) {
					$mobile_decls[] = $prop . ':' . $m . ';';
				}
			}
		}

		$css = '';
		if ( $base_decls ) {
			$css .= $selector . '{' . implode( '', $base_decls ) . '}';
		}
		if ( $tablet_decls ) {
			$inner = $selector . '{' . implode( '', $tablet_decls ) . '}';
			foreach ( SGS_Breakpoints::tier_at_rules( SGS_Breakpoints::TABLET_MAX, $with_container ) as $prefix ) {
				$css .= $prefix . $inner . '}';
			}
		}
		if ( $mobile_decls ) {
			$inner = $selector . '{' . implode( '', $mobile_decls ) . '}';
			foreach ( SGS_Breakpoints::tier_at_rules( SGS_Breakpoints::MOBILE_MAX, $with_container ) as $prefix ) {
				$css .= $prefix . $inner . '}';
			}
		}

		return $css;
	}
}

if ( ! function_exists( 'sgs_canonicalise_responsive_attrs' ) ) {
	/**
	 * Canonicalisation ORACLE for object-model responsive attributes.
	 *
	 * Deep-sorts the keys of any `{desktop,tablet,mobile}` / `{top,right,bottom,
	 * left}` object into canonical order, so two attribute sets that differ ONLY
	 * in key order produce byte-identical JSON (and therefore the same md5 uid).
	 *
	 * ⚠ NOT part of the wrapper's live uid path (STOP-NO-KSORT). Key-order
	 * stability is guaranteed at WRITE TIME by the editor. This function exists
	 * as the test oracle (proving canonical order is order-independent) and for
	 * an optional REST-save normalisation filter — never call it on the array
	 * passed to the wrapper's md5(uid).
	 *
	 * @param array $attrs Block attributes.
	 * @return array Attributes with responsive-object keys in canonical order.
	 */
	function sgs_canonicalise_responsive_attrs( array $attrs ) {
		$tier_order = array( 'desktop', 'tablet', 'mobile' );
		$side_order = sgs_responsive_side_order();

		$order_keys = function ( array $obj, array $order ) {
			$out = array();
			foreach ( $order as $k ) {
				if ( array_key_exists( $k, $obj ) ) {
					$out[ $k ] = $obj[ $k ];
				}
			}
			// Preserve any unexpected keys after the known ones (never drop data).
			foreach ( $obj as $k => $v ) {
				if ( ! array_key_exists( $k, $out ) ) {
					$out[ $k ] = $v;
				}
			}
			return $out;
		};

		$canon = function ( $value ) use ( &$canon, $order_keys, $tier_order, $side_order ) {
			if ( ! is_array( $value ) ) {
				return $value;
			}
			$is_tier = false;
			foreach ( $tier_order as $t ) {
				if ( array_key_exists( $t, $value ) ) {
					$is_tier = true;
					break;
				}
			}
			$is_side = false;
			foreach ( $side_order as $s ) {
				if ( array_key_exists( $s, $value ) ) {
					$is_side = true;
					break;
				}
			}
			if ( $is_tier ) {
				$value = $order_keys( $value, $tier_order );
			} elseif ( $is_side ) {
				$value = $order_keys( $value, $side_order );
			}
			foreach ( $value as $k => $v ) {
				$value[ $k ] = $canon( $v );
			}
			return $value;
		};

		$out = array();
		foreach ( $attrs as $k => $v ) {
			$out[ $k ] = $canon( $v );
		}
		return $out;
	}
}
