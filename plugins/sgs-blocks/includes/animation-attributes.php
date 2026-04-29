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
/**
 * Core blocks that support the animation extension.
 */
const CORE_ANIMATION_BLOCKS = array(
	'core/group',
	'core/columns',
	'core/cover',
	'core/image',
);

/**
 * Inject scroll-reveal data attributes into rendered block HTML.
 *
 * Handles dynamic blocks (render.php) which bypass blocks.getSaveContent.extraProps.
 * The frontend IntersectionObserver reads these attributes to trigger CSS transitions.
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         The parsed block data including attrs.
 * @return string Modified block HTML with animation data attributes.
 */
function inject_animation_attributes( string $block_content, array $block ): string {
	$block_name = $block['blockName'] ?? '';

	// Process SGS blocks + supported core blocks.
	if ( empty( $block_name ) ) {
		return $block_content;
	}

	$is_sgs  = str_starts_with( $block_name, 'sgs/' );
	$is_core = in_array( $block_name, CORE_ANIMATION_BLOCKS, true );

	if ( ! $is_sgs && ! $is_core ) {
		return $block_content;
	}

	// Skip empty blocks.
	if ( empty( $block_content ) ) {
		return $block_content;
	}

	$attrs     = $block['attrs'] ?? array();
	$animation = $attrs['sgsAnimation'] ?? 'none';

	// Nothing to do if no animation set.
	if ( 'none' === $animation || empty( $animation ) ) {
		return $block_content;
	}

	$delay    = $attrs['sgsAnimationDelay'] ?? '0';
	$duration = $attrs['sgsAnimationDuration'] ?? 'medium';
	$easing   = $attrs['sgsAnimationEasing'] ?? 'default';

	// Use WP_HTML_Tag_Processor for safe attribute injection.
	$processor = new \WP_HTML_Tag_Processor( $block_content );

	if ( $processor->next_tag() ) {
		// Only add if not already present (static blocks may already have them).
		if ( null === $processor->get_attribute( 'data-sgs-animation' ) ) {
			$processor->set_attribute( 'data-sgs-animation', esc_attr( $animation ) );
			$processor->set_attribute( 'data-sgs-animation-delay', esc_attr( $delay ) );
			$processor->set_attribute( 'data-sgs-animation-duration', esc_attr( $duration ) );
			$processor->set_attribute( 'data-sgs-animation-easing', esc_attr( $easing ) );
		}

		return $processor->get_updated_html();
	}

	return $block_content;
}
