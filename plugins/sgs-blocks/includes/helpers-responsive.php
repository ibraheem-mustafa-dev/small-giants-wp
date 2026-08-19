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

// The Spec 37 FR-37-16 object-model emitter (sgs_emit_responsive_css) reads the shared
// breakpoint source. Require it here so any caller of this file resolves it.
require_once __DIR__ . '/class-sgs-breakpoints.php';

// sgs_responsive_sanitise_css_value() (below) delegates to sgs_css_length_value().
// Require it HERE, not just via render-helpers.php, because several render.php
// files (e.g. nav-drawer) require_once this file directly without ever loading
// render-helpers.php — without this line, sgs_responsive_sanitise_css_value()
// would fatal on "Call to undefined function sgs_css_length_value()" on any
// page rendering one of those blocks. Load order between the two files no
// longer matters (both guard with function_exists()), only that both load
// before either function is CALLED — this require makes that unconditional.
require_once __DIR__ . '/helpers-css-safety.php';

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
 *  Spec 37 FR-37-16 — object-model responsive-override engine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The functions above operate on the FLAT-tier attribute convention (separate
 * `gap` / `gapTablet` / `gapMobile` keys). The header/footer/nav blocks use
 * the OBJECT model instead: one attribute per property, shaped
 *   scalar:  { desktop:<val>, tablet:<val|null>, mobile:<val|null> }
 *   box:     { desktop:{top,right,bottom,left}, tablet:{…nullable sides}, mobile:{…} }
 * where `null` (or an absent key) means "inherit the tier above" and `desktop`
 * is always concrete.
 *
 * Design (Spec 37 FR-37-16):
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
 *     fallback (Spec 37 FR-37-16 container-queries-and-media-queries-together).
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

			// An ARRAY with no tier keys on a NON-box property is UNSET, not a value.
			//
			// ⛔ Without this branch it fell through to the "plain scalar" return
			// below and assigned the ARRAY ITSELF as the desktop value, which the
			// formatter then stringified — emitting a literal `max-width:Array`
			// declaration. Found LIVE on the canary 2026-08-10 (gallery, page 1591):
			// every block whose object-typed attr still holds its `default: {}`
			// reached this path, which is site-header-row and site-footer-row too
			// (object maxWidth since FR-37-16) — so the defect PRE-DATES the gallery
			// migration; the migration merely exposed it.
			//
			// An empty `{}` is exactly what an untouched object attr looks like, so
			// this is the COMMON case, not an edge case. Returning all-null lets the
			// tier-diff emit nothing at all, which is the correct rendering for
			// "the operator has not set this".
			return array(
				'desktop' => null,
				'tablet'  => null,
				'mobile'  => null,
			);
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
	 * Delegates to the shared hardened validator sgs_css_length_value()
	 * (helpers-css-safety.php) — the same primitive sgs_container_gap_value()
	 * already delegates to. This function is the ONLY sanitiser for every
	 * object-model responsive property (gap, gridTemplateColumns, contentWidth,
	 * maxWidth, padding, margin, nav-drawer panelSize) across sgs/site-header-row,
	 * sgs/site-footer-row, sgs/nav-menu, sgs/nav-drawer, sgs/mega-panel,
	 * sgs/mega-aside and SGS_Container_Wrapper.
	 *
	 * PREVIOUS implementation (superseded 2026-08-02) permitted `/` and `*` in
	 * its character allowlist without checking for the `/*` CSS-comment
	 * opener, and STRIPPED disallowed characters rather than rejecting the
	 * whole value — so a malformed/malicious value degraded to mangled-but-
	 * emitted CSS instead of being refused. sgs_css_length_value() closes both
	 * gaps: it checks the RAW input for breakout characters (including the
	 * literal `/*` substring) BEFORE consuming any function call, and it FAILS
	 * CLOSED — the whole value returns '' the moment anything looks unsafe,
	 * never a stripped-down remainder. It is the raw-input breakout check that
	 * provides the security here, not the var|calc|min|max|minmax|clamp|repeat
	 * function-name allowlist — see that function's own docblock (step 2a).
	 *
	 * Return contract is unchanged for every caller: '' means "no safe value —
	 * emit nothing for this property", exactly as before (verified against
	 * every call site: sgs_responsive_format_atom_value() treats '' as null/
	 * absent, helpers-row-behaviour.php's $halve treats '' as null, and
	 * nav-drawer/render.php's geometry builder only emits a declaration when
	 * the tier string is non-empty).
	 *
	 * @param string $value Raw value.
	 * @return string A safe CSS value fragment, or '' on rejection.
	 */
	function sgs_responsive_sanitise_css_value( $value ) {
		return sgs_css_length_value( (string) $value );
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

if ( ! function_exists( 'sgs_resolve_tier' ) ) {
	/**
	 * Canonical tier-resolver — generalised cascade for both tri-state enums and
	 * scalar/null-marker values. Implements the contract: desktop coerces inherit→default,
	 * tablet/mobile inherit upward (tablet→desktop, mobile→tablet).
	 *
	 * Supported value shapes:
	 *   - Tri-state enum: { desktop: 'on'|'off', tablet: 'inherit'|'on'|'off', mobile: 'inherit'|'on'|'off' }
	 *   - Scalar/null:    { desktop: <value>, tablet: <value|null>, mobile: <value|null> }
	 *   - Non-object:     coerces to $default (D328 defence)
	 *
	 * @param mixed  $value   Responsive object with 'desktop', 'tablet', 'mobile' keys (or non-array).
	 * @param string $tier    'desktop' | 'tablet' | 'mobile'.
	 * @param mixed  $default Value to use when desktop inherits or is missing.
	 * @return array{ value: mixed, inherited: bool } Effective value + inheritance flag.
	 */
	function sgs_resolve_tier( $value, $tier = 'desktop', $default = null ) {
		// Defend against non-array/junk input (D328).
		if ( ! is_array( $value ) ) {
			return array(
				'value'     => $default,
				'inherited' => true,
			);
		}

		// Determine if a value marks inheritance: 'inherit', null, or missing key.
		$is_inherit = function ( $v ) {
			return 'inherit' === $v || null === $v;
		};

		if ( 'desktop' === $tier ) {
			// Desktop: coerce inherit to $default deterministically (§6b guard).
			$own = $value['desktop'] ?? null;
			if ( $is_inherit( $own ) ) {
				return array(
					'value'     => $default,
					'inherited' => true,
				);
			}
			return array(
				'value'     => $own,
				'inherited' => false,
			);
		}

		if ( 'tablet' === $tier ) {
			// Tablet: own value, or inherit from desktop.
			$own = $value['tablet'] ?? null;
			if ( $is_inherit( $own ) ) {
				$desktop_result = sgs_resolve_tier( $value, 'desktop', $default );
				return array(
					'value'     => $desktop_result['value'],
					'inherited' => true,
				);
			}
			return array(
				'value'     => $own,
				'inherited' => false,
			);
		}

		if ( 'mobile' === $tier ) {
			// Mobile: own value, or inherit from tablet.
			$own = $value['mobile'] ?? null;
			if ( $is_inherit( $own ) ) {
				$tablet_result = sgs_resolve_tier( $value, 'tablet', $default );
				return array(
					'value'     => $tablet_result['value'],
					'inherited' => true,
				);
			}
			return array(
				'value'     => $own,
				'inherited' => false,
			);
		}

		// Unknown tier, fallback to $default with inherited.
		return array(
			'value'     => $default,
			'inherited' => true,
		);
	}
}

if ( ! function_exists( 'sgs_emit_tier_rules' ) ) {
	/**
	 * Emit scoped per-tier CSS rules (base + tablet + mobile) for a tri-state
	 * ('inherit'|'on'|'off') responsive behaviour attribute, resolved via
	 * sgs_resolve_tier(). A tier's rule is emitted ONLY when its resolved
	 * state differs from the tier immediately above it (minimal output) —
	 * an all-inherit value emits a single base rule and nothing else, and a
	 * tier whose resolved CSS text is empty emits no rule at all (even if the
	 * state differs from the tier above).
	 *
	 * Rules are scoped to the caller-supplied selector ($uid_selector) — e.g.
	 * '#sgs-abc123' or '.sgs-header--abc123' — NEVER a body class (Spec 35
	 * design gate §4, 2026-07-28). Breakpoints come from SGS_Breakpoints
	 * (768/1024 device-tier standard, emitted as max-width 1023px/767px) —
	 * never hardcoded here.
	 *
	 * ⚠ D386: this helper emits whatever CSS text the caller passes in
	 * $css_on/$css_off verbatim. Callers MUST NOT pass declarations
	 * containing absolute/per-instance sizes destined for a SHARED,
	 * state-only stylesheet — a value that varies per block instance must be
	 * scoped to that instance's own selector (this helper's whole purpose),
	 * never baked into shared CSS text reused across instances.
	 *
	 * @param string $uid_selector Fully-formed, already-safe CSS selector (caller-owned uid scope).
	 * @param mixed  $value        Tri-state responsive object `{desktop,tablet,mobile}` (or non-object/junk — D328 defence via sgs_resolve_tier()).
	 * @param string $css_on       CSS declarations (no selector/braces) to emit when the resolved state is 'on'.
	 * @param string $css_off      CSS declarations to emit when the resolved state is 'off'. Default '' (nothing emitted for 'off').
	 * @param string $default      State used when desktop inherits/is missing (§6b guard). Default 'off' (DEFAULT_OFF).
	 * @return string CSS text (no <style> wrapper); '' when nothing resolves to non-empty declarations.
	 */
	function sgs_emit_tier_rules( $uid_selector, $value, $css_on, $css_off = '', $default = 'off' ) {
		// Delegates to the general N-value form. The binary case IS the 1-entry
		// map ('on' => $css_on) plus a fallback ($css_off) for every other
		// resolved state — exactly reproducing the previous ternary, including
		// the case where $css_on is itself '' (a present-but-empty map entry is
		// returned as '', never coalesced to the fallback, because `??` tests
		// null and not emptiness).
		return sgs_emit_tier_rules_map(
			$uid_selector,
			$value,
			array( 'on' => $css_on ),
			$css_off,
			$default
		);
	}
}

if ( ! function_exists( 'sgs_emit_tier_rules_map' ) ) {
	/**
	 * The general N-value form of {@see sgs_emit_tier_rules()}: emit scoped
	 * per-tier CSS for a responsive attribute whose resolved value is one of
	 * MANY states, not just 'on'/'off'.
	 *
	 * Tier resolution, the differs-from-the-tier-above minimisation, the
	 * empty-CSS skip, the selector scoping and the breakpoints are all
	 * identical to the binary form — this differs ONLY in how a resolved state
	 * is mapped to CSS text. `sgs_emit_tier_rules()` is the 1-entry case and
	 * delegates here, so there is one implementation of the cascade, not two.
	 *
	 * Added 2026-08-19 for `sgs/site-header`'s `contrastSafe`, which is a
	 * FOUR-value enum ('none'|'scrim'|'shadow'|'force-solid') going per-device.
	 * The binary helper could not express it: its `'on' === $state` test means
	 * 'scrim' and 'none' would both fall to $css_off and paint identically.
	 * Note that sgs_resolve_tier() itself needed no change — it is already
	 * value-agnostic, treating only 'inherit'/null specially.
	 *
	 * ⚠ D386 applies here unchanged: CSS text is emitted verbatim, so a caller
	 * must never pass per-instance absolute values destined for shared CSS.
	 *
	 * @param string $uid_selector  Fully-formed, already-safe CSS selector (caller-owned uid scope).
	 * @param mixed  $value         Responsive object `{desktop,tablet,mobile}` (or junk — D328 defence via sgs_resolve_tier()).
	 * @param array  $css_by_value  Map of resolved state => CSS declarations (no selector/braces).
	 * @param string $css_fallback  CSS emitted for any resolved state absent from the map. Default '' (emit nothing).
	 * @param string $default       State used when desktop inherits/is missing (§6b guard). Default 'off'.
	 * @return string CSS text (no <style> wrapper); '' when nothing resolves to non-empty declarations.
	 */
	function sgs_emit_tier_rules_map( $uid_selector, $value, array $css_by_value, $css_fallback = '', $default = 'off' ) {
		$css_for_state = function ( $state ) use ( $css_by_value, $css_fallback ) {
			// A non-scalar resolved value can never be an array key; treat it as
			// unmapped rather than letting PHP raise on the lookup.
			if ( ! is_string( $state ) && ! is_int( $state ) ) {
				return $css_fallback;
			}
			return $css_by_value[ $state ] ?? $css_fallback;
		};

		$desktop = sgs_resolve_tier( $value, 'desktop', $default );
		$tablet  = sgs_resolve_tier( $value, 'tablet', $default );
		$mobile  = sgs_resolve_tier( $value, 'mobile', $default );

		$css = '';

		$desktop_css = $css_for_state( $desktop['value'] );
		if ( '' !== $desktop_css ) {
			$css .= $uid_selector . '{' . $desktop_css . '}';
		}

		if ( $tablet['value'] !== $desktop['value'] ) {
			$tablet_css = $css_for_state( $tablet['value'] );
			if ( '' !== $tablet_css ) {
				$css .= '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){' . $uid_selector . '{' . $tablet_css . '}}';
			}
		}

		if ( $mobile['value'] !== $tablet['value'] ) {
			$mobile_css = $css_for_state( $mobile['value'] );
			if ( '' !== $mobile_css ) {
				$css .= '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){' . $uid_selector . '{' . $mobile_css . '}}';
			}
		}

		return $css;
	}
}

if ( ! function_exists( 'sgs_resolve_on_tiers' ) ) {
	/**
	 * Resolve a `{desktop,tablet,mobile}` responsive object into the list of
	 * tiers where the effective value equals $on_marker, via the canonical
	 * sgs_resolve_tier() cascade (Spec 35 T1.1/T1.4 — one cascade, no forks).
	 *
	 * Generalises the retired `sgs_resolve_tier_booleans()` (removed Spec 35
	 * T1.4, 2026-07-28): that function's boolean-absence-as-inherit semantics
	 * are IDENTICAL to sgs_resolve_tier()'s null/absent-key-as-inherit rule —
	 * an explicit `false` at a tier still means "off here", not "unset",
	 * because sgs_resolve_tier() only treats `'inherit'`/`null`/missing as
	 * inherit, never a concrete `false`. Verified equivalent for the row
	 * blocks' boolean-object shape (`$on_marker = true, $default = false`);
	 * the SAME call also serves the tri-state string-enum shape used by
	 * header-level behaviours (`$on_marker = 'on', $default = 'off'`).
	 *
	 * @param mixed $raw The stored `{desktop,tablet,mobile}` attribute value.
	 * @param mixed $on_marker The per-tier value that counts as "on" (true for row booleans, 'on' for tri-state enums).
	 * @param mixed $default Value used when desktop inherits/is missing (§6b guard) — false for booleans, 'off' for tri-state.
	 * @return string[] Tier keys (subset of desktop/tablet/mobile) where the resolved value === $on_marker, in tier order.
	 */
	function sgs_resolve_on_tiers( $raw, $on_marker, $default ) {
		$on = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$resolved = sgs_resolve_tier( $raw, $tier, $default );
			if ( $resolved['value'] === $on_marker ) {
				$on[] = $tier;
			}
		}
		return $on;
	}
}

