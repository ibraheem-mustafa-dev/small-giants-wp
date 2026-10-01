/**
 * Separators — the runtime overlay for browsers without CSS gap decorations.
 *
 * Where `CSS.supports( 'row-rule-style', 'solid' )` is true the page already draws
 * the lines natively and this does nothing. Elsewhere it paints each list's lines
 * as absolutely positioned elements inside one overlay child, from the measured
 * item boxes (geometry.js). The overlay takes no space and no pointer events, and
 * is repainted when the list or its items change size and when items are added or
 * removed. The thickness, style and colour come from the list's own custom
 * properties (`--sgs-sep-w-*`, `--sgs-sep-s-*`, `--sgs-sep-c-*`), so the per-device
 * values and the palette are resolved by CSS, not here. Without script a list shows
 * spacing only.
 *
 * @package SGS\Blocks
 */

import { separatorSegments } from './geometry';

const OVERLAY_CLASS = 'sgs-sep-overlay';
const LINE_CLASS = 'sgs-sep-line';

/**
 * Whether this browser draws gap decorations itself.
 *
 * @return {boolean} True when native decorations are available.
 */
export function supportsGapDecorations() {
	return typeof CSS !== 'undefined' && CSS.supports( 'row-rule-style', 'solid' );
}

/**
 * Whether an axis currently has a line: its thickness resolves to more than zero
 * at this device width. Measured on a throwaway line so `calc()` and `var()` work.
 *
 * @param {HTMLElement} overlay The overlay.
 * @param {string}      axis    'column' or 'row'.
 * @return {boolean} True when the axis draws.
 */
function axisDraws( overlay, axis ) {
	const probe = document.createElement( 'div' );
	probe.className = `${ LINE_CLASS } ${ LINE_CLASS }--${ axis }`;
	overlay.appendChild( probe );
	const cs = getComputedStyle( probe );
	const width = parseFloat( 'column' === axis ? cs.borderLeftWidth : cs.borderTopWidth );
	probe.remove();
	return width > 0;
}

/**
 * The boxes of a list's in-flow items, relative to the list's padding box
 * (including how far the list is scrolled).
 *
 * @param {HTMLElement} list    The list.
 * @param {HTMLElement} overlay The overlay (skipped).
 * @return {Array<{left:number,top:number,right:number,bottom:number}>} Boxes.
 */
function itemBoxes( list, overlay ) {
	const origin = list.getBoundingClientRect();
	const x0 = origin.left + list.clientLeft - list.scrollLeft;
	const y0 = origin.top + list.clientTop - list.scrollTop;
	const boxes = [];
	for ( const el of list.children ) {
		if ( el === overlay ) {
			continue;
		}
		const cs = getComputedStyle( el );
		if ( 'none' === cs.display || 'absolute' === cs.position || 'fixed' === cs.position ) {
			continue;
		}
		const r = el.getBoundingClientRect();
		if ( r.width > 0 && r.height > 0 ) {
			boxes.push( { left: r.left - x0, top: r.top - y0, right: r.right - x0, bottom: r.bottom - y0 } );
		}
	}
	return boxes;
}

/**
 * Build one line element.
 *
 * @param {string} axis 'column' (vertical) or 'row' (horizontal).
 * @param {Object} seg  Segment { at, from, to }.
 * @return {HTMLElement} The line.
 */
function buildLine( axis, seg ) {
	const line = document.createElement( 'div' );
	line.className = `${ LINE_CLASS } ${ LINE_CLASS }--${ axis }`;
	if ( 'column' === axis ) {
		line.style.cssText = `left:${ seg.at }px;top:${ seg.from }px;height:${ seg.to - seg.from }px;width:0;transform:translateX(-50%);`;
	} else {
		line.style.cssText = `top:${ seg.at }px;left:${ seg.from }px;width:${ seg.to - seg.from }px;height:0;transform:translateY(-50%);`;
	}
	return line;
}

/**
 * Paint a list's lines.
 *
 * @param {HTMLElement} list    The list element.
 * @param {HTMLElement} overlay The list's overlay.
 */
function paint( list, overlay ) {
	const axes = { column: axisDraws( overlay, 'column' ), row: axisDraws( overlay, 'row' ) };
	const segments = separatorSegments( axes.column || axes.row ? itemBoxes( list, overlay ) : [], axes );
	const lines = [];
	for ( const axis of [ 'column', 'row' ] ) {
		segments[ axis ].forEach( ( seg ) => lines.push( buildLine( axis, seg ) ) );
	}
	overlay.replaceChildren( ...lines );
}

/**
 * Start drawing a list's lines, where the browser does not do it natively.
 *
 * @param {HTMLElement} list The list element (the grid / flex element).
 * @return {Function} Stops drawing and removes the overlay.
 */
export function initSeparatorList( list ) {
	if ( supportsGapDecorations() ) {
		return () => {};
	}
	if ( 'static' === getComputedStyle( list ).position ) {
		list.classList.add( 'sgs-sep-anchored' );
	}
	// A list may only hold list items, so an overlay inside a <ul>/<ol> is an inert <li>.
	const inList = /^(UL|OL)$/.test( list.tagName );
	const overlay = document.createElement( inList ? 'li' : 'div' );
	overlay.className = OVERLAY_CLASS;
	overlay.setAttribute( 'aria-hidden', 'true' );
	if ( inList ) {
		overlay.setAttribute( 'role', 'presentation' );
	}
	list.appendChild( overlay );

	let frame = 0;
	const schedule = () => {
		cancelAnimationFrame( frame );
		frame = requestAnimationFrame( () => paint( list, overlay ) );
	};
	const resize = new ResizeObserver( schedule );
	const watchItems = () => {
		resize.disconnect();
		resize.observe( list );
		for ( const el of list.children ) {
			if ( el !== overlay ) {
				resize.observe( el );
			}
		}
	};
	const mutations = new MutationObserver( ( records ) => {
		if ( records.some( ( r ) => [ ...r.addedNodes, ...r.removedNodes ].some( ( n ) => n !== overlay ) ) ) {
			watchItems();
			schedule();
		}
	} );
	mutations.observe( list, { childList: true } );
	watchItems();
	schedule();
	if ( document.fonts && document.fonts.ready ) {
		document.fonts.ready.then( schedule );
	}
	window.addEventListener( 'load', schedule );

	return () => {
		cancelAnimationFrame( frame );
		resize.disconnect();
		mutations.disconnect();
		window.removeEventListener( 'load', schedule );
		overlay.remove();
	};
}
