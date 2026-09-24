<?php
/**
 * SGS Card Grid — block-wide image overlay (overlay) helper.
 *
 * Split out of render.php (already well over the 300-line file-length
 * guidance) rather than growing it further — same reasoning as this block's
 * own glyph-fallback.php.
 *
 * A colour or gradient overlay painted between a card's photo and its
 * glyph/title text, so light text and a glyph stay legible over the photo —
 * the Eye Care "Shop by shape" tiles gap (wave B round 2): the draft's own
 * tile paints `linear-gradient(180deg,rgba(20,20,20,0) 38%,rgba(20,20,20,.72) 100%)`
 * over the photo, and nothing over the flat fallback tile. Block-wide, one
 * treatment for every card (same scope as glyphColour/glyphSize), off by
 * default.
 *
 * Reuses the shared `sgs_overlay_decls()` primitive (includes/helpers-tokens.php)
 * — the SAME value primitive sgs/media's overlay atom and
 * class-sgs-container-wrapper.php's own overlay already call, so a palette
 * colour slug/raw CSS colour with alpha, or a gradient (gradient always wins
 * over colour, per that helper's contract), resolve identically to every
 * other overlay surface in the framework. No second overlay system.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_card_grid_image_overlay_decls' ) ) {
	/**
	 * The overlay's CSS declarations for this instance, or '' when neither a
	 * colour nor a gradient is set — the overlay <div> is never rendered in
	 * that case (see render.php's `$card_grid_overlay_active`), keeping
	 * existing pages byte-identical with this attribute unset.
	 *
	 * @param string $colour     Palette slug or raw CSS colour, or ''.
	 * @param string $gradient   Complete CSS gradient string, or ''.
	 * @param mixed  $opacity    0-100 percentage, or null/'' for none.
	 * @param string $blend_mode CSS mix-blend-mode keyword, or ''/'normal' for none.
	 * @return string Declarations joined by `;`, no trailing semicolon (e.g.
	 *                `background-image:linear-gradient(...);opacity:0.72`), or ''.
	 */
	function sgs_card_grid_image_overlay_decls( string $colour, string $gradient, $opacity, string $blend_mode ): string {
		return sgs_overlay_decls( $colour, $gradient, $opacity, $blend_mode );
	}
}

if ( ! function_exists( 'sgs_card_grid_image_overlay_css' ) ) {
	/**
	 * Scoped `.sgs-card-grid__image-overlay` rule for this instance.
	 *
	 * @param string $root_sel This instance's scoped root selector.
	 * @param string $decls    Output of sgs_card_grid_image_overlay_decls(), already
	 *                         computed once by the caller.
	 * @return string CSS, ready to append to the block's own accumulated
	 *                `<style>` string, or '' when $decls is empty.
	 */
	function sgs_card_grid_image_overlay_css( string $root_sel, string $decls ): string {
		if ( '' === $decls ) {
			return '';
		}

		return $root_sel . ' .sgs-card-grid__image-overlay{' . $decls . '}';
	}
}
