<?php
/**
 * Block link: the whole-block link overlay, injected at render time.
 *
 * A block that lists `blockLink` in `supports.sgs.enabledExtensions` (or hands its own destination to
 * `helpers-stretched-link.php`) carries `sgsBlockLink` + `sgsBlockLinkTarget` + `sgsBlockLinkLabel` +
 * `sgsBlockLinkSource`. This filter adds `.sgs-has-block-link` to the block root and inserts an EMPTY overlay
 * `<a class="sgs-block-link-overlay">` as the root's LAST CHILD: a stretched-link SIBLING of the content, never a
 * wrapper, so a link or button already inside the block never nests inside another `<a>`. `sgsBlockLinkLabel` drives
 * the required aria-label and falls back to the href host when empty. The overlay itself is built by
 * `link-overlay.php::insert_block_link_overlay`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/link-overlay.php';
require_once __DIR__ . '/../helpers-link-source.php';

add_filter( 'render_block', __NAMESPACE__ . '\inject_block_link', 10, 2 );

/**
 * Add the block-link class and overlay to a block's rendered output.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string Modified block HTML.
 */
function inject_block_link( string $block_content, array $block ): string {
	// A block that rendered nothing has no element to decorate.
	if ( '' === trim( $block_content ) ) {
		return $block_content;
	}

	$attrs = $block['attrs'] ?? array();

	// The typed link, or the page / Site Info link / back-to-top its source names.
	$link_source = is_string( $attrs['sgsBlockLinkSource'] ?? null ) ? $attrs['sgsBlockLinkSource'] : '';
	$link        = '' === $link_source
		? ( $attrs['sgsBlockLink'] ?? '' )
		: \sgs_link_source_href( $link_source, (string) ( $attrs['sgsBlockLink'] ?? '' ) );
	if ( ! $link ) {
		return $block_content;
	}
	$link_target = (bool) ( $attrs['sgsBlockLinkTarget'] ?? false );
	$link_label  = $attrs['sgsBlockLinkLabel'] ?? '';

	// The real root tag sits after any leading scoped <style>/<script> a block prepends (Spec 32 no-inline contract).
	// Skipping them here puts the class and the overlay on the wrapper, not on a tag the p99 CSS lift later strips.
	$root_offset = 0;
	while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $block_content, $root_offset ), $lead_match ) ) {
		$close_tag = '</' . strtolower( $lead_match[1] ) . '>';
		$close_pos = stripos( $block_content, $close_tag, $root_offset );
		if ( false === $close_pos ) {
			break; // Malformed markup: treat the whole string as-is.
		}
		$root_offset = $close_pos + strlen( $close_tag );
	}

	// Add the class to the ROOT tag (never the leading <style>/<script>).
	$head = substr( $block_content, 0, $root_offset );
	$root = substr( $block_content, $root_offset );
	if ( preg_match( '/^(<\w+\b[^>]*\bclass=["\'])/', $root ) ) {
		$root = preg_replace( '/^(<\w+\b[^>]*\bclass=["\'])/', '$1sgs-has-block-link ', $root, 1 );
	} else {
		$root = preg_replace( '/^(<\w+)(\b)/', '$1 class="sgs-has-block-link"$2', $root, 1 );
	}
	$block_content = $head . $root;

	return insert_block_link_overlay(
		$block_content,
		$root_offset,
		$link,
		$link_target,
		$link_label,
		\sgs_link_source_attrs_html( $link_source )
	);
}
