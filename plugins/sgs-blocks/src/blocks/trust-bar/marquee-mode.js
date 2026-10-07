/**
 * SGS Trust Badges — is the marquee running at the current viewport?
 *
 * One answer shared by view.js (clone and animate) and overflow-drop.js (hide
 * what does not fit), so the two never act on the same width: while the
 * marquee runs every badge stays in the scrolling track; once it is inert the
 * "drop" overflow mode applies.
 */

/**
 * The marquee media query for a wrapper: the viewport range in which the
 * marquee runs. Null when it runs at every width (`autoScrollBelow` 0).
 *
 * @param {HTMLElement} wrapper The `.sgs-trust-bar` root.
 * @return {MediaQueryList|null} The query, or null for "every width".
 */
export function marqueeRangeQuery( wrapper ) {
	const below = parseInt( wrapper.dataset.autoScrollBelow || '0', 10 ) || 0;
	return below > 0 ? window.matchMedia( `(max-width: ${ below - 1 }px)` ) : null;
}

/**
 * Whether the marquee is running for this wrapper right now: auto-scroll on,
 * motion allowed, and the viewport inside the marquee range.
 *
 * @param {HTMLElement} wrapper The `.sgs-trust-bar` root.
 * @return {boolean} True while badges scroll.
 */
export function isMarqueeActive( wrapper ) {
	if ( wrapper.dataset.autoScroll !== 'true' ) {
		return false;
	}
	if ( window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
		return false;
	}
	const query = marqueeRangeQuery( wrapper );
	return query === null || query.matches;
}
