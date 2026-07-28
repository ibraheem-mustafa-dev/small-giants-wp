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

	// --- Locate the block's actual ROOT element. ---
	// The no-inline styling contract (Spec 32, D293-D296) has every composite
	// using SGS_Container_Wrapper — and several blocks directly — PREPEND a
	// scoped `<style id="…">…</style>` tag before their real wrapper element.
	// WP_HTML_Tag_Processor::next_tag() matches ANY tag, including <style>, so
	// calling it on the raw $block_content lands on the leading <style> tag
	// and writes the parallax class/vars onto it — inert, then stripped by the
	// p99 CSS-lift filter (sgs_lift_block_css, class-sgs-css-registry.php).
	// Same root cause + fix shape as hover-effects.php / device-visibility.php.
	$sgs_root_offset = 0;
	while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $block_content, $sgs_root_offset ), $sgs_lead_match ) ) {
		$sgs_close_tag = '</' . strtolower( $sgs_lead_match[1] ) . '>';
		$sgs_close_pos = stripos( $block_content, $sgs_close_tag, $sgs_root_offset );
		if ( false === $sgs_close_pos ) {
			break; // Malformed markup — bail out, treat the whole string as-is.
		}
		$sgs_root_offset = $sgs_close_pos + strlen( $sgs_close_tag );
	}

	$sgs_head = substr( $block_content, 0, $sgs_root_offset );
	$sgs_root = substr( $block_content, $sgs_root_offset );

	// Use WP_HTML_Tag_Processor for safe, standards-compliant manipulation,
	// scoped to the substring starting at the real root tag.
	$processor = new \WP_HTML_Tag_Processor( $sgs_root );

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

	return $sgs_head . $processor->get_updated_html();
}
