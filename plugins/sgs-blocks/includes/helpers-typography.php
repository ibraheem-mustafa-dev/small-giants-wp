<?php
/**
 * Shared typography CSS emitter — the server-side companion to the
 * TypographyControls editor component (src/components/TypographyControls.js).
 *
 * One helper, one shape, every block (Bean R-22-13, 2026-06-11). Reads the
 * canonical number+unit+responsive attribute set for a given prefix and returns
 * a scoped CSS rule string (base + tablet + mobile media queries) covering
 * font-size / font-weight / font-style / line-height. Only set properties are
 * emitted, so an unset value falls through to the element's CSS default.
 *
 * Attribute shape (prefix '' shown; prefix 'label' → labelFontSize etc.):
 *   fontSize        number   (e.g. 18)        — desktop
 *   fontSizeUnit    string   (px|em|rem)
 *   fontSizeTablet  number
 *   fontSizeMobile  number
 *   fontFamily      string   (e.g. 'Montserrat, sans-serif') — no responsive
 *                            tiers; matches TypographyControls' showFontFamily
 *                            picker, which stores the theme.json preset's raw
 *                            CSS font-family VALUE (not a slug — see G4).
 *   fontWeight      string   (100–900 | '')
 *   fontStyle       string   (normal|italic | '')
 *   lineHeight      number   (e.g. 1.5)
 *   lineHeightUnit  string   (em|rem|px | '')  — unitless when empty
 *
 * BACK-COMPAT: if the modern numeric `{prefix}FontSize` is unset/empty but a
 * legacy STRING `{prefix}FontSize` value is present (the pre-2026-06-11 token/
 * raw-CSS shape), it is honoured verbatim via sgs_font_size_value() so existing
 * content does not lose its size. New numeric values always win.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-responsive.php';

if ( ! function_exists( 'sgs_typography_attr' ) ) {
	/**
	 * Build a prefixed attribute key. '' + 'FontSize' → 'fontSize';
	 * 'label' + 'FontSize' → 'labelFontSize'.
	 *
	 * @param string $prefix Attribute prefix.
	 * @param string $base   PascalCase base.
	 * @return string Attribute key.
	 */
	function sgs_typography_attr( $prefix, $base ) {
		return '' !== $prefix ? $prefix . $base : lcfirst( $base );
	}
}

if ( ! function_exists( 'sgs_font_family_sanitise' ) ) {
	/**
	 * Sanitise a font-family value for safe CSS interpolation.
	 *
	 * The stored value is the theme.json `typography.fontFamilies` preset's
	 * raw CSS font-family STRING (e.g. `"Montserrat, sans-serif"` or
	 * `'"Times New Roman", serif'`) — TypographyControls' showFontFamily
	 * picker writes `f.fontFamily` verbatim (src/components/TypographyControls.js),
	 * not a slug, so there is no preset-slug resolution step here. It is still
	 * attacker-reachable through the editor (an operator could hand-author an
	 * undeclared value, or a future control could accept free text), so it is
	 * allowlist-sanitised rather than trusted. `sgs_css_keyword_sanitise()`
	 * (helpers-box.php) is too narrow — a font-family LIST needs commas,
	 * spaces and quotes for multi-word names ("Open Sans", sans-serif) which
	 * that helper strips. This allowlist matches the one already proven live
	 * in quote/render.php's `$ff_safe` and product-card/render.php's
	 * `$sgs_title_ff_safe` workarounds, now consolidated to one definition.
	 *
	 * @param mixed $value Raw font-family value.
	 * @return string Sanitised font-family (may be '').
	 */
	function sgs_font_family_sanitise( $value ): string {
		return preg_replace( '/[^a-zA-Z0-9 ,"\'\-]/', '', (string) $value );
	}
}

