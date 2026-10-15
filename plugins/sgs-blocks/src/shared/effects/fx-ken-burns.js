/**
 * SGS motion: Ken Burns boot module (Spec 38A FR-38A-52). Tier V.
 *
 * The `@sgs/fx-ken-burns` script module the PHP motion registry enqueues when a page renders a block carrying
 * `data-sgs-fx` with `ken-burns` in its token list. The target is the element that paints the background or media
 * (the image, not the block's content). The emitter writes the layer's values as data attributes
 * (`data-sgs-fx-ken-burns-mode`, `-zoom-start`, `-zoom-end`, `-pan-direction`, `-duration` in milliseconds, `-easing`
 * and `-pause-control`); this module reads them and runs one Web Animations run on the registered channel owners
 * `--sgs-kb-s` (scale) and `--sgs-kb-x` / `--sgs-kb-y` (translate), which `assets/css/motion.css` composes into
 * `scale` and `translate`. Neither run touches an animation property in CSS, so an entrance on the same element never
 * replaces it.
 *
 * - `loop` goes through the shared loop control (`animateLoop`): it alternates between the start and end zoom for ever,
 *   pausing off screen, while focus is inside its block and from the pause button.
 * - `zoom-out-once` is a single run from the start zoom to the end zoom that holds its last frame. It joins the same
 *   loop control (`registerLoop`), so it pauses off screen, with focus inside the block and from the pause button too.
 *
 * Both cancel under reduced motion and start again if the visitor lifts the preference.
 *
 * @package
 */

import {
	animateLoop,
	onReducedMotionChange,
	parseTime,
	prefersReducedMotion,
	registerLoop,
} from '@sgs/loop-control'; // eslint-disable-line import/no-unresolved -- a webpack external (script module `@sgs/loop-control`).

const SELECTOR = '[data-sgs-fx~="ken-burns"]';
const PREFIX = 'data-sgs-fx-ken-burns-';
const DEFAULT_DURATION = 20000;
const DEFAULT_ZOOM_START = 108;
const DEFAULT_ZOOM_END = 100;
const LOOP_EASING = 'ease-in-out';
const ONCE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const PAN_DIRECTIONS = [ 'none', 'left', 'right', 'up', 'down' ];
/** The pan is this share of the element's size, never more than the zoom leaves spare on a side. */
const PAN_SHARE = 0.02;
const LABEL = 'Pause background animation';

let registered = [];

function number( el, name, fallback ) {
	const value = parseFloat( el.getAttribute( PREFIX + name ) );
	return Number.isFinite( value ) ? value : fallback;
}

function zoom( el, name, fallback ) {
	const value = number( el, name, fallback );
	return value >= 100 && value <= 200 ? value : fallback;
}

/**
 * An easing from the attribute: a CSS keyword, `cubic-bezier()` or `linear()` as written, or a `var(--token)` read
 * from the element's computed style (Web Animations cannot resolve `var()` itself).
 *
 * @param {HTMLElement} el       The element.
 * @param {string}      fallback Value when the attribute is empty or its token has no value.
 * @return {string} A CSS easing.
 */
