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
		$k_size      = sgs_typography_attr( $prefix, 'FontSize' );
		$k_size_unit = sgs_typography_attr( $prefix, 'FontSizeUnit' );
		$k_size_tab  = sgs_typography_attr( $prefix, 'FontSizeTablet' );
		$k_size_mob  = sgs_typography_attr( $prefix, 'FontSizeMobile' );
		$k_weight    = sgs_typography_attr( $prefix, 'FontWeight' );
		$k_style     = sgs_typography_attr( $prefix, 'FontStyle' );
		$k_lh        = sgs_typography_attr( $prefix, 'LineHeight' );
		$k_lh_unit   = sgs_typography_attr( $prefix, 'LineHeightUnit' );

		$unit = isset( $attributes[ $k_size_unit ] ) && '' !== $attributes[ $k_size_unit ]
			? preg_replace( '/[^a-z%]/i', '', (string) $attributes[ $k_size_unit ] )
			: 'px';

		// Desktop font-size: numeric (modern) first, legacy string second.
		$size_decl = '';
		if ( isset( $attributes[ $k_size ] ) && '' !== $attributes[ $k_size ] && is_numeric( $attributes[ $k_size ] ) ) {
			$size_decl = 'font-size:' . floatval( $attributes[ $k_size ] ) . $unit . ';';
		} elseif ( isset( $attributes[ $k_size ] ) && '' !== $attributes[ $k_size ] ) {
			// Legacy string shape (token slug or raw CSS) — honour it verbatim.
			$legacy = sgs_font_size_value( (string) $attributes[ $k_size ] );
			if ( '' !== $legacy ) {
				$size_decl = 'font-size:' . $legacy . ';';
			}
		}

		$base_decls = array();
		if ( '' !== $size_decl ) {
			$base_decls[] = $size_decl;
		}
		if ( ! empty( $attributes[ $k_weight ] ) ) {
			$base_decls[] = 'font-weight:' . preg_replace( '/[^a-z0-9]/i', '', (string) $attributes[ $k_weight ] ) . ';';
		}
		if ( ! empty( $attributes[ $k_style ] ) && in_array( $attributes[ $k_style ], array( 'normal', 'italic' ), true ) ) {
			$base_decls[] = 'font-style:' . $attributes[ $k_style ] . ';';
		}
		if ( isset( $attributes[ $k_lh ] ) && '' !== $attributes[ $k_lh ] && is_numeric( $attributes[ $k_lh ] ) ) {
			// Decode the "unitless" sentinel before the regex strip -- the regex keeps
			// all letters so "unitless" would pass through unchanged and produce
			// invalid CSS like `line-height:1.65unitless`. Mirror heading/render.php:222.
			$raw_lh_unit  = isset( $attributes[ $k_lh_unit ] ) ? (string) $attributes[ $k_lh_unit ] : '';
			$lh_unit      = ( 'unitless' === $raw_lh_unit ) ? '' : preg_replace( '/[^a-z%]/i', '', $raw_lh_unit );
			$base_decls[] = 'line-height:' . floatval( $attributes[ $k_lh ] ) . $lh_unit . ';';
		}

		$css = '';
		if ( ! empty( $base_decls ) ) {
			$css .= $selector . '{' . implode( '', $base_decls ) . '}';
		}

		// Responsive font-size overrides (numeric only).
		if ( isset( $attributes[ $k_size_tab ] ) && '' !== $attributes[ $k_size_tab ] && is_numeric( $attributes[ $k_size_tab ] ) ) {
			$css .= '@media (max-width:1023px){' . $selector . '{font-size:' . floatval( $attributes[ $k_size_tab ] ) . $unit . ';}}';
		}
		if ( isset( $attributes[ $k_size_mob ] ) && '' !== $attributes[ $k_size_mob ] && is_numeric( $attributes[ $k_size_mob ] ) ) {
			$css .= '@media (max-width:767px){' . $selector . '{font-size:' . floatval( $attributes[ $k_size_mob ] ) . $unit . ';}}';
		}

		return $css;
	}
}
