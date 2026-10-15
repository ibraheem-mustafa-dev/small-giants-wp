/**
 * SGS motion: SVG loop boot module (Spec 38A FR-38A-52). Tier V.
 *
 * The `@sgs/fx-svg-loop` script module the PHP motion registry enqueues when a page renders a block carrying
 * `data-sgs-fx` with `svg-loop` in its token list. The target is the element that holds the SVG (a background SVG
 * layer or the media part). The emitter writes the layer's values as data attributes (`data-sgs-fx-svg-loop-motion`,
 * `-duration` in milliseconds, `-amplitude` and `-pause-control`); this module reads them and runs one Web Animations
 * loop through the shared loop control (`@sgs/loop-control`), so an entrance on the same element never replaces it and
 * the loop pauses off screen, while focus is inside its block and from the pause button, and cancels under reduced
 * motion.
 *
 * The loop writes the channel owners the effect owns (`--sgs-svl-op` for `opacity`, `--sgs-svl-s` for `scale`,
 * `--sgs-svl-rot` for `rotate`), which `assets/css/motion.css` composes with the other owners of those channels:
 *
 * - `pulse` dips the opacity from 1 to `1 - 0.5 x amplitude` and back, easing `ease` between the keyframes;
 * - `wave` swells the scale to `1 + 0.05 x amplitude` while it rocks `1deg x amplitude` to each side, easing
 *   `ease-in-out` between the five keyframes.
 *
 * An amplitude of 1 is the shape the retired `bgSvgAnimation` and `svgAnimation` classes drew. The float motion is the
 * `ambient-float` effect, not this one.
 *
 * @package
 */

import { animateLoop, parseTime } from '@sgs/loop-control'; // eslint-disable-line import/no-unresolved -- a webpack external (script module `@sgs/loop-control`).

const SELECTOR = '[data-sgs-fx~="svg-loop"]';
const PREFIX = 'data-sgs-fx-svg-loop-';
const MOTIONS = {
	pulse: { duration: 3000, easing: 'ease' },
	wave: { duration: 5000, easing: 'ease-in-out' },
};
const MAX_AMPLITUDE = 5;
const PULSE_DIP = 0.5;
const WAVE_SCALE = 0.05;
const WAVE_ROTATE = 1;
const LABEL = 'Pause graphic animation';

let registered = [];

/**
 * The element's SVG loop values: the computed custom properties `--sgs-svl-duration` and `--sgs-svl-amplitude` (which
 * carry the tablet and mobile values), then the data attributes, then the defaults.
 *
 * @param {HTMLElement} el The SVG loop element.
 * @return {Object} `motion`, `amplitude`, `segmentEasing`, and the loop timing (`period`, `phase`, `easing`,
 *                  `direction`) that `animateLoop` reads. The effect easing is `linear` because each keyframe carries
 *                  the easing between it and the next, as a CSS animation's timing function does.
 */
export function readSvgLoop( el ) {
	const name = el.getAttribute( PREFIX + 'motion' );
	const motion = name === 'wave' ? 'wave' : 'pulse';
	const style = window.getComputedStyle( el );
	const amplitude = [
		style.getPropertyValue( '--sgs-svl-amplitude' ),
		el.getAttribute( PREFIX + 'amplitude' ),
	]
		.map( parseFloat )
		.find(
			( value ) =>
				Number.isFinite( value ) && value >= 0 && value <= MAX_AMPLITUDE
		);
	const attrPeriod = parseTime(
		el.getAttribute( PREFIX + 'duration' ),
		MOTIONS[ motion ].duration
	);
	const period = parseTime(
		style.getPropertyValue( '--sgs-svl-duration' ),
		attrPeriod
	);
	return {
		motion,
		amplitude: undefined === amplitude ? 1 : amplitude,
		segmentEasing: MOTIONS[ motion ].easing,
		period: period > 0 ? period : MOTIONS[ motion ].duration,
		phase: 0,
		easing: 'linear',
		direction: 'normal',
	};
}

/**
 * The keyframes for a motion.
 *
 * @param {Object} values The result of `readSvgLoop`.
 * @return {Object[]} Three keyframes for a pulse, five for a wave.
 */
export function svgLoopKeyframes( values ) {
	const { amplitude, segmentEasing: easing } = values;
	if ( values.motion === 'pulse' ) {
		const low = String(
			Math.max(
				0,
				Math.round( ( 1 - PULSE_DIP * amplitude ) * 1e4 ) / 1e4
			)
		);
		return [
			{ '--sgs-svl-op': '1', easing },
			{ '--sgs-svl-op': low, easing },
			{ '--sgs-svl-op': '1' },
		];
	}
	const swell = String(
		Math.round( ( 1 + WAVE_SCALE * amplitude ) * 1e4 ) / 1e4
	);
	const rock = `${ WAVE_ROTATE * amplitude }deg`;
	return [
		{ '--sgs-svl-s': '1', '--sgs-svl-rot': '0deg', easing },
		{ '--sgs-svl-s': swell, '--sgs-svl-rot': rock, easing },
		{ '--sgs-svl-s': '1', '--sgs-svl-rot': '0deg', easing },
		{ '--sgs-svl-s': swell, '--sgs-svl-rot': `-${ rock }`, easing },
		{ '--sgs-svl-s': '1', '--sgs-svl-rot': '0deg' },
	];
}

function boot() {
	document.querySelectorAll( SELECTOR ).forEach( ( el ) => {
		registered.push(
			animateLoop( el, {
				read: () => readSvgLoop( el ),
				keyframes: svgLoopKeyframes,
				pauseControl:
					el.getAttribute( PREFIX + 'pause-control' ) === 'true',
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
