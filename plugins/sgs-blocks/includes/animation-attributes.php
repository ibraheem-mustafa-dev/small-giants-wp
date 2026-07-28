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

	// --- Locate the block's actual ROOT element. ---
	// The no-inline styling contract (Spec 32, D293-D296) has every composite
	// using SGS_Container_Wrapper — and several blocks directly — PREPEND a
	// scoped `<style id="…">…</style>` tag before their real wrapper element.
	// WP_HTML_Tag_Processor::next_tag() matches ANY tag, including <style>, so
	// calling it on the raw $block_content lands on the leading <style> tag and
	// writes data-sgs-animation* onto it — inert (style tags aren't visually
	// targetable) and later stripped wholesale by the p99 CSS-lift filter
	// (sgs_lift_block_css, class-sgs-css-registry.php), so the animation never
	// fires. Same root cause + fix shape as the hover-effects.php overlay bug
	// (device-visibility.php's skip-loop is the original proven pattern).
	$sgs_root_offset = 0;
	while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $block_content, $sgs_root_offset ), $sgs_lead_match ) ) {
		$sgs_close_tag = '</' . strtolower( $sgs_lead_match[1] ) . '>';
		$sgs_close_pos = stripos( $block_content, $sgs_close_tag, $sgs_root_offset );
		if ( false === $sgs_close_pos ) {
			break; // Malformed markup — bail out, treat the whole string as-is.
		}
		$sgs_root_offset = $sgs_close_pos + strlen( $sgs_close_tag );
	}

	// Use WP_HTML_Tag_Processor for safe attribute injection, scoped to the
	// substring starting at the real root tag so <style>/<script> is never
	// mistaken for it.
	$sgs_head = substr( $block_content, 0, $sgs_root_offset );
	$sgs_root = substr( $block_content, $sgs_root_offset );

	$processor = new \WP_HTML_Tag_Processor( $sgs_root );

	if ( $processor->next_tag() ) {
		// Only add if not already present (static blocks may already have them).
		if ( null === $processor->get_attribute( 'data-sgs-animation' ) ) {
			$processor->set_attribute( 'data-sgs-animation', esc_attr( $animation ) );
			$processor->set_attribute( 'data-sgs-animation-delay', esc_attr( $delay ) );
			$processor->set_attribute( 'data-sgs-animation-duration', esc_attr( $duration ) );
			$processor->set_attribute( 'data-sgs-animation-easing', esc_attr( $easing ) );
		}

		return $sgs_head . $processor->get_updated_html();
	}

	return $block_content;
}
