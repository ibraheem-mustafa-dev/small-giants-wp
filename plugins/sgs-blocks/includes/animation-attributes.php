<?php
/**
 * Animation attributes — server-side data-attribute injection.
 *
 * Injects data-sgs-animation, data-sgs-animation-delay, and
 * data-sgs-animation-duration attributes onto rendered block HTML.
 *
 * The JS extension (animation.js) handles the editor-side controls and
 * save-time props for static blocks. This filter handles dynamic blocks
 * (render.php) which don't go through blocks.getSaveContent.extraProps.
 *
 * Works with ALL sgs/* blocks. The frontend IntersectionObserver in
 * assets/js/animation-observer.js reads these data attributes and adds
 * the .sgs-animated class when elements scroll into view.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_animation_attributes', 10, 2 );

/**
 * Inject scroll-reveal data attributes into rendered block HTML.
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         The parsed block data including attrs.
 * @return string Modified block HTML with animation data attributes.
 */
function inject_animation_attributes( string $block_content, array $block ): string {
	// Only process SGS blocks.
	if ( empty( $block['blockName'] ) || ! str_starts_with( $block['blockName'], 'sgs/' ) ) {
		return $block_content;
	}

	// Skip empty blocks.
	if ( empty( $block_content ) ) {
		return $block_content;
	}

	$attrs     = $block['attrs'] ?? [];
	$animation = $attrs['sgsAnimation'] ?? 'none';

	// Nothing to do if no animation set.
	if ( 'none' === $animation || empty( $animation ) ) {
		return $block_content;
	}

	$delay    = $attrs['sgsAnimationDelay'] ?? '0';
	$duration = $attrs['sgsAnimationDuration'] ?? 'medium';

	// Use WP_HTML_Tag_Processor for safe attribute injection.
	$processor = new \WP_HTML_Tag_Processor( $block_content );

	if ( $processor->next_tag() ) {
		// Only add if not already present (static blocks may already have them).
		if ( null === $processor->get_attribute( 'data-sgs-animation' ) ) {
			$processor->set_attribute( 'data-sgs-animation', esc_attr( $animation ) );
			$processor->set_attribute( 'data-sgs-animation-delay', esc_attr( $delay ) );
			$processor->set_attribute( 'data-sgs-animation-duration', esc_attr( $duration ) );
		}

		return $processor->get_updated_html();
	}

	return $block_content;
}