if ( ! function_exists( 'sgs_typography_css_rule' ) ) {
	/**
	 * Build a scoped typography CSS rule string (base + responsive) for one
	 * element. The caller wraps the return value in a single <style> tag.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Attribute prefix ('' | 'label' | 'title' | …).
	 * @param string $selector   Fully-formed, already-safe CSS selector
	 *                           (e.g. ".sgs-trust-bar__label" scoped by a uid).
	 * @return string CSS text (no <style> wrapper); '' when nothing is set.
	 */
	function sgs_typography_css_rule( array $attributes, $prefix, $selector ) {
		$k_size        = sgs_typography_attr( $prefix, 'FontSize' );
		$k_size_unit   = sgs_typography_attr( $prefix, 'FontSizeUnit' );
		$k_family      = sgs_typography_attr( $prefix, 'FontFamily' );
		$k_weight      = sgs_typography_attr( $prefix, 'FontWeight' );
		$k_style       = sgs_typography_attr( $prefix, 'FontStyle' );
		$k_transform   = sgs_typography_attr( $prefix, 'TextTransform' );
		$k_decoration  = sgs_typography_attr( $prefix, 'TextDecoration' );
		$k_line        = sgs_typography_attr( $prefix, 'LineHeight' );
		$k_line_unit   = sgs_typography_attr( $prefix, 'LineHeightUnit' );
		$k_letter      = sgs_typography_attr( $prefix, 'LetterSpacing' );
		$k_letter_unit = sgs_typography_attr( $prefix, 'LetterSpacingUnit' );
		$k_align       = sgs_typography_attr( $prefix, 'TextAlign' );

		// Numeric responsive families (font-size / line-height / letter-spacing) may
		// each be stored EITHER as the modern {desktop,tablet,mobile} OBJECT (Spec 35
		// tier-object migration) or the LEGACY flat {prop}/{prop}Tablet/{prop}Mobile
		// trio — depending on how far that individual property has migrated on this
		// block (migration runs property-by-property, not block-by-block, so e.g.
		// sgs/label has an object fontSize but a still-flat lineHeight/letterSpacing).
		// Route each property independently to the matching emitter; never assume the
		// whole prefix migrated together.
		$size_unit_set = isset( $attributes[ $k_size_unit ] ) && '' !== $attributes[ $k_size_unit ];
		$size_unit     = $size_unit_set ? sgs_responsive_sanitise_unit( $attributes[ $k_size_unit ] ) : 'px';

		$line_unit_raw = isset( $attributes[ $k_line_unit ] ) ? (string) $attributes[ $k_line_unit ] : '';
		$line_unit     = ( '' === $line_unit_raw || 'unitless' === $line_unit_raw )
			? ''
			: sgs_responsive_sanitise_unit( $line_unit_raw );

		$letter_unit_set = isset( $attributes[ $k_letter_unit ] ) && '' !== $attributes[ $k_letter_unit ];
		$letter_unit     = $letter_unit_set ? sgs_responsive_sanitise_unit( $attributes[ $k_letter_unit ] ) : 'em';

		$size_is_tiered   = isset( $attributes[ $k_size ] ) && is_array( $attributes[ $k_size ] );
		$line_is_tiered   = isset( $attributes[ $k_line ] ) && is_array( $attributes[ $k_line ] );
		$letter_is_tiered = isset( $attributes[ $k_letter ] ) && is_array( $attributes[ $k_letter ] );

		$tiered_specs = array();
		$flat_specs   = array();

		if ( $size_is_tiered ) {
			// A tier holding a non-numeric STRING is a theme font-size PRESET
			// SLUG (TypographyControls' fontSizePresets picker writes one into
			// the tiered object's desktop key when a client picks "Preset
			// size" instead of a raw number) — resolve it via
			// sgs_font_size_value() to the real preset custom property,
			// exactly like the pre-migration hand-rolled logic on
			// sgs/heading and sgs/text did. Without this branch a preset
			// slug falls through to the generic length sanitiser and is
			// emitted VERBATIM as a bare CSS keyword (e.g. `font-size:small`,
			// the ~13px UA default) instead of the theme's actual token —
			// found independently while migrating heading/text (2026-09-06).
			// A numeric tier is unaffected: floatval()+unit reproduces
			// sgs_responsive_format_atom_value()'s own numeric branch
			// exactly, so this transform is a pure superset, never a
			// behavioural change for the already-working numeric case.
			$tiered_specs[] = array(
				'value'        => $attributes[ $k_size ],
				'css'          => 'font-size',
				'unit_default' => $size_unit,
				'transform'    => function ( $raw ) use ( $size_unit ) {
					if ( is_numeric( $raw ) ) {
						return (string) floatval( $raw ) . $size_unit;
					}
					return sgs_font_size_value( (string) $raw );
				},
			);
		} else {
			$flat_specs[] = array(
				'attr'         => $k_size,
				'css'          => 'font-size',
				'unit_attr'    => $size_unit_set ? $k_size_unit : '',
				'unit_default' => 'px',
				'tablet_attr'  => sgs_typography_attr( $prefix, 'FontSizeTablet' ),
				'mobile_attr'  => sgs_typography_attr( $prefix, 'FontSizeMobile' ),
			);
		}

		if ( $line_is_tiered ) {
			$tiered_specs[] = array(
				'value'        => $attributes[ $k_line ],
				'css'          => 'line-height',
				'unit_default' => $line_unit,
			);
		} else {
			$flat_specs[] = array(
				'attr'              => $k_line,
				'css'               => 'line-height',
				'unit_attr'         => $k_line_unit,
				'unit_default'      => '',
				'unitless_sentinel' => 'unitless',
				'tablet_attr'       => sgs_typography_attr( $prefix, 'LineHeightTablet' ),
				'mobile_attr'       => sgs_typography_attr( $prefix, 'LineHeightMobile' ),
			);
		}

		if ( $letter_is_tiered ) {
			$tiered_specs[] = array(
				'value'        => $attributes[ $k_letter ],
				'css'          => 'letter-spacing',
				'unit_default' => $letter_unit,
			);
		} else {
			$flat_specs[] = array(
				'attr'         => $k_letter,
				'css'          => 'letter-spacing',
				'unit_attr'    => $k_letter_unit,
				'unit_default' => 'em',
				'tablet_attr'  => sgs_typography_attr( $prefix, 'LetterSpacingTablet' ),
				'mobile_attr'  => sgs_typography_attr( $prefix, 'LetterSpacingMobile' ),
			);
		}

		$css = '';
		if ( ! empty( $tiered_specs ) ) {
			$css .= sgs_emit_responsive_css( $selector, $tiered_specs );
		}
		if ( ! empty( $flat_specs ) ) {
			$css .= sgs_responsive_css_rule( $attributes, $flat_specs, $selector );
		}

		// Base-only (non-responsive) typography props, appended as a second rule
		// on the same selector: legacy string font-size, weight, style, transform,
		// decoration. Blocks that lack these attrs simply don't emit them.
		$base_decls = array();

		// Legacy STRING font-size (pre-2026-06-11 token/raw-CSS shape) — honoured
		// verbatim when the modern numeric value is absent (numeric always wins;
		// sgs_responsive_css_rule skips non-numeric values so no double-emit).
		// ⛔ `! $size_is_tiered` is load-bearing, not defensive. Once FontSize
		// migrated to the tier-object shape the value is an ARRAY, and an array
		// satisfies both `'' !== $v` and `! is_numeric( $v )` — so it fell into
		// this legacy-STRING branch and `(string) $v` PHP-coerced it to the
		// literal "Array". That became slug `array` and emitted
		// `font-size:var(--wp--preset--font-size--array)`: an UNDEFINED custom
		// property, which makes the declaration invalid at computed-value time
		// and silently drops the element to its inherited size.
		// Measured on the canary (D574): every instance carrying an object
		// FontSize emitted it. Where an explicit per-tier value exists the
		// later tier rule overrides it, which is exactly why it looked fine —
		// but an UNSET tier (the common case on real content) emitted the
		// broken rule ALONE. Same bug class as D569/D570's unguarded
		// `trim( (string) $attr )`.
		if ( isset( $attributes[ $k_size ] ) && ! $size_is_tiered
			&& '' !== $attributes[ $k_size ] && ! is_numeric( $attributes[ $k_size ] ) ) {
			$legacy = sgs_font_size_value( (string) $attributes[ $k_size ] );
			if ( '' !== $legacy ) {
				$base_decls[] = 'font-size:' . $legacy . ';';
			}
		}
		// Font-family — plain string, no responsive tiers (matches
		// TypographyControls' showFontFamily picker, which offers no per-device
		// switcher). Only-set-properties-emitted, same discipline as weight/
		// style/transform/decoration below. Sanitised via the shared allowlist
		// rather than the narrower sgs_css_keyword_sanitise() (helpers-box.php),
		// which strips the commas/spaces/quotes a font-family LIST needs.
		if ( ! empty( $attributes[ $k_family ] ) ) {
			$family_safe = sgs_font_family_sanitise( $attributes[ $k_family ] );
			if ( '' !== $family_safe ) {
				$base_decls[] = 'font-family:' . $family_safe . ';';
			}
		}
		if ( ! empty( $attributes[ $k_weight ] ) ) {
			$base_decls[] = 'font-weight:' . preg_replace( '/[^a-z0-9]/i', '', (string) $attributes[ $k_weight ] ) . ';';
		}
		if ( ! empty( $attributes[ $k_style ] ) && in_array( $attributes[ $k_style ], array( 'normal', 'italic' ), true ) ) {
			$base_decls[] = 'font-style:' . $attributes[ $k_style ] . ';';
		}
		$allowed_transforms = array( 'none', 'uppercase', 'lowercase', 'capitalize' );
		if ( ! empty( $attributes[ $k_transform ] ) && in_array( $attributes[ $k_transform ], $allowed_transforms, true ) ) {
			$base_decls[] = 'text-transform:' . $attributes[ $k_transform ] . ';';
		}
		$allowed_decorations = array( 'none', 'underline', 'line-through', 'overline' );
		if ( ! empty( $attributes[ $k_decoration ] ) && in_array( $attributes[ $k_decoration ], $allowed_decorations, true ) ) {
			$base_decls[] = 'text-decoration:' . $attributes[ $k_decoration ] . ';';
		}
		// text-align — flat scalar (no responsive tier), same discipline as
		// font-weight/font-style/text-transform/text-decoration above.
		// Allowlist-validated (brand-strip/render.php:370, heading/render.php
		// precedent) — never interpolated raw.
		// 'start'/'end' added 2026-09-06 -- the RTL-aware logical values, found
		// missing while migrating sgs/label (its own block.json enum already
		// permitted them; this allowlist was the narrower of the two, not the
		// other way round -- widened here rather than narrowing the schema).
		$allowed_aligns = array( 'left', 'center', 'right', 'justify', 'start', 'end' );
		if ( ! empty( $attributes[ $k_align ] ) && in_array( $attributes[ $k_align ], $allowed_aligns, true ) ) {
			$base_decls[] = 'text-align:' . $attributes[ $k_align ] . ';';
		}

		if ( ! empty( $base_decls ) ) {
			// Prepend so base-only props sit before the responsive rules — same
			// computed result either way (disjoint properties, same selector).
			$css = $selector . '{' . implode( '', $base_decls ) . '}' . $css;
		}

		return $css;
	}
}
