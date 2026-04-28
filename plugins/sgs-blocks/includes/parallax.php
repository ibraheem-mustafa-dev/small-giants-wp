<?php
/**
 * Parallax — server-side attribute injection.
 *
 * Adds sgs-parallax-background or sgs-parallax-element CSS class,
 * the --sgs-parallax-strength custom property, and a data-sgs-parallax
 * attribute to the outermost wrapper element of any block whose
 * sgsParallax attribute is set to 'background' or 'element'.
 *
 * Runs at priority 11 — after conditional-visibility (9) and
 * device-visibility (10) so all visibility guards have already run.
 *
 * The actual parallax effect is handled by:
 *   1. CSS Scroll-Driven Animations in assets/css/extensions.css (modern browsers).
 *   2. background-attachment: fixed fallback for older desktop browsers.
 *   3. assets/js/parallax.js for browsers without CSS SDA support.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_parallax_attributes', 11, 2 );

/**
 * Inject parallax CSS class, custom property, and data attribute.
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         The parsed block data including attrs.
 * @return string Modified block HTML with parallax attributes injected.
 */
function inject_parallax_attributes( string $block_content, array $block ): string {
	// Skip empty blocks (spacers, separators with no wrapper, etc.).
	if ( empty( $block_content ) || empty( $block['blockName'] ) ) {
		return $block_content;
	}

	$attrs = $block['attrs'] ?? array();

	// Early return when parallax is not set or is explicitly 'none'.
	if ( empty( $attrs['sgsParallax'] ) || 'none' === $attrs['sgsParallax'] ) {
		return $block_content;
	}

	$type = $attrs['sgsParallax'];

	// Only handle the two known parallax types.
	if ( 'background' !== $type && 'element' !== $type ) {
		return $block_content;
	}

	// Clamp strength to 0–100 and default to 30.
	$raw_strength = isset( $attrs['sgsParallaxStrength'] ) ? $attrs['sgsParallaxStrength'] : 30;
	$strength     = min( 100, max( 0, (int) $raw_strength ) );

	// Determine the CSS class to add.
	$css_class = 'background' === $type ? 'sgs-parallax-background' : 'sgs-parallax-element';

	// Use WP_HTML_Tag_Processor for safe, standards-compliant manipulation.
	$processor = new \WP_HTML_Tag_Processor( $block_content );

	if ( ! $processor->next_tag() ) {
		// Could not find a root tag — return unchanged.
		return $block_content;
	}

	// Add CSS class (add_class handles duplicates safely).
	$processor->add_class( $css_class );

	// Merge --sgs-parallax-strength into existing inline style.
	$existing_style = $processor->get_attribute( 'style' ) ?? '';
	$parallax_var   = '--sgs-parallax-strength:' . $strength . ';';

	if ( $existing_style ) {
		$new_style = rtrim( $existing_style, '; ' ) . ';' . $parallax_var;
	} else {
		$new_style = $parallax_var;
	}

	$processor->set_attribute( 'style', $new_style );

	// Add data attribute for the JS fallback to target.
	$processor->set_attribute( 'data-sgs-parallax', $type );

	return $processor->get_updated_html();
}
