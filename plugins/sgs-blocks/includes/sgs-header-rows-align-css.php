<?php
/**
 * D-1: rows vertical alignment — scoped CSS emission for sgs/site-header.
 *
 * The header renders its rows (sgs/site-header-row children) directly into
 * its own outer element in the common case (no content band), so a
 * `minHeight` taller than the rows' own combined height otherwise leaves them
 * pinned to the top under plain `display:block` (measured live: a 50px header
 * with one 43px row rendered the logo/burger 7px/3px tall, top-aligned,
 * against a reference where both sit centred, 7px from the pill's top).
 *
 * Makes the header's own OUTER element a column flex container and resolves
 * the vertical position directly on this block's own scoped selector — the
 * shared SGS_Container_Wrapper min-height-flex-fill mechanism
 * (class-sgs-container-wrapper.php, $sgs_min_height_flex_fill) is gated on a
 * content band existing, which a plain header rarely has, so it does not fire
 * here; this file is the header's own equivalent for its own structure.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';

if ( ! function_exists( 'sgs_header_rows_align_css' ) ) {
	/**
	 * Emit the per-tier rows-alignment CSS for one header instance.
	 *
	 * Default 'center' — via sgs_emit_tier_rules_map()'s $default param — so a
	 * header with `rowsAlign` untouched (or a tier left on 'inherit') already
	 * paints centred rows, matching what any flex/grid layout tool defaults
	 * to: the framework is pre-production, so the merit-based default is
	 * chosen outright rather than preserving the old top-aligned behaviour.
	 *
	 * 'stretch' cannot use `justify-content:stretch` (that CSS Box Alignment
	 * value only applies to grid in current browsers, not flexbox) — instead
	 * the rows themselves (the outer's direct children) are grown to fill the
	 * extra height via a `flex:1 1 auto` rule on the ` > *` selector, emitted
	 * as its own tier-resolved rule so a tier that is NOT 'stretch' actively
	 * cancels the grow rather than inheriting a wider tier's rule.
	 *
	 * @param string $root_sel   The header's uid-scoped selector.
	 * @param array  $attributes Block attributes.
	 * @return string CSS text, no <style> wrapper.
	 */
	function sgs_header_rows_align_css( string $root_sel, array $attributes ): string {
		$raw = isset( $attributes['rowsAlign'] ) ? $attributes['rowsAlign'] : array();

		$css = sgs_emit_tier_rules_map(
			$root_sel,
			$raw,
			array(
				'start'   => 'display:flex;flex-direction:column;justify-content:flex-start;',
				'center'  => 'display:flex;flex-direction:column;justify-content:center;',
				'end'     => 'display:flex;flex-direction:column;justify-content:flex-end;',
				'stretch' => 'display:flex;flex-direction:column;',
			),
			'',
			'center'
		);

		// The child grow rule for 'stretch' — a SEPARATE selector, so it needs
		// its own tier-resolved call rather than trying to fold two selectors
		// into one map entry. Explicit cancel (never '') on every other value:
		// a narrower tier reverting from 'stretch' to 'center' must actively
		// undo the grow, or it would keep inheriting the wider tier's rule.
		$css .= sgs_emit_tier_rules_map(
			$root_sel . ' > *',
			$raw,
			array( 'stretch' => 'flex:1 1 auto;min-height:0;' ),
			'flex:0 1 auto;min-height:auto;',
			'center'
		);

		// Each row stays full width, as a block row is outside a flex column. A row with a width cap
		// carries centring auto margins, and in a column flex container auto margins cancel the stretch:
		// the row shrank to its content, which `container-type: inline-size` makes zero (a capped
		// middle row measured 56px). Zero specificity, so a row's own width setting still wins and its
		// max-width still caps it.
		$css .= ':where(' . $root_sel . ' > *){width:100%;}';

		return $css;
	}
}
