/**
 * SGS motion: the ripple pointer writer (Spec 38A FR-38A-45, FR-38A-47, FR-38A-49). Tier V.
 *
 * The `@sgs/fx-ripple` script module the PHP motion registry enqueues for an element marked `data-sgs-fx~="ripple"`.
 * On the layer's trigger (`data-sgs-fx-trigger`: `pointerdown`, the default, or `click`) it writes the circle's
 * origin, diameter, colour, duration and easing as custom properties on that element, then sets
 * `data-sgs-ripple="play"` so `assets/css/fx-ripple.css` runs the circle in the element's `::after` slot. It never
 * writes transform, translate, scale, opacity or filter (FR-38A-47); the stylesheet owns every painted value.
 *
 * Attributes read (the schema's `RippleValues` data attributes; each absent one takes the Indus default):
 *  - `data-sgs-fx-ripple-size-factor`: diameter as a multiple of the element's larger side (default 2.2).
 *  - `data-sgs-fx-ripple-duration`: milliseconds (default 650).
 *  - `data-sgs-fx-ripple-easing`: a CSS easing (default `ease-out`).
 *  - `data-sgs-fx-ripple-colour`: a resolved colour (default white).
 * The peak opacity is the schema field's own custom property, `--sgs-ripple-op`, which the stylesheet reads.
 *
 * Reduced motion is read live on every trigger, and a switch to reduce cancels a circle already running.
 *
 * @package
 */

import { prefersReducedMotion } from './motion-utils';

const SELECTOR = '[data-sgs-fx~="ripple"]';
const PLAY = 'data-sgs-ripple';
const DEFAULT_FACTOR = 2.2;
const DEFAULT_DURATION = 650;
const DEFAULT_EASING = 'ease-out';
const DEFAULT_COLOUR = '#fff';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** Elements with a bound listener, for a bfcache rebuild. */
const bound = new Map();
let reducedQuery = null;

/**
 * The circle's diameter: the element's larger side times the size factor.
 *
 * @param {number} width  Element width in px.
 * @param {number} height Element height in px.
 * @param {number} factor Size factor.
 * @return {number} Diameter in px, rounded to 0.1.
 */
export function rippleDiameter( width, height, factor ) {
	const side = Math.max( width, height );
	const value = side * factor;
	return Number.isFinite( value ) && value > 0 ? Math.round( value * 10 ) / 10 : 0;
}

/**
 * A number attribute inside bounds, or the default when absent or not a number.
 *
 * @param {string|null} raw      Attribute text.
 * @param {number}      fallback Default.
 * @param {number}      min      Lowest allowed.
 * @param {number}      max      Highest allowed.
 * @return {number} Value.
 */
export function boundedNumber( raw, fallback, min, max ) {
	const value = parseFloat( raw );
	return Number.isFinite( value ) ? Math.min( max, Math.max( min, value ) ) : fallback;
}

/**
 * A colour or easing string safe to hand to a custom property: nothing that breaks out of the declaration.
 *
 * @param {string|null} raw      Attribute text.
 * @param {string}      fallback Default.
 * @return {string} Value.
 */