function easing( el, fallback ) {
	const text = ( el.getAttribute( PREFIX + 'easing' ) || '' ).trim();
	const token = /^var\(\s*(--[\w-]+)/.exec( text );
	if ( token ) {
		const resolved = window
			.getComputedStyle( el )
			.getPropertyValue( token[ 1 ] )
			.trim();
		return resolved || fallback;
	}
	return text || fallback;
}

/**
 * The element's Ken Burns values from its data attributes.
 *
 * @param {HTMLElement} el The Ken Burns element.
 * @return {Object} `mode`, `zoomStart` and `zoomEnd` (scale factors), `panX` and `panY` (px), and the loop timing
 *                  (`period`, `phase`, `easing`, `direction`) that `animateLoop` reads.
 */
export function readKenBurns( el ) {
	const once = el.getAttribute( PREFIX + 'mode' ) === 'zoom-out-once';
	const start = zoom( el, 'zoom-start', DEFAULT_ZOOM_START );
	const end = zoom( el, 'zoom-end', DEFAULT_ZOOM_END );
	const direction = el.getAttribute( PREFIX + 'pan-direction' );
	const pan = PAN_DIRECTIONS.includes( direction ) ? direction : 'none';
	const spare = ( Math.max( start, end ) / 100 - 1 ) / 2;
	const share = Math.min( PAN_SHARE, spare );
	const x = Math.round( ( el.offsetWidth || 0 ) * share * 100 ) / 100;
	const y = Math.round( ( el.offsetHeight || 0 ) * share * 100 ) / 100;
	const period = parseTime(
		el.getAttribute( PREFIX + 'duration' ),
		DEFAULT_DURATION
	);
	return {
		mode: once ? 'zoom-out-once' : 'loop',
		zoomStart: start / 100,
		zoomEnd: end / 100,
		panX: { left: -x, right: x }[ pan ] || 0,
		panY: { up: -y, down: y }[ pan ] || 0,
		period: period > 0 ? period : DEFAULT_DURATION,
		phase: 0,
		easing: easing( el, once ? ONCE_EASING : LOOP_EASING ),
		direction: 'alternate',
	};
}

/**
 * The two keyframes: the start zoom at rest, then the end zoom with the pan applied.
 *
 * @param {Object} values The result of `readKenBurns`.
 * @return {Object[]} Two keyframes on `--sgs-kb-s`, plus `--sgs-kb-x` and `--sgs-kb-y` when the pan moves that axis.
 */
export function kenBurnsKeyframes( values ) {
	const from = { '--sgs-kb-s': String( values.zoomStart ) };
	const to = { '--sgs-kb-s': String( values.zoomEnd ) };
	if ( values.panX !== 0 ) {
		from[ '--sgs-kb-x' ] = '0px';
		to[ '--sgs-kb-x' ] = `${ values.panX }px`;
	}
	if ( values.panY !== 0 ) {
		from[ '--sgs-kb-y' ] = '0px';
		to[ '--sgs-kb-y' ] = `${ values.panY }px`;
	}
	return [ from, to ];
}

/**
 * One zoom-out-once run under the loop control: a single Web Animations run that holds its last frame.
 *
 * @param {HTMLElement} el           The Ken Burns element.
 * @param {boolean}     pauseControl Create the pause button.
 * @return {{destroy: Function}} Controller.
 */
function runOnce( el, pauseControl ) {
	let animation = null;

	const stop = () => {
		if ( animation ) {
			animation.cancel();
			animation = null;
		}
	};

	const control = registerLoop( el, {
		pauseControl,
		label: LABEL,
		onPausedChange: ( paused ) => {
			if ( ! animation ) {
				return;
			}
			if ( paused ) {
				animation.pause();
			} else if ( animation.playState === 'paused' ) {
				animation.play();
			}
		},
	} );

	const start = () => {
		if ( animation || prefersReducedMotion() || ! el.animate ) {
			return;
		}
		const values = readKenBurns( el );
		animation = el.animate( kenBurnsKeyframes( values ), {
			duration: values.period,
			easing: values.easing,
			fill: 'forwards',
		} );
		if ( control.isPaused() ) {
			animation.pause();
		}
	};

	const stopReduced = onReducedMotionChange( ( reduced ) => {
		if ( reduced ) {
			stop();
		} else {
			start();
		}
	} );
	start();

	return {
		destroy() {
			stopReduced();
			stop();
			control.destroy();
		},
	};
}

function boot() {
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		const pauseControl =
			el.getAttribute( PREFIX + 'pause-control' ) === 'true';
		if ( readKenBurns( el ).mode === 'zoom-out-once' ) {
			registered.push( runOnce( el, pauseControl ) );
			return;
		}
		registered.push(
			animateLoop( el, {
				read: () => readKenBurns( el ),
				keyframes: kenBurnsKeyframes,
				pauseControl,
				label: LABEL,
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
