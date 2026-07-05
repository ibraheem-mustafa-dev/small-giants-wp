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
		$k_size       = sgs_typography_attr( $prefix, 'FontSize' );
		$k_size_unit  = sgs_typography_attr( $prefix, 'FontSizeUnit' );
		$k_weight     = sgs_typography_attr( $prefix, 'FontWeight' );
		$k_style      = sgs_typography_attr( $prefix, 'FontStyle' );
		$k_transform  = sgs_typography_attr( $prefix, 'TextTransform' );
		$k_decoration = sgs_typography_attr( $prefix, 'TextDecoration' );

		// Numeric responsive families (font-size / line-height / letter-spacing)
		// delegate to the general Pattern A emitter — base + tablet + mobile on
		// the SAME selector, only set values emitted.
		$size_unit_set = isset( $attributes[ $k_size_unit ] ) && '' !== $attributes[ $k_size_unit ];

		$css = sgs_responsive_css_rule(
			$attributes,
			array(
				array(
					'attr'         => $k_size,
					'css'          => 'font-size',
					'unit_attr'    => $size_unit_set ? $k_size_unit : '',
					'unit_default' => 'px',
					'tablet_attr'  => sgs_typography_attr( $prefix, 'FontSizeTablet' ),
					'mobile_attr'  => sgs_typography_attr( $prefix, 'FontSizeMobile' ),
				),
				array(
					'attr'              => sgs_typography_attr( $prefix, 'LineHeight' ),
					'css'               => 'line-height',
					'unit_attr'         => sgs_typography_attr( $prefix, 'LineHeightUnit' ),
					'unit_default'      => '',
					'unitless_sentinel' => 'unitless',
					'tablet_attr'       => sgs_typography_attr( $prefix, 'LineHeightTablet' ),
					'mobile_attr'       => sgs_typography_attr( $prefix, 'LineHeightMobile' ),
				),
				array(
					'attr'         => sgs_typography_attr( $prefix, 'LetterSpacing' ),
					'css'          => 'letter-spacing',
					'unit_attr'    => sgs_typography_attr( $prefix, 'LetterSpacingUnit' ),
					'unit_default' => 'em',
					'tablet_attr'  => sgs_typography_attr( $prefix, 'LetterSpacingTablet' ),
					'mobile_attr'  => sgs_typography_attr( $prefix, 'LetterSpacingMobile' ),
				),
			),
			$selector
		);

		// Base-only (non-responsive) typography props, appended as a second rule
		// on the same selector: legacy string font-size, weight, style, transform,
		// decoration. Blocks that lack these attrs simply don't emit them.
		$base_decls = array();

		// Legacy STRING font-size (pre-2026-06-11 token/raw-CSS shape) — honoured
		// verbatim when the modern numeric value is absent (numeric always wins;
		// sgs_responsive_css_rule skips non-numeric values so no double-emit).
		if ( isset( $attributes[ $k_size ] ) && '' !== $attributes[ $k_size ] && ! is_numeric( $attributes[ $k_size ] ) ) {
			$legacy = sgs_font_size_value( (string) $attributes[ $k_size ] );
			if ( '' !== $legacy ) {
				$base_decls[] = 'font-size:' . $legacy . ';';
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

		if ( ! empty( $base_decls ) ) {
			// Prepend so base-only props sit before the responsive rules — same
			// computed result either way (disjoint properties, same selector).
			$css = $selector . '{' . implode( '', $base_decls ) . '}' . $css;
		}

		return $css;
	}
}
