<?php
/**
 * Device visibility — server-side class injection.
 *
 * Adds sgs-hide-mobile, sgs-hide-tablet, sgs-hide-desktop CSS classes
 * to block wrapper elements based on the sgsHideOnMobile, sgsHideOnTablet,
 * and sgsHideOnDesktop block attributes.
 *
 * Works with ALL block types (core and SGS, static and dynamic).
 * The CSS rules live in assets/css/extensions.css and use media queries
 * with display:none to hide content. Content remains in the DOM for SEO.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_device_visibility_classes', 10, 2 );

/**
 * Inject device visibility CSS classes into the rendered block HTML.
 *
 * Reads the sgsHideOnMobile, sgsHideOnTablet, and sgsHideOnDesktop
 * boolean attributes and adds the corresponding CSS classes to the
 * outermost wrapper element of the block.
 *
 * @since 1.0.0
 * @param string $block_content The rendered block HTML.
 * @param array  $block         The parsed block data including attrs.
 * @return string Modified block HTML with visibility classes.
 */
function inject_device_visibility_classes( string $block_content, array $block ): string {
	// Skip empty blocks (spacers, separators with no wrapper, etc.).
	if ( empty( $block_content ) || empty( $block['blockName'] ) ) {
		return $block_content;
	}

	$attrs = $block['attrs'] ?? [];

	// Collect the classes to add.
	$classes = [];

	if ( ! empty( $attrs['sgsHideOnMobile'] ) ) {
		$classes[] = 'sgs-hide-mobile';
	}

	if ( ! empty( $attrs['sgsHideOnTablet'] ) ) {
		$classes[] = 'sgs-hide-tablet';
	}

	if ( ! empty( $attrs['sgsHideOnDesktop'] ) ) {
		$classes[] = 'sgs-hide-desktop';
	}

	// Nothing to do if no visibility attributes are set.
	if ( empty( $classes ) ) {
		return $block_content;
	}

	$new_classes = implode( ' ', $classes );

	// Use the WP HTML Tag Processor for safe, standards-compliant manipulation.
	$processor = new \WP_HTML_Tag_Processor( $block_content );

	if ( $processor->next_tag() ) {
		$existing_class = $processor->get_attribute( 'class' );

		if ( $existing_class ) {
			// Avoid duplicate classes if the static save already added them.
			foreach ( $classes as $class ) {
				if ( false === strpos( $existing_class, $class ) ) {
					$processor->add_class( $class );
				}
			}
		} else {
			$processor->set_attribute( 'class', $new_classes );
		}

		return $processor->get_updated_html();
	}

	// If we couldn't find a tag (unusual), return unchanged.
	return $block_content;
}
