/**
 * SGS motion — scroll progress boot module (Spec 38A FR-38A-36). Tier V.
 *
 * The `@sgs/fx-scroll-progress` script module the PHP motion registry enqueues
 * when a page renders a block carrying `data-sgs-fx="scroll-progress"`. It
 * hands each marked element to the shared scroll driver (`@sgs/scroll-driver`,
 * the single writer of `--sgs-scroll-progress`) or, for a pinned section, reads
 * the progress the pin runtime writes.
 *
 * Attributes (all optional; the defaults are page, bar-x, percent):
 *  - `data-sgs-fx-scroll-progress-source`: `page`, `section` or `pin`.
 *  - `data-sgs-fx-scroll-progress-output`: `bar-x`, `bar-y` or `counter`.
 *  - `data-sgs-fx-scroll-progress-counter-format`: `index-of-total`,
 *    `padded-index-of-total` or `percent`.
 *
 * Sources:
 *  - page: the driver measures the document scroll.
 *  - section: the driver measures the element's section (see scroll-driver.js).
 *  - pin: the nearest `[data-sgs-fx~="horizontal-panel"]` ancestor carries
 *    `--sgs-fx-progress` (0 to 1, written by its GSAP runtime), which inherits
 *    to a bar, so a bar needs no JavaScript here. A pin counter reads that
 *    value in a passive scroll listener batched with requestAnimationFrame, and
 *    the panel count from the pin's `data-sgs-fx-progress-total`. With no pin
 *    ancestor the element falls back to the page source, and its source
 *    attribute is rewritten to `page` so the stylesheet reads the driver value.
 *
 * Counter text goes into the element's textContent; no live region is added, so
 * assistive technology is not interrupted on every scroll step. Index formats
 * need a panel total, which only a pin provides; on a page or section source
 * they render as percent. Index = min(total, floor(progress * total) + 1), so
 * progress 1 shows the total. The padded format pads both numbers to the width
 * of the total, minimum two digits.
 *
 * Progress is information, so it keeps tracking under reduced motion
 * (`information: true` on the driver).
 *
 * @package
 */

// eslint-disable-next-line import/no-unresolved -- a webpack external (script module `@sgs/scroll-driver`).
import { observe, unobserve } from '@sgs/scroll-driver';

const SELECTOR = '[data-sgs-fx~="scroll-progress"]';
const PIN_SELECTOR = '[data-sgs-fx~="horizontal-panel"]';
const PREFIX = 'data-sgs-fx-scroll-progress-';

const SOURCES = [ 'page', 'section', 'pin' ];
const OUTPUTS = [ 'bar-x', 'bar-y', 'counter' ];
const FORMATS = [ 'index-of-total', 'padded-index-of-total', 'percent' ];

/** Pin counters driven by the shared scroll listener. */
let pinCounters = [];
/** Elements handed to the driver, for teardown. */
let driven = [];
let frame = 0;
let listening = false;

function choose( el, name, allowed, fallback ) {
	const value = el.getAttribute( PREFIX + name );
	return allowed.includes( value ) ? value : fallback;
}

function clamp( value ) {
	return Number.isFinite( value ) ? Math.min( 1, Math.max( 0, value ) ) : 0;
}

/**
 * Counter text for a progress value.
 *
 * @param {number}      progress 0 to 1.
 * @param {string}      format   Counter format.
 * @param {number|null} total    Panel count, or null when the source has none.
 * @return {string} The text to display.
 */
export function formatCounter( progress, format, total ) {
	const value = clamp( progress );
	if ( 'percent' === format || ! total || total < 1 ) {
		return Math.round( value * 100 ) + '%';
	}
	const index = Math.min( total, Math.floor( value * total ) + 1 );
	if ( 'padded-index-of-total' === format ) {
		const width = Math.max( 2, String( total ).length );
		return (
			String( index ).padStart( width, '0' ) +
			' / ' +
			String( total ).padStart( width, '0' )
		);
	}
	return index + ' / ' + total;
}

function setText( el, text ) {
	if ( el.textContent !== text ) {
		el.textContent = text;
	}
}

function readPinProgress( pin ) {
	const raw = window
		.getComputedStyle( pin )
		.getPropertyValue( '--sgs-fx-progress' );
	return clamp( parseFloat( raw ) );
}

function readTotal( pin ) {
	const total = parseInt(
		pin.getAttribute( 'data-sgs-fx-progress-total' ),
		10
	);
	return total > 0 ? total : null;
}

function renderPinCounters() {
	frame = 0;
	pinCounters.forEach( ( { el, pin, format } ) => {
		setText(
			el,
			formatCounter( readPinProgress( pin ), format, readTotal( pin ) )
		);
	} );
}

function schedulePin() {
	if ( ! frame ) {
		frame = window.requestAnimationFrame( renderPinCounters );
	}
}

function listenPin() {
	if ( ! listening ) {
		listening = true;
		window.addEventListener( 'scroll', schedulePin, { passive: true } );
		window.addEventListener( 'resize', schedulePin, { passive: true } );
	}
}

function boot() {
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		let source = choose( el, 'source', SOURCES, 'page' );
		const output = choose( el, 'output', OUTPUTS, 'bar-x' );
		const format = choose( el, 'counter-format', FORMATS, 'percent' );
		const pin = 'pin' === source ? el.closest( PIN_SELECTOR ) : null;

		if ( 'pin' === source && ! pin ) {
			source = 'page';
			el.setAttribute( PREFIX + 'source', 'page' );
		}

		if ( pin ) {
			// Bars read the pin's inherited property in CSS; only a counter
			// needs a script.
			if ( 'counter' === output ) {
				pinCounters.push( { el, pin, format } );
				listenPin();
				renderPinCounters();
			}
			return;
		}

		const options = { basis: source, information: true };
		if ( 'counter' === output ) {
			// No panel total exists off a pin, so every format reads as percent.
			options.onUpdate = ( target, progress ) =>
				setText( target, formatCounter( progress, 'percent', null ) );
		}
		observe( el, options );
		driven.push( el );
	} );
}

function teardown() {
	driven.forEach( ( el ) => unobserve( el ) );
	driven = [];
	pinCounters = [];
	if ( frame ) {
		window.cancelAnimationFrame( frame );
		frame = 0;
	}
	if ( listening ) {
		listening = false;
		window.removeEventListener( 'scroll', schedulePin );
		window.removeEventListener( 'resize', schedulePin );
	}
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', boot, { once: true } );
} else {
	boot();
}

// A bfcache restore skips module code, so rebuild against the restored DOM.
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		teardown();
		boot();
	}
} );
