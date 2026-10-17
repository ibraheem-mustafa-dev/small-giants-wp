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
 * Coexists with the marquee effect: while the marquee runs (the shared runtime marks the
 * root `data-sgs-marquee="on"`) nothing is hidden, every badge is in the scrolling track.
 * Once the marquee is inert (outside its breakpoint range, reduced motion, or switched
 * off for the device) the badges sit in the original track, which is `display: contents`
 * there, and this script drops the ones that do not fit. The marquee marking changing in
 * either direction restores hidden badges first and re-measures.
 *
 * Re-measures on resize via ResizeObserver so narrowing the viewport drops
 * more badges and widening it brings previously-dropped badges back.
 *
 * Loaded as a viewScriptModule (ES module, frontend only — never runs in the
 * block editor); imported from view.js.
 */

/**
 * Whether the shared marquee runtime is running this wrapper right now.
 *
 * @param {HTMLElement} wrapper The `.sgs-trust-bar` root.
 * @return {boolean} True while badges scroll.
 */
function isMarqueeActive( wrapper ) {
	return wrapper.getAttribute( 'data-sgs-marquee' ) === 'on';
}

/** Marks a badge this script hid, so a later re-measure knows to un-hide it first. */
const DROP_ATTR = 'data-sgs-overflow-dropped';

/**
 * The badges to measure for one trust-bar wrapper: the original badges only
 * (inside the original track when a marquee is stored, never the marquee clones).
 *
 * @param {HTMLElement} wrapper The `.sgs-trust-bar[data-overflow-mode="drop"]` root.
 * @return {HTMLElement[]} Badge elements in document order.
 */
function badgesFor( wrapper ) {
	const track = wrapper.querySelector( '.sgs-trust-bar__track:not([data-sgs-marquee-clone])' );
	const scope = track || wrapper;
	return Array.from( scope.querySelectorAll( ':scope > .sgs-trust-bar__badge' ) );
}

/**
 * Bring back every badge this script hid.
 *
 * @param {HTMLElement} wrapper The trust-bar wrapper.
 */
export function restoreDropped( wrapper ) {
	wrapper.querySelectorAll( `[${ DROP_ATTR }]` ).forEach( ( badge ) => {
		badge.removeAttribute( 'hidden' );
		badge.removeAttribute( DROP_ATTR );
	} );
}

/**
 * Un-hide any badge this script previously hid, then measure and hide
 * whichever badges landed on a row after the first.
 *
 * @param {HTMLElement} wrapper The trust-bar wrapper being laid out.
 */
function layOutDrop( wrapper ) {
	// The marquee shows every badge; drop only applies once it is inert.
	if ( isMarqueeActive( wrapper ) ) {
		restoreDropped( wrapper );
		return;
	}

	const badges = badgesFor( wrapper );
	if ( badges.length === 0 ) {
		return;
	}

	// Reset before measuring — otherwise a widened viewport could never bring
	// a previously-dropped badge back, since a hidden badge takes no layout
	// space and can't be re-measured into row one.
	restoreDropped( wrapper );

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

	// The marquee runtime starts, stops and re-starts after this script loads (breakpoint
	// range, reduced motion, per-device off), changing the layout without always changing the
	// wrapper's size, so re-run when its marking changes.
	new MutationObserver( () => layOutDrop( wrapper ) ).observe( wrapper, {
		attributes: true,
		attributeFilter: [ 'data-sgs-marquee' ],
	} );

	if ( 'ResizeObserver' in window ) {
		const observer = new ResizeObserver( () => layOutDrop( wrapper ) );
		observer.observe( wrapper );
	} else {
		// Older browsers without ResizeObserver: re-measure on window resize only.
		window.addEventListener( 'resize', () => layOutDrop( wrapper ) );
	}
} );
