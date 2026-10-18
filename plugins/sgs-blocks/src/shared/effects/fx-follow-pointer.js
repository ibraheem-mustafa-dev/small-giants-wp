/**
 * SGS motion: Follow pointer's pointer writer (Spec 38A FR-38A-41, FR-38A-47). Tier V.
 *
 * The `@sgs/fx-follow-pointer` script module the PHP motion registry enqueues for an element the renderer marked
 * `data-sgs-fx="follow-pointer"` that also carries `data-sgs-mc~="transform"`.
 *
 * It writes two custom properties on that element and nothing else: `--sgs-tilt-x` and `--sgs-tilt-y` (degrees).
 * They do not inherit, so the element that carries the transform channel is the one written. `assets/css/motion.css`
 * composes them into the `transform` channel with every other X and Y owner; the settle transition the renderer
 * writes eases them back when the pointer leaves. The largest angle is `--sgs-tilt-max` and the axis lock is
 * `--sgs-tilt-lock` (`none`, `x` or `y`), both read from the element's computed style so a device tier's value
 * applies. An axis lock keeps the tilt on that one axis. Under reduced motion nothing is written and any written
 * angle is removed, live. The pointer's position in the element's box maps linearly to -max to +max (`2 × max × (0.5 − y)`
 * on X and `2 × max × (x − 0.5)` on Y, rescaled so the ends sit `EDGE` in from the box),
 * so the top right corner reads +max on both axes.
 *
 * @package
 */

import { clamp, trackPointer, bindAll } from './pointer-track';

const SELECTOR = '[data-sgs-fx~="follow-pointer"][data-sgs-mc~="transform"]';
const PROP_X = '--sgs-tilt-x';
const PROP_Y = '--sgs-tilt-y';
const DEFAULT_MAX = 8;
// The angle reaches the maximum this fraction in from each edge: a tilted element's far corners recede from the
// pointer, so the extreme corner pixel cannot be relied on to stay under it.
const EDGE = 0.05;

let teardown = null;

/**
 * The element's largest angle and axis lock, read from its computed style.
 *
 * @param {HTMLElement} el Element.
 * @return {{max: number, lock: string}} Largest angle in degrees, and the lock.
 */
function readConfig( el ) {
	const style = window.getComputedStyle( el );
	const max = parseFloat( style.getPropertyValue( '--sgs-tilt-max' ) );
	const lock = style.getPropertyValue( '--sgs-tilt-lock' ).trim();
	return {
		max: Number.isFinite( max ) ? clamp( max, 0, 45 ) : DEFAULT_MAX,
		lock: 'x' === lock || 'y' === lock ? lock : 'none',
	};
}

/**
 * A 0 to 1 position as -1 to 1, reaching either end `EDGE` in from the box's edge.
 *
 * @param {number} n Position as 0 to 1 of the box.
 * @return {number} -1 to 1.
 */
function span( n ) {
	return clamp( ( n - EDGE ) / ( 1 - 2 * EDGE ), 0, 1 ) * 2 - 1;
}

/**
 * One element's pointer tracker.
 *
 * @param {HTMLElement} el Element.
 * @return {{start: Function, stop: Function}} Controller.
 */
function bindElement( el ) {
	return trackPointer( el, {
		move( nx, ny ) {
			const { max, lock } = readConfig( el );
			const y = 'x' === lock ? 0 : span( nx ) * max;
			const x = 'y' === lock ? 0 : -span( ny ) * max;
			el.style.setProperty( PROP_X, x.toFixed( 2 ) + 'deg' );
			el.style.setProperty( PROP_Y, y.toFixed( 2 ) + 'deg' );
		},
		reset() {
			el.style.removeProperty( PROP_X );
			el.style.removeProperty( PROP_Y );
		},
	} );
}

/**
 * Bind every marked element.
 *
 * @return {void}
 */
function boot() {
	const els = [ ...document.querySelectorAll( SELECTOR ) ];
	if ( els.length > 0 ) {
		teardown = bindAll( els, bindElement, 'follow-pointer' );
	}
}

boot();

// A bfcache restore keeps the listeners but may describe a DOM that has been re-rendered: rebuild.
window.addEventListener( 'pageshow', ( event ) => {
	if ( event.persisted ) {
		if ( teardown ) {
			teardown();
			teardown = null;
		}
		boot();
	}
} );
