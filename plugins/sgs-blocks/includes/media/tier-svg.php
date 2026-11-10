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

if ( ! function_exists( 'sgs_media_svg_prefix_reference' ) ) {
	/**
	 * One attribute value with every reference to a listed id re-pointed at its prefixed id.
	 *
	 * @param string   $value  Attribute value ( text, not markup ).
	 * @param string[] $ids    Ids defined in the SVG.
	 * @param string   $prefix Prefix.
	 * @return string
	 */
	function sgs_media_svg_prefix_reference( string $value, array $ids, string $prefix ): string {
		return (string) preg_replace_callback(
			'/url\(\s*(["\x27]?)#([^"\x27)\s]+)\1\s*\)/',
			static function ( array $m ) use ( $ids, $prefix ): string {
				return in_array( $m[2], $ids, true ) ? 'url(' . $m[1] . '#' . $prefix . $m[2] . $m[1] . ')' : $m[0];
			},
			$value
		);
	}
}

if ( ! function_exists( 'sgs_media_svg_element' ) ) {
	/**
	 * An inline SVG slot sibling: ids prefixed, root given its classes and accessible name, then sanitised.
	 *
	 * Every edit is made with `WP_HTML_Tag_Processor`, which escapes each value it sets, and `wp_kses` with the SVG
	 * allow-list runs last on the final markup, so nothing edited here can reach the page unsanitised.
	 *
	 * @param string $markup     Raw SVG markup.
	 * @param string $classes    Classes for the root element.
	 * @param string $id_prefix  Prefix for element ids.
	 * @param string $label      Accessible name; ignored when `$decorative`.
	 * @param bool   $decorative True to hide the SVG from assistive technology.
	 * @param string $fit        `cover`, `contain` or '' for the viewBox default.
	 * @return string The `<svg>` markup, or '' when nothing survives sanitising.
	 */
	function sgs_media_svg_element( string $markup, string $classes, string $id_prefix, string $label, bool $decorative, string $fit ): string {
		$markup = trim( $markup );
		if ( '' === $markup || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return '';
		}
		$ids  = array();
		$scan = new WP_HTML_Tag_Processor( $markup );
		while ( $scan->next_tag() ) {
			$id = $scan->get_attribute( 'id' );
			if ( is_string( $id ) && '' !== $id ) {
				$ids[] = $id;
			}
		}
		$refs  = array( 'fill', 'stroke', 'clip-path', 'mask', 'filter', 'style', 'marker-start', 'marker-mid', 'marker-end' );
		$tags  = new WP_HTML_Tag_Processor( $markup );
		$first = true;
		while ( $tags->next_tag() ) {
			if ( '' !== $id_prefix && $ids ) {
				$id = $tags->get_attribute( 'id' );
				if ( is_string( $id ) && in_array( $id, $ids, true ) ) {
					$tags->set_attribute( 'id', $id_prefix . $id );
				}
				foreach ( array( 'href', 'xlink:href' ) as $name ) {
					$href = $tags->get_attribute( $name );
					if ( is_string( $href ) && 0 === strpos( $href, '#' ) && in_array( substr( $href, 1 ), $ids, true ) ) {
						$tags->set_attribute( $name, '#' . $id_prefix . substr( $href, 1 ) );
					}
				}
				$labelled = $tags->get_attribute( 'aria-labelledby' );
				if ( is_string( $labelled ) && '' !== $labelled ) {
					$parts = array_map(
						static fn( string $p ): string => in_array( $p, $ids, true ) ? $id_prefix . $p : $p,
						preg_split( '/\s+/', trim( $labelled ) )
					);
					$tags->set_attribute( 'aria-labelledby', implode( ' ', $parts ) );
				}
				foreach ( $refs as $name ) {
					$value = $tags->get_attribute( $name );
					if ( is_string( $value ) && false !== strpos( $value, 'url(' ) ) {
						$tags->set_attribute( $name, sgs_media_svg_prefix_reference( $value, $ids, $id_prefix ) );
					}
				}
			}
			if ( $first ) {
				$first = false;
				if ( 'SVG' !== $tags->get_tag() ) {
					return '';
				}
				foreach ( array( 'role', 'aria-label', 'aria-hidden' ) as $name ) {
					$tags->remove_attribute( $name );
				}
				foreach ( preg_split( '/\s+/', trim( $classes ) ) as $class ) {
					if ( '' !== $class ) {
						$tags->add_class( $class );
					}
				}
				if ( 'cover' === $fit || 'contain' === $fit ) {
					$tags->set_attribute( 'preserveAspectRatio', 'cover' === $fit ? 'xMidYMid slice' : 'xMidYMid meet' );
				}
				if ( $decorative || '' === $label ) {
					$tags->set_attribute( 'aria-hidden', 'true' );
				} else {
					$tags->set_attribute( 'role', 'img' );
					$tags->set_attribute( 'aria-label', $label );
				}
			}
		}
		$svg = trim( wp_kses( $tags->get_updated_html(), sgs_svg_kses_allowed_tags() ) );
		return 1 === preg_match( '/^<svg[\s>\/]/i', $svg ) ? $svg : '';
	}
}
