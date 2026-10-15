/**
 * Tier G effect: the layout a horizontal-panel section measures (Spec 38 FR-38-8).
 *
 * The pinned element's row lives in a child carrying `data-sgs-fx-track`; its laid-out children are the panels.
 * Everything here reads layout boxes (`offsetLeft`, `offsetWidth`), which ignore the GSAP transform on the track,
 * so each measurement stays correct on every `invalidateOnRefresh` recompute mid-pin. Exports functions only.
 *
 * @package
 */

/**
 * Resolve the track element whose horizontal position gets tweened.
 *
 * The marked element is `.sgs-container__inner`, which wraps the block's InnerBlocks content wrapper, so it always
 * has exactly ONE child: translating it moved a row holding a single shrink-to-content item (measured 96px against
 * a 1200px container), so travel was zero and the effect did nothing. The element to translate is therefore the
 * marked element's `.wp-block-sgs-container` wrapper, falling back to the marked element itself for a block whose
 * content is not wrapped (`sgs/timeline` marks its `<ol>`, whose children are the panels).
 *
 * @param {HTMLElement} el The pinned panel container.
 * @return {HTMLElement|null} The track element, or null when the wrapper emitted no mark (the CSS scroll-snap
 *                            fallback then stays the only behaviour rather than translating a guessed element).
 */
export function resolveTrack( el ) {
	const marked = el.querySelector( ':scope > [data-sgs-fx-track]' );
	if ( ! marked ) {
		return null;
	}
	return marked.querySelector( ':scope > .wp-block-sgs-container' ) || marked;
}

/**
 * The laid-out panels of a track. Laid-out ELEMENTS only: Spec 32's no-inline contract has each styled container
 * prepend a scoped `<style>` as a preceding sibling, which the live frontend lifts out at `render_block` p99 but the
 * editor canvas does not, and `panels[ 0 ]` would otherwise be a `display:none` node whose `offsetLeft` is 0.
 *
 * @param {HTMLElement} track The row.
 * @return {HTMLElement[]} The panels, in document order.
 */
export function layoutPanels( track ) {
	return Array.from( track.children ).filter(
		( node ) =>
			node.nodeType === 1 &&
			( node.offsetWidth > 0 || null !== node.offsetParent )
	);
}

/**
 * How far the row travels, in pixels.
 *
 * NEVER DERIVE THIS BY SUBTRACTING ONE WIDTH FROM ANOTHER: every candidate width (host, band, track, scrollWidth)
 * silently carries padding, gaps or a content band, so each subtraction landed short by the amount hidden in the
 * operand (`track.clientWidth` computes 0 on a `width: max-content` track and kills the effect; `scrollWidth -
 * clientWidth` is 100px short on the shipped default).
 *
 * THE REQUIREMENT (Bean, 2026-07-30): at the end of the pin the LAST panel's left edge sits where the FIRST panel's
 * left edge sat before any travel. Translating the track by -T moves every panel left by T, so T = last.offsetLeft
 * - first.offsetLeft, both measured in the same offsetParent so band padding, flex gap and any whole-row offset
 * cancel. The `max()` is a reachability FLOOR, not a cap: an oversized `--sgs-fx-panel-width` would otherwise leave
 * part of the last panel off-screen, so the row always travels at least far enough to bring the last panel's right
 * edge to the host's right edge.
 *
 * @param {HTMLElement} el    The pinned panel container.
 * @param {HTMLElement} track The row.
 * @return {number} Pixels; 0 when there is no first-to-last distance (fewer than two panels, or panels that do not
 *                  share an offsetParent, where `offsetLeft` values are not comparable), which leaves the CSS
 *                  scroll-snap fallback as the only behaviour.
 */
export function travelDistance( el, track ) {
	const panels = layoutPanels( track );
	if ( panels.length < 2 ) {
		return 0;
	}
	const first = panels[ 0 ];
	const last = panels[ panels.length - 1 ];
	if ( first.offsetParent !== last.offsetParent ) {
		return 0;
	}
	const ideal = last.offsetLeft - first.offsetLeft;
	const flushRight = last.offsetLeft + last.offsetWidth - el.clientWidth;
	return Math.max( 0, ideal, flushRight );
}