export function safeValue( raw, fallback ) {
	const text = ( raw || '' ).trim();
	return text !== '' && text.length <= 200 && ! /[;{}<>"'\\]/.test( text ) ? text : fallback;
}

/**
 * The layer's trigger.
 *
 * @param {HTMLElement} el Element.
 * @return {string} `pointerdown` or `click`.
 */
export function triggerOf( el ) {
	return el.getAttribute( 'data-sgs-fx-trigger' ) === 'click' ? 'click' : 'pointerdown';
}

/**
 * Stop a circle in flight.
 *
 * @param {HTMLElement} el Element.
 * @return {void}
 */
function stop( el ) {
	el.removeAttribute( PLAY );
}

/**
 * Play one circle at a point.
 *
 * @param {HTMLElement} el   Element.
 * @param {number}      x    Origin x in px from the element's left edge.
 * @param {number}      y    Origin y in px from the element's top edge.
 * @param {DOMRect}     rect Element box.
 * @return {void}
 */
function play( el, x, y, rect ) {
	const factor = boundedNumber( el.getAttribute( 'data-sgs-fx-ripple-size-factor' ), DEFAULT_FACTOR, 0.5, 5 );
	const duration = boundedNumber( el.getAttribute( 'data-sgs-fx-ripple-duration' ), DEFAULT_DURATION, 0, 10000 );
	el.style.setProperty( '--sgs-ripple-x', x.toFixed( 1 ) + 'px' );
	el.style.setProperty( '--sgs-ripple-y', y.toFixed( 1 ) + 'px' );
	el.style.setProperty( '--sgs-ripple-d', rippleDiameter( rect.width, rect.height, factor ) + 'px' );
	el.style.setProperty( '--sgs-ripple-colour', safeValue( el.getAttribute( 'data-sgs-fx-ripple-colour' ), DEFAULT_COLOUR ) );
	el.style.setProperty( '--sgs-ripple-duration', duration + 'ms' );
	el.style.setProperty( '--sgs-ripple-ease', safeValue( el.getAttribute( 'data-sgs-fx-ripple-easing' ), DEFAULT_EASING ) );
	// Restart the animation when a circle is still running.
	stop( el );
	void el.offsetWidth;
	el.setAttribute( PLAY, 'play' );
}

/**
 * Handle one pointerdown or click.
 *
 * @param {HTMLElement} el    Element.
 * @param {string}      type  Event type this handler was bound for.
 * @param {Event}       event The event.
 * @return {void}
 */
function onEvent( el, type, event ) {
	if ( triggerOf( el ) !== type || prefersReducedMotion() ) {
		return;
	}
	if ( type === 'pointerdown' && event.button > 0 ) {
		return;
	}
	const rect = el.getBoundingClientRect();
	// A keyboard click has no pointer position (detail 0): the circle starts at the centre.
	const keyboard = type === 'click' && event.detail === 0;
	const x = keyboard ? rect.width / 2 : event.clientX - rect.left;
	const y = keyboard ? rect.height / 2 : event.clientY - rect.top;
	play( el, x, y, rect );
}

/**
 * Bind one element.
 *
 * @param {HTMLElement} el Element.
 * @return {void}
 */
function bindElement( el ) {
	if ( bound.has( el ) ) {
		return;
	}
	const down = ( event ) => onEvent( el, 'pointerdown', event );
	const click = ( event ) => onEvent( el, 'click', event );
	const end = () => stop( el );
	el.addEventListener( 'pointerdown', down );
	el.addEventListener( 'click', click );
	el.addEventListener( 'animationend', end );
	el.addEventListener( 'animationcancel', end );
	bound.set( el, () => {
		el.removeEventListener( 'pointerdown', down );
		el.removeEventListener( 'click', click );
		el.removeEventListener( 'animationend', end );
		el.removeEventListener( 'animationcancel', end );
		stop( el );
	} );
}

/**
 * Cancel every running circle when reduced motion switches on.
 *
 * @return {void}
 */
function onReducedChange() {
	if ( prefersReducedMotion() ) {
		bound.forEach( ( off, el ) => stop( el ) );
	}
}

/**
 * Bind every marked element and listen for a reduced-motion switch.
 *
 * @return {void}
 */
function boot() {
	document.querySelectorAll( SELECTOR ).forEach( bindElement );
	if ( ! reducedQuery && typeof window.matchMedia === 'function' ) {
		reducedQuery = window.matchMedia( REDUCED_QUERY );
		reducedQuery.addEventListener( 'change', onReducedChange );
	}
}

boot();

// A bfcache restore may describe a re-rendered DOM: rebuild.
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		bound.forEach( ( off ) => off() );
		bound.clear();
		boot();
	}
} );
