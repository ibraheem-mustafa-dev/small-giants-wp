/**
 * @sgs/time-text — "Text by time of day" in the visitor's browser (Spec 02 FR-2-14).
 *
 * Plain ES module. The server (includes/time-text.php) prints the block's
 * fallback words and puts the ranges on the element holding them as
 * `data-sgs-time-text` (JSON) with an optional `data-sgs-time-zone`; this
 * module swaps only that element's words for the range covering the current
 * hour, so the page cache stays on. Nothing moves focus or announces: the
 * element carries no live region. An hour no range covers shows the server's
 * words. The words are checked again at the top of each hour.
 */
import { hourIn, rangeFor } from './time-text-range';

const SELECTOR = '[data-sgs-time-text]';
const served = new WeakMap();

/**
 * Show the words for the current hour on one element.
 *
 * @param {HTMLElement} el  An element carrying `data-sgs-time-text`.
 * @param {Date}        now The current moment.
 */
function apply( el, now ) {
	if ( ! served.has( el ) ) {
		served.set(
			el,
			[ ...el.childNodes ].map( ( n ) => n.cloneNode( true ) )
		);
	}
	let list = [];
	try {
		list = JSON.parse( el.getAttribute( 'data-sgs-time-text' ) || '[]' );
	} catch ( e ) {
		return;
	}
	const range = rangeFor(
		list,
		hourIn( now, el.getAttribute( 'data-sgs-time-zone' ) || '' )
	);
	if ( range ) {
		if ( el.textContent !== range.text ) {
			el.textContent = range.text;
		}
	} else {
		el.replaceChildren(
			...served.get( el ).map( ( n ) => n.cloneNode( true ) )
		);
	}
}

/**
 * Swap every time-of-day element on the page, then again at the next hour.
 */
function run() {
	const now = new Date();
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => apply( el, now ) );
	const next = new Date( now.getTime() );
	next.setMinutes( 60, 1, 0 );
	setTimeout( run, next.getTime() - now.getTime() );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', run, { once: true } );
} else {
	run();
}
