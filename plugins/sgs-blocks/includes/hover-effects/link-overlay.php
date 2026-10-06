<?php
/**
 * Hover Effects — block-link overlay insertion.
 *
 * Split out of the former includes/hover-effects.php (the orchestrator now
 * lives in hover-effects.php in this same folder).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Whether an anchor's attribute string points at the block-link URL.
 *
 * Compares against both the raw URL and its `esc_url()` form, and decodes
 * entities in the attribute, because a render path may have written either
 * (`&amp;` in a query string is the common case).
 *
 * @param string $attrs      The anchor's attribute string (everything inside `<a …>`).
 * @param string $block_link Block-link URL.
 * @return bool
 */
function block_link_href_matches( string $attrs, string $block_link ): bool {
	if ( ! preg_match( '/\bhref\s*=\s*(["\'])(.*?)\1/i', $attrs, $href_match ) ) {
		return false;
	}

	$href = trim( html_entity_decode( $href_match[2], ENT_QUOTES ) );
	if ( '' === $href || '#' === $href ) {
		return false;
	}

	$candidates = array( $block_link, esc_url( $block_link ) );
	foreach ( $candidates as $candidate ) {
		$candidate = trim( html_entity_decode( (string) $candidate, ENT_QUOTES ) );
		if ( '' !== $candidate && \untrailingslashit( $href ) === \untrailingslashit( $candidate ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Whether an anchor is already hidden from keyboard and assistive tech.
 *
 * An anchor carrying `tabindex="-1"` or `aria-hidden="true"` is NOT a
 * candidate to own the block's tab stop — `sgs/product-card`'s image anchor
 * is deliberately both, and lending the stop to it would leave the card with
 * no keyboard route at all.
 *
 * @param string $attrs The anchor's attribute string.
 * @return bool
 */
function block_link_anchor_is_inert( string $attrs ): bool {
	return (bool) preg_match( '/\btabindex\s*=\s*(["\'])\s*-1\s*\1/i', $attrs )
		|| (bool) preg_match( '/\baria-hidden\s*=\s*(["\'])\s*true\s*\1/i', $attrs );
}

/**
 * Add a class to an anchor's attribute string, merging with any existing one.
 *
 * @param string $attrs      The anchor's attribute string.
 * @param string $class_name The class to add.
 * @return string The attribute string with the class present.
 */
function block_link_add_class( string $attrs, string $class_name ): string {
	if ( preg_match( '/\bclass\s*=\s*(["\'])(.*?)\1/i', $attrs, $class_match ) ) {
		$merged = trim( $class_match[2] . ' ' . $class_name );
		return str_replace( $class_match[0], 'class="' . esc_attr( $merged ) . '"', $attrs );
	}

	return rtrim( $attrs ) . ' class="' . esc_attr( $class_name ) . '"';
}

/**
 * Insert the block-link overlay as the block root's LAST CHILD.
 *
 * Stretched-link pattern: the overlay is a SIBLING of the content, never a
 * wrapper, so a link/button already inside the block never nests inside a
 * second `<a>` — invalid HTML the old whole-block wrap produced.
 * `.sgs-has-block-link` (added to the root's class list by
 * build_hover_classes()) gives the root the positioning context the overlay
 * needs; extensions.css raises real interactive descendants above it.
 *
 * WHO OWNS THE TAB STOP, and why it is decided here rather than by the host.
 *
 * The accepted card pattern is ONE real, visible, named link whose hit area is
 * stretched over the card — not an injected empty anchor. Assistive tech
 * enumerates links, so a synthesised anchor reads as a nameless entry (or, when
 * the operator left the label blank, as the link's HOST), and a visible link
 * beside it to the same place is a second stop to the same destination.
 *
 * This function is handed the block's RENDERED HTML and the target URL, so it
 * can find such a link itself and needs nothing from the host block:
 *
 *   - The FIRST non-inert anchor whose href is the block link becomes the
 *     LENDER (`sgs-block-link-source`). It keeps its href, its visible text
 *     and its tab stop, so the card's accessible name is its own content.
 *   - Any FURTHER non-inert anchor to the same destination is demoted to
 *     `tabindex="-1" aria-hidden="true"`: still visible, still clickable with a
 *     mouse, but no longer a second stop to one place. This is what stops a
 *     "Learn more" CTA doubling the card's tab stops, and it reaches the four
 *     blocks that take a typed URL and have no suppression logic of their own.
 *   - The overlay is still injected, because it is what gives the hit area the
 *     right GEOMETRY: as a direct child of the root it covers the whole card,
 *     whereas a `::before` on the lender would size to the nearest positioned
 *     ancestor — on a product card that is `.product-card-body`, which would
 *     silently shrink the hit area to everything but the photo. When a lender
 *     exists the overlay is made inert (`tabindex="-1" aria-hidden="true"`, and
 *     no aria-label, which an aria-hidden element has no use for), so it is a
 *     mouse surface only. That pairing — real heading link plus inert overlay —
 *     is the pattern bbc.co.uk ships.
 *   - With NO lender (a typed URL pointing somewhere the block does not already
 *     link) the overlay keeps its label and its tab stop, exactly as before, so
 *     a block whose only route to the destination is the overlay still has one.
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

	$sgs_root = substr( $block_content, $sgs_root_offset );

	// Find the lender, and demote any further link to the same destination.
	$lender_found = false;
	$sgs_root     = (string) preg_replace_callback(
		'/<a\b([^>]*)>/i',
		static function ( array $anchor ) use ( &$lender_found, $block_link ): string {
			$attrs = $anchor[1];

			if ( ! block_link_href_matches( $attrs, $block_link )
				|| block_link_anchor_is_inert( $attrs ) ) {
				return $anchor[0];
			}

			if ( ! $lender_found ) {
				$lender_found = true;
				return '<a' . block_link_add_class( $attrs, 'sgs-block-link-source' ) . '>';
			}

			return '<a' . rtrim( $attrs ) . ' tabindex="-1" aria-hidden="true">';
		},
		$sgs_root
	);

	if ( $lender_found ) {
		// The lender owns the stop and the name; the overlay is a mouse surface.
		$overlay_html = sprintf(
			'<a class="sgs-block-link-overlay" href="%s" tabindex="-1" aria-hidden="true"%s></a>',
			esc_url( $block_link ),
			$target_attr
		);
	} else {
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
	}

	// Locate the ROOT element's own closing tag (the LAST occurrence of
	// its tag name's closing tag WITHIN $sgs_root — never within a
	// prepended <style>/<script> block, which would otherwise be
	// mistaken for the root and swallow the overlay as inert CSS text,
	// see $sgs_root_offset above) and insert the overlay immediately
	// before it, making it the root's final child rather than a wrapper
	// around the whole subtree.
	if ( preg_match( '/^<([a-zA-Z][a-zA-Z0-9-]*)\b/', $sgs_root, $root_tag_match ) ) {
		$root_close_tag = '</' . $root_tag_match[1] . '>';
		$root_close_pos = strrpos( $sgs_root, $root_close_tag );
		if ( false !== $root_close_pos ) {
			$sgs_root = substr_replace( $sgs_root, $overlay_html, $root_close_pos, 0 );
		}
	}

	return substr( $block_content, 0, $sgs_root_offset ) . $sgs_root;
}
