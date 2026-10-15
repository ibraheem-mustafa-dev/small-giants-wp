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
 * Attributes: `data-sgs-fx-ambient-float-axis` (`x`, `y` or `both`; default `y`) and
 * `data-sgs-fx-ambient-float-pause-control="true"`, which asks for the pause button.
 *
 * @package
 */

// eslint-disable-next-line import/no-unresolved -- a webpack external (script module `@sgs/loop-control`).
import { animateLoop, parseLength, readLoopTiming } from '@sgs/loop-control';

const SELECTOR = '[data-sgs-fx~="ambient-float"]';
const PREFIX = 'data-sgs-fx-ambient-float-';
const DEFAULT_TRAVEL = '12px';

let registered = [];

/**
 * The element's float values from its computed custom properties and axis attribute.
 *
 * @param {HTMLElement} el The floating element.
 * @return {Object} Timing from `readLoopTiming` plus `axis`, `travel` and `travelY`.
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
	};
}

/**
 * The keyframes for one axis choice: x animates `--sgs-float-x`, y animates `--sgs-float-y`, both animates the two in
 * one animation (x by `travel`, y by `travelY`).
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
	return [ from, to ];
}

function boot() {
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		registered.push(
			animateLoop( el, {
				read: () => readFloat( el ),
				keyframes: floatKeyframes,
				pauseControl:
					el.getAttribute( PREFIX + 'pause-control' ) === 'true',
			} )
		);
	} );
}

function teardown() {
	registered.forEach( ( loop ) => loop.destroy() );
	registered = [];
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
