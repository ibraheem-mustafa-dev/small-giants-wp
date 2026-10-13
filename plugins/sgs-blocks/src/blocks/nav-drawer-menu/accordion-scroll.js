/**
 * Scroll an opened accordion row into view (`accordionScrollIntoView`; the
 * bar carries `data-sgs-accordion-scroll` when it is on).
 *
 * When a row's `<details>` opens, this waits for the row's expand to finish
 * (every running animation and transition inside the row), then, if the row's
 * top is above the visible area or below its top 40%, scrolls the nearest
 * scrolling ancestor (the drawer, or its body when the top row is pinned) so
 * the row sits at the top, less the row's own `scroll-margin-top`. Smooth
 * scrolling, instant under prefers-reduced-motion. Closing a row does nothing.
 *
 * @package SGS\Blocks
 */

/** How far down the visible area an opened row may sit before it is scrolled up. */
const VISIBLE_FRACTION = 0.4;

/**
 * The nearest ancestor that actually scrolls vertically.
 *
 * @param {HTMLElement} el Start element.
 * @return {HTMLElement|null} The scrolling ancestor, or null.
 */
function scrollParent( el ) {
	for ( let node = el.parentElement; node; node = node.parentElement ) {
		const overflow = window.getComputedStyle( node ).overflowY;
		if ( ( 'auto' === overflow || 'scroll' === overflow ) && node.scrollHeight > node.clientHeight ) {
			return node;
		}
	}
	return null;
}

/**
 * Resolve once every animation and transition inside the row has finished.
 *
 * @param {HTMLElement} row The row.
 * @return {Promise<void>} Settles after the expand.
 */
function expandSettled( row ) {
	return new Promise( ( resolve ) => {
		// One frame first, so transitions started by the `open` change exist.
		window.requestAnimationFrame( () => {
			const running = typeof row.getAnimations === 'function' ? row.getAnimations( { subtree: true } ) : [];
			const finite = running.filter( ( anim ) => Number.isFinite( anim.effect?.getComputedTiming?.().endTime ) );
			Promise.all( finite.map( ( anim ) => anim.finished.catch( () => null ) ) ).then( () => resolve() );
		} );
	} );
}

/**
 * Scroll the row near the top of its scrolling area when it is out of the top 40%.
 *
 * @param {HTMLElement} row The opened row.
 */
function bringIntoView( row ) {
	const scroller = scrollParent( row );
	if ( ! scroller ) {
		return;
	}
	const margin = parseFloat( window.getComputedStyle( row ).scrollMarginTop ) || 0;
	const top = Math.max(
		0,
		row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - margin
	);
	if ( top >= scroller.scrollTop && top <= scroller.scrollTop + scroller.clientHeight * VISIBLE_FRACTION ) {
		return;
	}
	const reduce = window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;
	scroller.scrollTo( { top, behavior: reduce ? 'auto' : 'smooth' } );
}

/**
 * Wire one bar. `toggle` does not bubble, so it is caught in the capture phase.
 *
 * @param {HTMLElement} bar The `.sgs-nav-drawer-menu__bar`.
 * @return {Function} Cleanup.
 */
export function initAccordionScroll( bar ) {
	const onToggle = ( event ) => {
		const details = event.target;
		if ( ! details || 'DETAILS' !== details.tagName || ! details.open || ! bar.contains( details ) ) {
			return;
		}
		const row = details.closest( '.sgs-nav-drawer-menu__item' ) || details;
		expandSettled( row ).then( () => {
			if ( details.open ) {
				bringIntoView( row );
			}
		} );
	};
	bar.addEventListener( 'toggle', onToggle, true );
	return () => bar.removeEventListener( 'toggle', onToggle, true );
}
