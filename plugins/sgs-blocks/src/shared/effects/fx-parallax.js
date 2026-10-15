/**
 * SGS motion — parallax boot module (Spec 38A FR-38A-43, FR-38A-50). Tier V.
 *
 * The `@sgs/fx-parallax` script module the PHP motion registry enqueues when a
 * page renders a block carrying `data-sgs-fx~="parallax"`. It hands each marked
 * element to the shared scroll driver (`@sgs/scroll-driver`); the driver and
 * this module write custom-property VALUES only (FR-38A-47), and
 * `assets/css/fx-parallax.css` turns the value into the part's `--sgs-plx-y`,
 * `--sgs-plx-x` or `--sgs-plx-bg-*` offset, which the section 10 channels in
 * `motion.css` compose into `translate` or `background-position`.
 *
 * Attributes (the schema's `ParallaxValues` data attributes):
 *  - `data-sgs-fx-parallax-basis`: `page` or `view` (no value means `view`).
 *    Page: the driver writes `--sgs-scroll-y`, the scrolled distance in px, and
 *    the offset is ratio x scrolled px (ratio -0.06 at scrollY 500 is -30px).
 *    View: this module writes `--sgs-fx-parallax-travel`, the px distance the
 *    element has moved from rest, where rest is the element centred on the
 *    viewport centre:
 *    travel = ( progress - 0.5 ) x ( viewport height + element height ),
 *    progress being the driver's 0 to 1 in-view progress, so the travel is 0
 *    when the element is centred and grows in the scroll direction. The driver
 *    measures the element at rest (`restRect`, its rect less its own
 *    translate), so the movement never feeds back into the progress.
 *  - The speed ratio, the clamp, the axis and the background switch are read by
 *    the stylesheet (`--sgs-fx-parallax-ratio` and `--sgs-fx-parallax-clamp`
 *    are the per-device custom properties the emitter writes).
 *
 * Under reduced motion the driver writes nothing and the stylesheet keeps the
 * part at rest; a mid-session change in either direction is honoured here (the
 * view travel is removed on the way in, the driver resumes on the way out).
 *
 * @package
 */

// eslint-disable-next-line import/no-unresolved -- a webpack external (script module `@sgs/scroll-driver`).
import { observe, unobserve } from '@sgs/scroll-driver';

const SELECTOR = '[data-sgs-fx~="parallax"]';
const BASIS_ATTRIBUTE = 'data-sgs-fx-parallax-basis';
const TRAVEL = '--sgs-fx-parallax-travel';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** View-basis elements, so a reduced-motion switch can clear their travel. */
const viewElements = new Set();
/** Every element handed to the driver, for teardown. */
const driven = new Set();
const lastTravel = new WeakMap();

let reducedQuery = null;
let listening = false;

/**
 * The px an element has moved from rest on the view basis.
 *
 * @param {number} progress       The driver's 0 to 1 in-view progress.
 * @param {number} viewportHeight Viewport height in px.
 * @param {number} elementHeight  Element height in px.
 * @return {number} Whole px, negative before the centre, positive after.
 */
export function viewTravel( progress, viewportHeight, elementHeight ) {
	const value = ( progress - 0.5 ) * ( viewportHeight + elementHeight );
	return Number.isFinite( value ) ? Math.round( value ) : 0;
}

/**
 * The vertical px a computed `translate` value moves an element: `none` and an x-only value are 0.
 *
 * @param {string} value Computed `translate`.
 * @return {number} Px.
 */
export function translateY( value ) {
	const parts = String( value || '' )
		.trim()
		.split( /\s+/ );
	const y = parts.length > 1 ? parseFloat( parts[ 1 ] ) : 0;
	return Number.isFinite( y ) ? y : 0;
}

/**
 * The element's rect at rest. The part is translated by this very effect (and by any other owner of the `translate`
 * channel), and a bounding rect includes that, so measuring it would feed the movement back into its own progress.
 *
 * @param {Element} el Parallax element.
 * @return {{top: number, height: number}} Rest top (viewport px) and height.
 */
export function restRect( el ) {
	const rect = el.getBoundingClientRect();
	return {
		top: rect.top - translateY( window.getComputedStyle( el ).translate ),
		height: rect.height,
	};
}

function writeTravel( el, progress ) {
	const height = el.getBoundingClientRect().height;
	const text = viewTravel( progress, window.innerHeight, height ) + 'px';
	if ( lastTravel.get( el ) === text ) {
		return;
	}
	lastTravel.set( el, text );
	el.style.setProperty( TRAVEL, text );
}

function clearTravel( el ) {
	lastTravel.delete( el );
	el.style.removeProperty( TRAVEL );
}

function onReducedChange() {
	if ( reducedQuery && reducedQuery.matches ) {
		viewElements.forEach( clearTravel );
	}
}

function listen() {
	if ( listening || ! reducedQuery ) {
		return;
	}
	listening = true;
	if ( 'function' === typeof reducedQuery.addEventListener ) {
		reducedQuery.addEventListener( 'change', onReducedChange );
	}
}

function unlisten() {
	if ( ! listening || ! reducedQuery ) {
		return;
	}
	listening = false;
	if ( 'function' === typeof reducedQuery.removeEventListener ) {
		reducedQuery.removeEventListener( 'change', onReducedChange );
	}
}

/**
 * Hand one element to the driver for its basis.
 *
 * @param {Element} el A `[data-sgs-fx~="parallax"]` element.
 */
export function register( el ) {
	if ( ! el || 1 !== el.nodeType || driven.has( el ) ) {
		return;
	}
	driven.add( el );
	if ( 'page' === el.getAttribute( BASIS_ATTRIBUTE ) ) {
		observe( el, { basis: 'page' } );
	} else {
		viewElements.add( el );
		observe( el, { basis: 'view', measure: restRect, onUpdate: writeTravel } );
	}
	listen();
}

/**
 * Register every parallax element under a root.
 *
 * @param {ParentNode} [root] Search root, the document by default.
 */
export function init( root = document ) {
	root.querySelectorAll( SELECTOR ).forEach( register );
}

/**
 * Release every element and remove what was written on it.
 */
export function teardown() {
	driven.forEach( ( el ) => {
		unobserve( el );
		clearTravel( el );
	} );
	driven.clear();
	viewElements.clear();
	unlisten();
}

if ( 'undefined' !== typeof window && 'undefined' !== typeof document ) {
	reducedQuery =
		'function' === typeof window.matchMedia
			? window.matchMedia( REDUCED_QUERY )
			: null;
	if ( 'loading' === document.readyState ) {
		document.addEventListener( 'DOMContentLoaded', () => init(), {
			once: true,
		} );
	} else {
		init();
	}
}
