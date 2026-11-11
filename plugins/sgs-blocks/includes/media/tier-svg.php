<?php
/**
 * Inline SVG for the media renderer: the id-prefixing it applies to each per-device SVG sibling, and the named-part
 * animation attribute.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once dirname( __DIR__ ) . '/helpers-svg-kses.php';
require_once dirname( __DIR__ ) . '/helpers-svg-document.php';
require_once dirname( __DIR__ ) . '/helpers-svg-instance-scope.php';

if ( ! function_exists( 'sgs_media_svg_parts_attr' ) ) {
	/**
	 * Put a slot's named-part animation on its inline SVG: the cleaned parts as `data-sgs-svg-parts` on the `<svg>`,
	 * which src/shared/svg-parts/svg-parts.js reads. The SVG is returned as it came when there are no parts to animate.
	 *
	 * @param string $svg     The `<svg>` markup from `sgs_media_svg_element()`.
	 * @param mixed  $parts   The slot's stored `SvgParts` list.
	 * @param string $trigger The slot's `SvgPartsTrigger` ('' for the default, `load`).
	 * @return string The `<svg>` markup.
	 */
	function sgs_media_svg_parts_attr( string $svg, $parts, string $trigger ): string {
		if ( '' === $svg || empty( $parts ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return $svg;
		}
		require_once dirname( __DIR__ ) . '/helpers-svg-parts.php';
		$json = sgs_svg_parts_data( $parts, '' !== $trigger ? $trigger : 'load' );
		if ( '' === $json ) {
			return $svg;
		}
		$tags = new WP_HTML_Tag_Processor( $svg );
		if ( ! $tags->next_tag() || 'SVG' !== $tags->get_tag() ) {
			return $svg;
		}
		$tags->set_attribute( 'data-sgs-svg-parts', $json );
		return trim( $tags->get_updated_html() );
	}
}

if ( ! function_exists( 'sgs_media_svg_element' ) ) {
	/**
	 * An inline SVG slot sibling: made safe by the sanitiser every SVG upload goes through, scoped to its own instance
	 * (ids, `<style>` rules and keyframes), then given its classes and accessible name.
	 *
	 * `sgs_svg_sanitise_document()` parses the markup as XML and rebuilds it from the SVG allowlist, which keeps a
	 * `<style>` element (class colours) and screens `url()`, `href` and `<image>` references to anything but a
	 * `#fragment` or a raster `data:image`. `sgs_svg_scope_instance()` prefixes every id with the instance scope and
	 * limits the file's CSS to this one SVG. The remaining edits are made with `WP_HTML_Tag_Processor`, which escapes
	 * each value it sets.
	 *
	 * @param string $markup     Raw SVG markup.
	 * @param string $classes    Classes for the root element.
	 * @param string $id_prefix  Instance scope with a trailing dash, e.g. `u1-s1-`; ids become `u1-s1-<id>`. '' keeps ids.
	 * @param string $label      Accessible name; ignored when `$decorative`.
	 * @param bool   $decorative True to hide the SVG from assistive technology.
	 * @param string $fit        `cover`, `contain` or '' for the viewBox default.
	 * @return string The `<svg>` markup, or '' when the sanitiser refuses it.
	 */
	function sgs_media_svg_element( string $markup, string $classes, string $id_prefix, string $label, bool $decorative, string $fit ): string {
		$markup = trim( $markup );
		if ( '' === $markup || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return '';
		}
		$markup = sgs_svg_sanitise_document( $markup )['svg'];
		if ( '' !== $markup && '' !== $id_prefix ) {
			$markup = sgs_svg_scope_instance( $markup, rtrim( $id_prefix, '-' ) );
		}
		if ( 1 !== preg_match( '/^<svg[\s>\/]/i', $markup ) ) {
			return '';
		}
		$tags = new WP_HTML_Tag_Processor( $markup );
		if ( ! $tags->next_tag() || 'SVG' !== $tags->get_tag() ) {
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
		$svg = trim( $tags->get_updated_html() );
		return 1 === preg_match( '/^<svg[\s>\/]/i', $svg ) ? $svg : '';
	}
}
