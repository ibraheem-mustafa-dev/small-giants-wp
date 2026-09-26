<?php
/**
 * Hover Effects — block-link overlay insertion.
 *
 * Split out of the former includes/hover-effects.php (the orchestrator now
 * lives in hover-effects.php in this same folder). Verbatim move of the
 * "Inject the block-link overlay" stage; no behaviour change.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Insert the block-link overlay as the block root's LAST CHILD.
 *
 * Stretched-link pattern: the overlay is a SIBLING of the content, never
 * a wrapper, so a link/button already inside the block (e.g. card-grid
 * items, team-member socials) never nests inside a second <a> — invalid
 * HTML the old whole-block wrap produced. `.sgs-has-block-link` (added to
 * the root's class list by build_hover_classes()) gives the root the
 * positioning context the overlay needs; extensions.css raises real
 * interactive descendants above the overlay via z-index.
 *
 * @param string $block_content      Rendered block HTML (after class injection).
 * @param int    $sgs_root_offset    Offset of the block's real root element within $block_content
 *                                   (past any leading scoped <style>/<script> tag).
 * @param string $block_link         Block-link URL.
 * @param bool   $block_link_target  Whether the link opens in a new tab.
 * @param string $block_link_label   Operator-supplied accessible label, or ''.
 * @return string $block_content with the overlay inserted, or unchanged if the root's closing tag
 *                could not be found.
 */
function insert_block_link_overlay(
	string $block_content,
	int $sgs_root_offset,
	string $block_link,
	bool $block_link_target,
	string $block_link_label
): string {
	$target_attr = $block_link_target
		? ' target="_blank" rel="noopener noreferrer"'
		: '';

	// An empty anchor is invisible to screen readers without an
	// accessible name — aria-label is required, never optional. Prefer
	// the operator-supplied label; fall back to the link's host so the
	// overlay is never unlabelled even when the control is left blank.
	$link_label = $block_link_label;
	if ( '' === $link_label ) {
		$link_host  = wp_parse_url( $block_link, PHP_URL_HOST );
		$link_label = $link_host ? $link_host : $block_link;
	}

	$overlay_html = sprintf(
		'<a class="sgs-block-link-overlay" href="%s" aria-label="%s"%s></a>',
		esc_url( $block_link ),
		esc_attr( $link_label ),
		$target_attr
	);

	// Locate the ROOT element's own closing tag (the LAST occurrence of
	// its tag name's closing tag WITHIN $sgs_root — never within a
	// prepended <style>/<script> block, which would otherwise be
	// mistaken for the root and swallow the overlay as inert CSS text,
	// see $sgs_root_offset above) and insert the overlay immediately
	// before it, making it the root's final child rather than a wrapper
	// around the whole subtree.
	$sgs_root = substr( $block_content, $sgs_root_offset );
	if ( preg_match( '/^<([a-zA-Z][a-zA-Z0-9-]*)\b/', $sgs_root, $root_tag_match ) ) {
		$root_close_tag = '</' . $root_tag_match[1] . '>';
		$root_close_pos = strrpos( $sgs_root, $root_close_tag );
		if ( false !== $root_close_pos ) {
			$sgs_root      = substr_replace( $sgs_root, $overlay_html, $root_close_pos, 0 );
			$block_content = substr( $block_content, 0, $sgs_root_offset ) . $sgs_root;
		}
	}

	return $block_content;
}
