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

if ( ! function_exists( 'sgs_row_shrink_css' ) ) {
	/**
	 * Build the per-instance "shrunk" vertical-padding CSS for one row.
	 *
	 * Shared by sgs/site-header-row and sgs/site-footer-row so the two twins can
	 * never drift, and so a third block wanting proportional shrink calls this
	 * rather than copying it.
	 *
	 * WHY THIS IS PER-INSTANCE AND NOT A SHARED STYLESHEET RULE: shrink must be
	 * PROPORTIONAL to the row's own resting padding. A fixed value in
	 * assets/css/header-behaviours.css wins on specificity over the wrapper's
	 * padding rule and therefore forces every row to the same size — which on a
	 * row with no padding meant 0px at rest and 4px "shrunk" (it grew). Emitting
	 * `calc(<this row's own value> / 2)` makes growth impossible by construction.
	 *
	 * Notes on the shared responsive engine (verified against
	 * includes/helpers-responsive.php before writing this):
	 *  - TWO SCALAR SPECS, never `box => true`. A box spec expands across all four
	 *    sides (sgs_responsive_atoms_from_spec:347-365) — that would halve
	 *    padding-left/right too and jolt the row horizontally on scroll.
	 *  - The engine does the tier cascade + tier-diff + @media wrapping itself
	 *    (sgs_emit_responsive_css:450-495), so an absent tier correctly inherits
	 *    the tier above instead of reading as zero.
	 *  - A `transform` SHORT-CIRCUITS the engine's unit handling
	 *    (sgs_responsive_format_atom_value:379-390) — `unit_default` is ignored
	 *    and the raw value never reaches sgs_responsive_sanitise_css_value(). So
	 *    the transform below must do BOTH itself: append the unit to a bare
	 *    number (a stored `24` would otherwise become the invalid, silently
	 *    dropped `calc(24 / 2)`) and sanitise before interpolating.
	 *
	 * @param string $selector Fully-formed, already-safe CSS selector for the shrunk state.
	 * @param mixed  $padding  The row's `padding` attribute ({desktop:{top,…},…}).
	 * @return string CSS text (no <style> wrapper); '' when the row has no vertical padding to reduce.
	 */
	function sgs_row_shrink_css( $selector, $padding ) {
		if ( ! is_array( $padding ) || ! function_exists( 'sgs_emit_responsive_css' ) ) {
			return '';
		}

		// Halve the row's OWN value in CSS rather than in PHP: the stored value
		// may legitimately be '2rem', '5%' or 'clamp(0.5rem,2vw,1.5rem)', none of
		// which can be halved by string arithmetic.
		$halve = static function ( $raw ) {
			if ( is_numeric( $raw ) ) {
				$raw = (string) ( 0 + $raw ) . 'px';
			}
			$clean = sgs_responsive_sanitise_css_value( (string) $raw );
			return '' === $clean ? null : 'calc(' . $clean . ' / 2)';
		};

		// Pull one side across the three tiers, leaving an absent tier as null so
		// the engine's own cascade fills it from the tier above.
		$side_across_tiers = static function ( $side ) use ( $padding ) {
			$out = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				$tier_val     = isset( $padding[ $tier ] ) && is_array( $padding[ $tier ] ) ? $padding[ $tier ] : array();
				$out[ $tier ] = array_key_exists( $side, $tier_val ) ? $tier_val[ $side ] : null;
			}
			return $out;
		};

		$specs = array();
		foreach ( array( 'top', 'bottom' ) as $side ) {
			$values = $side_across_tiers( $side );
			if ( null === $values['desktop'] && null === $values['tablet'] && null === $values['mobile'] ) {
				continue;
			}
			$specs[] = array(
				'value'     => $values,
				'css'       => 'padding-' . $side,
				'transform' => $halve,
			);
		}

		if ( empty( $specs ) ) {
			return '';
		}

		return sgs_emit_responsive_css( $selector, $specs, array( 'container' => false ) );
	}
}

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
