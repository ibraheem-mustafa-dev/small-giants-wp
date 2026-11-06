/**
 * SGS motion: ambient float boot module (Spec 38A FR-38A-37). Tier V.
 *
 * The `@sgs/fx-ambient-float` script module the PHP motion registry enqueues when a page renders a block carrying
 * `data-sgs-fx` with `ambient-float` in its token list. The emitter writes the float's numbers as custom properties
 * (`--sgs-float-travel`, `--sgs-float-travel-y`, `--sgs-float-period`, `--sgs-float-phase`, `--sgs-float-easing`,
 * `--sgs-float-direction`, with tablet and mobile values in media queries) and the axis as a data attribute. This
 * module reads them from the computed style and runs one Web Animations loop on the registered channel owners
 * `--sgs-float-x` and `--sgs-float-y`, which `assets/css/motion.css` composes into `translate`. The loop runs through
 * the shared loop control (`@sgs/loop-control`) rather than a CSS `animation`, so an entrance on the same element
 * never replaces it; the loop control pauses it off screen, while focus is inside its block and from the pause
 * button, and cancels it under reduced motion.
 *
 * The optional scale range (`--sgs-float-scale-from`, `--sgs-float-scale-to`, both 1 by default) pulses the element in
 * the scale channel through `--sgs-float-s` while it drifts.
 *
 * Attributes: `data-sgs-fx-ambient-float-axis` (`x`, `y` or `both`; default `y`) and
 * `data-sgs-fx-ambient-float-pause-control="true"`, which asks for the pause button.
 *
 * A motion layer's per-device off switch (`data-sgs-fx-off-<tier>`, `data-sgs-fx-disable-<tier>`) is honoured through
 * `bootGated`: at a tier where the float is off the element runs no loop and shows its resting state, crossing into
 * that tier destroys the loop, and leaving it builds the loop again.
 *
 * @package
 */

// eslint-disable-next-line import/no-unresolved -- a webpack external (script module `@sgs/loop-control`).
import { animateLoop, parseLength, readLoopTiming } from '@sgs/loop-control';
import { bootGated } from './off-switch';

const SELECTOR = '[data-sgs-fx~="ambient-float"]';
const PREFIX = 'data-sgs-fx-ambient-float-';
const DEFAULT_TRAVEL = '12px';

/** The bounds a stored scale is held to, so a bad value cannot collapse or flood the element. */
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

/**
 * A scale multiplier from a computed custom property, bounded; 1 (no scale) when absent or not a number.
 *
 * @param {string} value The custom property's computed value.
 * @return {number} The bounded multiplier.
 */
function parseScale( value ) {
	const number = parseFloat( value );
	return Number.isFinite( number )
		? Math.min( MAX_SCALE, Math.max( MIN_SCALE, number ) )
		: 1;
}

/** Stops the tier-gated loop of every element, for a bfcache rebuild. */
let stopGated = () => {};

/**
 * The element's float values from its computed custom properties and axis attribute.
 *
 * @param {HTMLElement} el The floating element.
 * @return {Object} Timing from `readLoopTiming` plus `axis`, `travel`, `travelY`, `scaleFrom` and `scaleTo`.
 */
export function readFloat( el ) {
	const style = window.getComputedStyle( el );
	const travel = parseLength(
		style.getPropertyValue( '--sgs-float-travel' ),
		DEFAULT_TRAVEL
	);
	const axis = el.getAttribute( PREFIX + 'axis' );
	return {
		...readLoopTiming( el, 'float' ),
		axis: axis === 'x' || axis === 'both' ? axis : 'y',
		travel,
		travelY: parseLength(
			style.getPropertyValue( '--sgs-float-travel-y' ),
			travel
		),
		scaleFrom: parseScale(
			style.getPropertyValue( '--sgs-float-scale-from' )
		),
		scaleTo: parseScale(
			style.getPropertyValue( '--sgs-float-scale-to' )
		),
	};
}

/**
 * The keyframes for one axis choice: x animates `--sgs-float-x`, y animates `--sgs-float-y`, both animates the two in
 * one animation (x by `travel`, y by `travelY`). When the two scale values differ the same animation also runs
 * `--sgs-float-s` from `scaleFrom` to `scaleTo`, so the scale shares the movement's period, easing and direction.
 *
 * @param {Object} values The result of `readFloat`.
 * @return {Object[]} Two keyframes.
 */
export function floatKeyframes( values ) {
	const from = {};
	const to = {};
	if ( values.axis !== 'y' ) {
		from[ '--sgs-float-x' ] = '0px';
		to[ '--sgs-float-x' ] = values.travel;
	}
	if ( values.axis !== 'x' ) {
		from[ '--sgs-float-y' ] = '0px';
		to[ '--sgs-float-y' ] =
			values.axis === 'both' ? values.travelY : values.travel;
	}
	if ( values.scaleFrom !== values.scaleTo ) {
		from[ '--sgs-float-s' ] = String( values.scaleFrom );
		to[ '--sgs-float-s' ] = String( values.scaleTo );
	}
	return [ from, to ];
}

function boot() {
	stopGated = bootGated( 'ambient-float', SELECTOR, ( el ) => {
		const loop = animateLoop( el, {
			read: () => readFloat( el ),
			keyframes: floatKeyframes,
			pauseControl: el.getAttribute( PREFIX + 'pause-control' ) === 'true',
		} );
		return () => loop.destroy();
	} );
}

function teardown() {
	stopGated();
	stopGated = () => {};
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