if ( ! function_exists( 'sgs_merge_tri_state_declarations' ) ) {
	/**
	 * Merge several tri-state ('on'/'off'/'inherit') behaviours that may write
	 * to the SAME selector into ONE set of declarations per tier, with a
	 * single writer per CSS property (Spec 35 T1.4 FR-37-14 QC-fix, D400+).
	 *
	 * Replaces the earlier per-behaviour independent-emission pattern, where
	 * each behaviour called `sgs_emit_tier_rules()` on its own and relied on
	 * `!important` + CSS source order to "win" — provably broken: an unrelated
	 * behaviour resolved OFF at every tier still emitted an unconditional
	 * `!important` cancel-declaration on the shared selector, and because it
	 * was written LATER in the concatenated stylesheet it silently clobbered
	 * an earlier, genuinely-enabled behaviour's declaration for any property
	 * both happened to touch (proven live: Transparent={} killed Sticky's
	 * `position` at every viewport, because Transparent's off-css for
	 * `position`/`top`/`z-index` was emitted after Sticky's on-css).
	 *
	 * This resolves each behaviour's on/off state PER TIER first, then builds
	 * ONE property=>value map per tier from only the behaviours that are
	 * genuinely ON there. A behaviour never contributes a declaration when
	 * it's off — so an off/never-configured behaviour is now inert instead of
	 * an active canceller. When two behaviours are BOTH on for the same tier
	 * and both declare the same property, `$behaviours` ARRAY ORDER is the
	 * documented precedence (first listed wins that property; a later
	 * behaviour may still contribute its OWN non-colliding properties).
	 * Narrower tiers still correctly cancel a wider tier's declaration — but
	 * only for a property that was genuinely active at the wider tier and is
	 * no longer active at the narrower one (an explicit `revert`), so the
	 * "narrower tier cancels wider tier" capability is preserved without
	 * resorting to blind unconditional off-css.
	 *
	 * @param string $selector   Base selector (unqualified — used for every tier).
	 * @param array  $behaviours List of `[ 'raw' => mixed, 'props' => [ prop => value ] ]`,
	 *                           in PRECEDENCE order (first wins a shared property).
	 * @param string $default   Value `sgs_resolve_tier()` uses when a tier inherits
	 *                           with nothing wider set (e.g. 'off').
	 * @param string $on_marker Per-tier value that counts as "on" (default 'on').
	 * @return string Concatenated CSS (base rule + tablet/mobile @media rules,
	 *                whichever actually differ from the wider tier).
	 */
	function sgs_merge_tri_state_declarations( $selector, $behaviours, $default = 'off', $on_marker = 'on' ) {
		$tiers      = array( 'desktop', 'tablet', 'mobile' );
		$bp_by_tier = array(
			'desktop' => null,
			'tablet'  => SGS_Breakpoints::TABLET_MAX,
			'mobile'  => SGS_Breakpoints::MOBILE_MAX,
		);

		$active_props_by_tier = array();
		foreach ( $tiers as $tier ) {
			$props = array();
			foreach ( $behaviours as $spec ) {
				$resolved = sgs_resolve_tier( $spec['raw'], $tier, $default );
				if ( $on_marker !== $resolved['value'] ) {
					continue;
				}
				foreach ( $spec['props'] as $prop => $value ) {
					// First-listed behaviour with this tier's ON state wins the
					// property; a later behaviour may still add its own keys.
					if ( ! array_key_exists( $prop, $props ) ) {
						$props[ $prop ] = $value;
					}
				}
			}
			$active_props_by_tier[ $tier ] = $props;
		}

		$css        = '';
		$prev_props = array();
		foreach ( $tiers as $i => $tier ) {
			$props = $active_props_by_tier[ $tier ];

			// Skip a tier whose resolved active-property set is identical to
			// the wider tier's — nothing changed, mirrors sgs_emit_tier_rules()'s
			// own diff-check (avoids redundant/empty @media blocks).
			if ( 0 !== $i && $props === $prev_props ) {
				continue;
			}

			$decls = '';
			foreach ( $props as $prop => $value ) {
				$decls .= $prop . ':' . $value . ' !important;';
			}
			// Cancel any property that was active at a WIDER tier but is no
			// longer active here — the genuine narrow-cancels-wide capability.
			foreach ( $prev_props as $prop => $value ) {
				if ( ! array_key_exists( $prop, $props ) ) {
					$decls .= $prop . ':revert !important;';
				}
			}

			if ( '' !== $decls ) {
				$max_width = $bp_by_tier[ $tier ];
				if ( null === $max_width ) {
					$css .= $selector . '{' . $decls . '}';
				} else {
					$css .= '@media (max-width:' . $max_width . 'px){' . $selector . '{' . $decls . '}}';
				}
			}

			$prev_props = $props;
		}

		return $css;
	}
}
