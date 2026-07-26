<?php
/**
 * Per-row behaviour helpers (Spec 37 Phase 2 — per-row shrink).
 *
 * Owns the SERVER-SIDE BACKSTOP for "shrink hides a chosen element": the
 * operator picks one child of the row to hide once that row shrinks on scroll,
 * and this helper re-validates that choice at render time.
 *
 * Two independent guards, defence-in-depth with the editor picker:
 *   1. The target must actually still be a DIRECT child of this row. If the
 *      operator deleted the element, the stored id is orphaned — we return ''
 *      and shrink simply hides nothing (no error, no notice — must-fix 3).
 *   2. The target's block type must NOT declare `supports.sgs.headerEssential`.
 *      That flag is the DECLARATIVE guardrail (R-31-1: no hardcoded block-name
 *      dictionary here) marking a block whose absence would break the header —
 *      logo, primary navigation, cart. The editor picker greys those out; this
 *      backstop refuses them even if a hand-edited attribute slips through
 *      (must-fix 4).
 *
 * The reference is the child's own `anchor` attribute — a STABLE per-child id
 * that survives copy/paste, never the editor's internal clientId (must-fix 3).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_block_is_header_essential' ) ) {
	/**
	 * Is this block type flagged as essential header furniture?
	 *
	 * Reads `supports.sgs.headerEssential` from the block-type registry — the
	 * same declarative source the editor picker reads via
	 * wp.blocks.getBlockType(). Protecting a new critical block later is a
	 * one-line block.json flag, never a code change here.
	 *
	 * @param string $block_name Block slug, e.g. 'sgs/nav-menu'.
	 * @return bool
	 */
	function sgs_block_is_header_essential( $block_name ) {
		if ( ! is_string( $block_name ) || '' === $block_name || ! class_exists( 'WP_Block_Type_Registry' ) ) {
			return false;
		}
		$type = WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		if ( ! $type || ! isset( $type->supports['sgs']['headerEssential'] ) ) {
			return false;
		}
		return (bool) $type->supports['sgs']['headerEssential'];
	}
}

if ( ! function_exists( 'sgs_resolve_row_shrink_hide_target' ) ) {
	/**
	 * Validate the stored shrink-hide target against this row's actual children.
	 *
	 * @param mixed $block      The row's WP_Block instance (or anything else — non-WP_Block returns '').
	 * @param mixed $raw_target The stored `rowShrinkHideTarget` attribute (a child's `anchor` id).
	 * @return string The sanitised anchor id when the target is a real, non-essential child; '' otherwise.
	 */
	function sgs_resolve_row_shrink_hide_target( $block, $raw_target ) {
		$target = is_string( $raw_target ) ? sanitize_html_class( $raw_target ) : '';
		if ( '' === $target || ! ( $block instanceof WP_Block ) || empty( $block->parsed_block['innerBlocks'] ) ) {
			return '';
		}

		foreach ( $block->parsed_block['innerBlocks'] as $child ) {
			$anchor = isset( $child['attrs']['anchor'] ) ? sanitize_html_class( (string) $child['attrs']['anchor'] ) : '';
			if ( '' === $anchor || $anchor !== $target ) {
				continue;
			}
			// Found the referenced child — refuse it if it is essential furniture.
			$child_name = isset( $child['blockName'] ) ? (string) $child['blockName'] : '';
			return sgs_block_is_header_essential( $child_name ) ? '' : $anchor;
		}

		// Orphaned reference (element deleted) — hide nothing, raise nothing.
		return '';
	}
}
