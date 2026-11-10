<?php
/**
 * Tier media: inline SVG. The tier branch of `sgs_tier_media_render()` and the id-prefixing the media renderer
 * applies to each per-device SVG sibling.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! function_exists( 'sgs_tier_media_svg_html' ) ) {
	/**
	 * One tier's inline SVG, sanitised and wrapped in a decorative span.
	 *
	 * @param array  $spec       The tier spec ( `svg`: markup ).
	 * @param string $class_attr Space-separated classes.
	 * @return string The wrapped markup.
	 */
	function sgs_tier_media_svg_html( array $spec, string $class_attr ): string {
		return sprintf(
			'<span class="%s" aria-hidden="true">%s</span>',
			esc_attr( $class_attr ),
			wp_kses( (string) ( $spec['svg'] ?? '' ), sgs_allowed_svg_tags() )
		);
	}
}

if ( ! function_exists( 'sgs_media_svg_prefix_ids' ) ) {
	/**
	 * Prefix every element id in SVG markup, and every reference to it, so two inline SVG siblings never share an id.
	 *
	 * @param string $svg    Sanitised SVG markup.
	 * @param string $prefix Prefix to put before each id.
	 * @return string Markup with prefixed ids and references.
	 */
	function sgs_media_svg_prefix_ids( string $svg, string $prefix ): string {
		if ( '' === $prefix || ! preg_match_all( '/\sid=(["\'])([^"\']+)\1/', $svg, $found ) ) {
			return $svg;
		}
		$ids = array_unique( $found[2] );
		// Longest first, so one id that starts another is not clipped.
		usort(
			$ids,
			static function ( string $a, string $b ): int {
				return strlen( $b ) <=> strlen( $a );
			}
		);
		foreach ( $ids as $id ) {
			$quoted = preg_quote( $id, '/' );
			$svg    = preg_replace( '/(\sid=["\'])' . $quoted . '(["\'])/', '${1}' . $prefix . $id . '${2}', $svg );
			$svg    = preg_replace( '/url\(\s*(["\']?)#' . $quoted . '\1\s*\)/', 'url(${1}#' . $prefix . $id . '${1})', $svg );
			$svg    = preg_replace( '/((?:xlink:)?href=["\'])#' . $quoted . '(["\'])/', '${1}#' . $prefix . $id . '${2}', $svg );
			$svg    = preg_replace( '/(aria-labelledby=["\'])' . $quoted . '(["\'])/', '${1}' . $prefix . $id . '${2}', $svg );
		}
		return $svg;
	}
}

if ( ! function_exists( 'sgs_media_svg_element' ) ) {
	/**
	 * An inline SVG slot sibling: sanitised, ids prefixed, root given its classes and accessible name.
	 *
	 * @param string $markup     Raw SVG markup.
	 * @param string $classes    Classes for the root element.
	 * @param string $id_prefix  Prefix for element ids.
	 * @param string $label      Accessible name; empty with `$decorative` false prints no name.
	 * @param bool   $decorative True to hide the SVG from assistive technology.
	 * @param string $fit        `cover`, `contain` or '' for the viewBox default.
	 * @return string The `<svg>` markup, or '' when nothing survives sanitising.
	 */
	function sgs_media_svg_element( string $markup, string $classes, string $id_prefix, string $label, bool $decorative, string $fit ): string {
		$svg = trim( wp_kses( $markup, sgs_svg_kses_allowed_tags() ) );
		if ( '' === $svg || ! preg_match( '/^<svg\b[^>]*>/i', $svg, $root ) ) {
			return '';
		}
		$svg      = sgs_media_svg_prefix_ids( $svg, $id_prefix );
		$tag      = $root[0];
		$new      = preg_replace( '/\s(?:role|aria-label|aria-hidden)=(["\']).*?\1/i', '', $tag );
		$existing = '';
		if ( preg_match( '/\sclass=(["\'])(.*?)\1/i', $new, $c ) ) {
			$existing = $c[2] . ' ';
			$new      = preg_replace( '/\sclass=(["\']).*?\1/i', '', $new );
		}
		$par = '';
		if ( 'cover' === $fit || 'contain' === $fit ) {
			$new = preg_replace( '/\spreserveAspectRatio=(["\']).*?\1/i', '', $new );
			$par = ' preserveAspectRatio="' . ( 'cover' === $fit ? 'xMidYMid slice' : 'xMidYMid meet' ) . '"';
		}
		$name = $decorative || '' === $label ? ' aria-hidden="true"' : ' role="img" aria-label="' . esc_attr( $label ) . '"';
		$new  = preg_replace( '/^<svg\b/i', '<svg class="' . esc_attr( $existing . $classes ) . '"' . $name . $par, $new, 1 );
		return $new . substr( $svg, strlen( $tag ) );
	}
}
