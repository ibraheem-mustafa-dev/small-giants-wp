<?php
/**
 * Device visibility — server-side class injection.
 *
 * Adds sgs-hide-mobile, sgs-hide-tablet, sgs-hide-desktop CSS classes
 * to block wrapper elements based on the sgsHideOnMobile, sgsHideOnTablet,
 * and sgsHideOnDesktop block attributes.
 *
 * Works with ALL block types (core and SGS, static and dynamic).
 * The display:none media queries are GENERATED from the canonical
 * SGS_Breakpoints source (mobile <= 767px, tablet 768–1023px, desktop
 * >= 1024px) and injected as inline CSS on the extensions stylesheet — so
 * there is ONE breakpoint source shared with the FR-S9-6 responsive engine
 * (R-31-1), never a second hardcoded 600/1024 pair. Content remains in the
 * DOM for SEO (display:none only hides visually).
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

// The canonical device-tier breakpoint source (mobile <= 767, tablet <= 1023).
require_once __DIR__ . '/class-sgs-breakpoints.php';

add_filter( 'render_block', __NAMESPACE__ . '\\inject_device_visibility_classes', 10, 2 );

// Inject the generated hide-* media queries onto the extensions stylesheet
// (priority 20 so the sgs-extensions / sgs-extensions-editor handles are
// already registered by class-sgs-blocks at priority 10).
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_device_visibility_css', 20 );
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\enqueue_device_visibility_editor_css', 20 );

/**
 * Build the device-visibility media queries from the canonical breakpoint source.
 *
 * Emits exactly three rules whose bounds are DERIVED from SGS_Breakpoints
 * (the FR-S9-6 / R-31-1 single source), never a hardcoded pair:
 *   - .sgs-hide-mobile  : max-width MOBILE_MAX (<= 767)
 *   - .sgs-hide-tablet  : MOBILE_MAX+1 .. TABLET_MAX (768–1023)
 *   - .sgs-hide-desktop : min-width TABLET_MAX+1 (>= 1024)
 *
 * @return string The generated CSS.
 */
function device_visibility_css(): string {
	$mobile_max  = (int) \SGS_Breakpoints::MOBILE_MAX;
	$tablet_max  = (int) \SGS_Breakpoints::TABLET_MAX;
	$tablet_min  = $mobile_max + 1;
	$desktop_min = $tablet_max + 1;

	return sprintf(
		'@media (max-width:%1$dpx){.sgs-hide-mobile{display:none !important;}}' .
		'@media (min-width:%2$dpx) and (max-width:%3$dpx){.sgs-hide-tablet{display:none !important;}}' .
		'@media (min-width:%4$dpx){.sgs-hide-desktop{display:none !important;}}',
		$mobile_max,
		$tablet_min,
		$tablet_max,
		$desktop_min
	);
}

/**
 * Attach the generated visibility CSS to the frontend extensions stylesheet.
 */
function enqueue_device_visibility_css(): void {
	if ( wp_style_is( 'sgs-extensions', 'enqueued' ) ) {
		wp_add_inline_style( 'sgs-extensions', device_visibility_css() );
	}
}

/**
 * Attach the generated visibility CSS to the editor extensions stylesheet,
 * so the editor preview hides at the same breakpoints as the frontend.
 */
function enqueue_device_visibility_editor_css(): void {
	if ( wp_style_is( 'sgs-extensions-editor', 'enqueued' ) ) {
		wp_add_inline_style( 'sgs-extensions-editor', device_visibility_css() );
	}
}

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

	// Advance to the first VISIBLE wrapper tag, skipping any leading scoped
	// <style>/<script> the block emits (the no-inline contract prepends a
	// scoped <style> to many blocks). Without this, the visibility class lands
	// on the <style> tag — which the CSS collector then lifts to <head>, so the
	// class silently vanishes and the wrapper never hides. Universal fix.
	$found_wrapper = false;
	while ( $processor->next_tag() ) {
		$tag = $processor->get_tag();
		if ( 'STYLE' !== $tag && 'SCRIPT' !== $tag ) {
			$found_wrapper = true;
			break;
		}
	}

	if ( $found_wrapper ) {
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
