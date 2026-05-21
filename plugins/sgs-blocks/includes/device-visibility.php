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
 * -------------------------------------------------------------------------
 * COEXISTENCE NOTE — WP 7.0 native block visibility (Decision 25, Phase 6)
 * -------------------------------------------------------------------------
 *
 * WordPress 7.0 ships native device-type show/hide controls in the block
 * toolbar and inspector sidebar. The native system uses the block support
 * key `'visibility'` in block.json and stores state in
 * `block.metadata.blockVisibility.viewport` with three keys:
 * mobile (<= 480px), tablet (480–782px), desktop (> 782px).
 *
 * PRECEDENCE RULE — two UIs coexist short-term:
 *
 *   1. WP-native visibility (preferred for simple show/hide): operator
 *      controls appear in every block's toolbar and inspector automatically
 *      once a block declares `"visibility": true` in its block.json supports.
 *      This extension does NOT interfere with native visibility.
 *
 *   2. SGS device-visibility extension (this file): use ONLY when native
 *      visibility is insufficient — for example, combined conditions such as
 *      "show on mobile AND only when logged-in", or breakpoints that differ
 *      from WP-native's fixed three sizes.
 *
 * RETIRE CRITERIA: When WP-native visibility reaches feature parity with
 * all condition types supported here (combined conditions, custom breakpoints,
 * login-state etc.), this extension will be retired. Expected WP 7.1 adds
 * configurable breakpoints and theme.json integration.
 *
 * SGS blocks do NOT currently declare `"visibility": true` in block.json
 * because this extension provides a superset of the native feature.
 * Add `"supports": { "visibility": true }` to any block's block.json to
 * opt that block into the native WP toolbar/inspector panel in ADDITION to
 * this extension's controls.
 *
 * @see https://make.wordpress.org/core/2026/03/15/block-visibility-in-wordpress-7-0/
 * -------------------------------------------------------------------------
 *
 * @package SGS\Blocks
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
