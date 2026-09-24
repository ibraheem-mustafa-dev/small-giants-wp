/**
 * SGS Trust Badges — "drop" overflow mode.
 *
 * When `overflowMode="drop"`, a badge that does not fit on the first visual row
 * is hidden with the native `hidden` attribute (never focusable, never read by
 * a screen reader) instead of being left to wrap onto a second line.
 *
 * Works identically for both the flex and grid `layout` modes, and at any
 * device width or column/gap combination, without forcing a specific CSS
 * layout: render.php already forces `flex-wrap: wrap` for a flex-layout block
 * in drop mode (grid already wraps rows on its own), so badges lay out onto
 * as many rows as they naturally need. This script then measures which
 * badges share the FIRST badge's row (same `top`) and hides everything that
 * landed on a later row — i.e. everything that would have wrapped.
 *
 * Ignored while auto-scroll is on (see `badgesFor()` below): the marquee
 * already keeps a single row by scrolling, so drop mode would have nothing
 * to do there.
 *
 * Re-measures on resize via ResizeObserver so narrowing the viewport drops
 * more badges and widening it brings previously-dropped badges back.
 *
 * Loaded as a viewScriptModule (ES module, frontend only — never runs in the
 * block editor); imported from view.js.
 */

/** Marks a badge this script hid, so a later re-measure knows to un-hide it first. */
const DROP_ATTR = 'data-sgs-overflow-dropped';

/**
 * The badges to measure for one trust-bar wrapper, or an empty list when drop
 * mode does not apply (auto-scroll wraps badges in `.sgs-trust-bar__track`
 * and handles overflow itself).
 *
 * @param {HTMLElement} wrapper The `.sgs-trust-bar[data-overflow-mode="drop"]` root.
 * @return {HTMLElement[]} Badge elements in document order.
 */
function badgesFor( wrapper ) {
	if ( wrapper.dataset.autoScroll === 'true' ) {
		return [];
	}
	return Array.from( wrapper.querySelectorAll( ':scope > .sgs-trust-bar__badge' ) );
}

/**
 * Un-hide any badge this script previously hid, then measure and hide
 * whichever badges landed on a row after the first.
 *
 * @param {HTMLElement} wrapper The trust-bar wrapper being laid out.
 */
function layOutDrop( wrapper ) {
	const badges = badgesFor( wrapper );
	if ( badges.length === 0 ) {
		return;
	}

	// Reset before measuring — otherwise a widened viewport could never bring
	// a previously-dropped badge back, since a hidden badge takes no layout
	// space and can't be re-measured into row one.
	badges.forEach( ( badge ) => {
		if ( badge.hasAttribute( DROP_ATTR ) ) {
			badge.removeAttribute( 'hidden' );
			badge.removeAttribute( DROP_ATTR );
		}
	} );

	// Always keep at least the first badge, however narrow the row is.
	const firstTop = Math.round( badges[ 0 ].getBoundingClientRect().top );

	badges.forEach( ( badge, index ) => {
		if ( index === 0 ) {
			return;
		}
		const top = Math.round( badge.getBoundingClientRect().top );
		if ( top > firstTop ) {
			badge.setAttribute( 'hidden', '' );
			badge.setAttribute( DROP_ATTR, '' );
		}
	} );
}

const dropWrappers = document.querySelectorAll( '.sgs-trust-bar[data-overflow-mode="drop"]' );

dropWrappers.forEach( ( wrapper ) => {
	layOutDrop( wrapper );

	if ( 'ResizeObserver' in window ) {
		const observer = new ResizeObserver( () => layOutDrop( wrapper ) );
		observer.observe( wrapper );
	} else {
		// Older browsers without ResizeObserver: re-measure on window resize only.
		window.addEventListener( 'resize', () => layOutDrop( wrapper ) );
	}
} );
