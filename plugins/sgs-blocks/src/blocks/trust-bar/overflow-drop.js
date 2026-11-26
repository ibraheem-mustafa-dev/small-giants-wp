/**
 * SGS Trust Badges — "drop" overflow mode.
 *
 * When `overflowMode="drop"`, a badge that does not fit on the first visual row
 * is hidden with the native `hidden` attribute (never focusable, never read by
 * a screen reader) instead of being left to wrap onto a second line.
 *
 * A row (flex) lays the badges onto as many lines as they need (render.php
 * forces `flex-wrap: wrap` in drop mode), so this script measures which badges
 * share the FIRST badge's line (same `top`) and hides everything that landed on
 * a later line, i.e. everything that would have wrapped.
 *
 * A grid wraps by design: its Columns count puts a fifth badge on a second row
 * with room to spare, and that badge fits. So in a grid only REAL overflow is
 * dropped: a badge whose far edge passes the content edge of the grid (its
 * columns are wider than the bar). Rows of an equal-column grid never hide.
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

/** Marks a badge (or a separator beside one) this script hid, so a later re-measure knows to un-hide it first. */
const DROP_ATTR = 'data-sgs-overflow-dropped';

/**
 * DROP_ATTR's value for a badge a grid dropped: hidden by style.css with `visibility`, not removed, so it keeps its cell.
 * Hiding it would let the badges after it move back a cell, and one of them would land in the column that overflows.
 * `inert` and `aria-hidden` take it out of the tab order and of what a screen reader reads, as `hidden` does for a row.
 */
const KEEP_CELL = 'keep';

/**
 * The badges to measure for one trust-bar wrapper: the original badges only
 * (inside the original track when a marquee is stored, never the marquee clones).
 *
 * @param {HTMLElement} wrapper The `.sgs-trust-bar[data-overflow-mode="drop"]` root.
 * @return {HTMLElement[]} Badge elements in document order.
 */
function badgesFor( wrapper ) {
	const track = wrapper.querySelector(
		'.sgs-trust-bar__track:not([data-sgs-marquee-clone])'
	);
	const scope = track || wrapper;
	return Array.from(
		scope.querySelectorAll( ':scope > .sgs-trust-bar__badge' )
	);
}

/**
 * The element that lays the badges out as a grid, when one does: the root, or the content band the wrapper moves the
 * layout onto.
 *
 * @param {HTMLElement} wrapper The `.sgs-trust-bar` root.
 * @return {HTMLElement|null} The grid box; null for a row layout.
 */
function gridBoxFor( wrapper ) {
	return (
		[
			wrapper,
			wrapper.querySelector( ':scope > .sgs-container__inner' ),
		].find(
			( el ) => el && 'grid' === window.getComputedStyle( el ).display
		) || null
	);
}

/**
 * Whether a badge's far edge passes the content edge of its grid by more than a pixel (the start edge, in a
 * right-to-left bar).
 *
 * @param {HTMLElement} badge The badge.
 * @param {HTMLElement} grid  The grid box.
 * @return {boolean} True when the badge overflows.
 */
function passesGridEdge( badge, grid ) {
	const box = grid.getBoundingClientRect();
	const style = window.getComputedStyle( grid );
	const rect = badge.getBoundingClientRect();
	if ( 'rtl' === style.direction ) {
		const left =
			box.left +
			( parseFloat( style.paddingLeft ) || 0 ) +
			( parseFloat( style.borderLeftWidth ) || 0 );
		return rect.left < left - 1;
	}
	const right =
		box.right -
		( parseFloat( style.paddingRight ) || 0 ) -
		( parseFloat( style.borderRightWidth ) || 0 );
	return rect.right > right + 1;
}

/**
 * Bring back every badge (and separator) this script hid.
 *
 * @param {HTMLElement} wrapper The trust-bar wrapper.
 */
export function restoreDropped( wrapper ) {
	wrapper.querySelectorAll( `[${ DROP_ATTR }]` ).forEach( ( badge ) => {
		badge.removeAttribute( 'hidden' );
		if ( KEEP_CELL === badge.getAttribute( DROP_ATTR ) ) {
			badge.removeAttribute( 'inert' );
			badge.removeAttribute( 'aria-hidden' );
		}
		badge.removeAttribute( DROP_ATTR );
	} );
}

/**
 * Un-hide any badge this script previously hid, then measure and hide
 * whichever badges landed on a row after the first.
 *
 * @param {HTMLElement} wrapper The trust-bar wrapper being laid out.
 */
export function layOutDrop( wrapper ) {
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
	const grid = gridBoxFor( wrapper );

	// Every badge is measured before any is hidden: a hidden badge frees its cell, and the next one would move into it.
	const overflowing = badges.map( ( badge, index ) => {
		if ( index === 0 ) {
			return false;
		}
		return grid
			? passesGridEdge( badge, grid )
			: Math.round( badge.getBoundingClientRect().top ) > firstTop;
	} );

	badges.forEach( ( badge, index ) => {
		if ( ! overflowing[ index ] ) {
			return;
		}
		if ( grid ) {
			badge.setAttribute( DROP_ATTR, KEEP_CELL );
			badge.setAttribute( 'inert', '' );
			badge.setAttribute( 'aria-hidden', 'true' );
			return;
		}
		// A separator glyph beside a dropped badge goes with it, so the last visible badge does not end on one.
		[
			badge,
			badge.previousElementSibling,
			badge.nextElementSibling,
		].forEach( ( el ) => {
			if (
				el === badge ||
				el?.classList.contains( 'sgs-trust-bar__separator' )
			) {
				el.setAttribute( 'hidden', '' );
				el.setAttribute( DROP_ATTR, '' );
			}
		} );
	} );

	// A grid prints each separator inside its badge: a badge shown beside one that was dropped has nothing to its right.
	if ( grid ) {
		badges.forEach( ( badge, index ) => {
			if ( overflowing[ index ] || ! overflowing[ index + 1 ] ) {
				return;
			}
			const cell = badge.querySelector(
				':scope > .sgs-trust-bar__separator--cell'
			);
			cell?.setAttribute( 'hidden', '' );
			cell?.setAttribute( DROP_ATTR, '' );
		} );
	}
}

const dropWrappers = document.querySelectorAll(
	'.sgs-trust-bar[data-overflow-mode="drop"]'
);

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
