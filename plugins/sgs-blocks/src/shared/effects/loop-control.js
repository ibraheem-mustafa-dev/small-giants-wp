/**
 * SGS motion: the shared loop control (Spec 38A FR-38A-37).
 *
 * Registered as the script module `@sgs/loop-control` and externalised in webpack, so every looping effect (ambient
 * float now; ken-burns, svg-loop, lottie and marquee later) shares this one instance, one IntersectionObserver and
 * one reduced-motion listener.
 *
 * A loop is an element whose animation runs by itself. `registerLoop( el, options )` pauses it by setting the
 * attribute `data-sgs-loop-paused` on the element; the effect's stylesheet reacts with
 * `animation-play-state: paused`, so this module never writes an animation or a style property. A loop is paused when:
 *
 *   - it is off screen (one shared IntersectionObserver);
 *   - keyboard focus is inside its block root (always on, WCAG 2.2.2);
 *   - the visitor pressed the pause button (it stays paused until play is pressed).
 *
 * The block root is the nearest ancestor-or-self of the loop matching `[class*="wp-block-sgs-"]`. WordPress prints
 * `wp-block-sgs-<name>` on the outermost element of every SGS block; the inner BEM parts are `sgs-<block>__<part>`
 * and carry no `wp-block-` prefix, so the selector finds the block wrapper and never a part, and the nearest match
 * gives a block nested in another block its own root. Every loop in one root shares one state and one button.
 *
 * With `pauseControl` true the module creates the one pause button per root (the markup of
 * `sgs_motion_pause_button()` in `includes/helpers-motion-pause.php`, styled by `assets/css/motion-pause.css`),
 * appended to the root, or placed straight after the loop when the loop is itself the root, so it is never inside the
 * moving element. The visitor's pause and the focus pause run through `initMotionPause()`
 * (`src/shared/motion-pause/index.js`); hover pausing is off and touch does not pause.
 *
 * Options (an unknown key is ignored, so a later effect adds its own without breaking callers):
 *   pauseControl    create the pause button for the loop's root. Default false.
 *   label           the button's accessible name. Default 'Pause animation'.
 *   onPausedChange  called with the new paused state whenever it changes.
 *
 * `animateLoop( el, { keyframes, read } )` is `registerLoop` plus the animation itself, run through the Web
 * Animations API so a loop never competes with the entrance rules in the CSS cascade (a CSS `animation-name` list
 * from one rule replaces the whole list from another). `read()` returns the values the emitter wrote as custom
 * properties; the animation is rebuilt when a breakpoint the emitter uses changes, cancelled under reduced motion,
 * and paused and played from the same state `registerLoop` keeps.
 *
 * @package
 */

import { initMotionPause } from '../motion-pause';

const ROOT_SELECTOR = '[class*="wp-block-sgs-"]';
const PAUSED_ATTR = 'data-sgs-loop-paused';
const DEFAULT_LABEL = 'Pause animation';
const SVG_NS = 'http://www.w3.org/2000/svg';

/** The root's shared state, kept for the life of the page so a root registered again reuses its listeners. */
const groups = new WeakMap();
/** Every live loop by element, for the shared IntersectionObserver. */
const loops = new Map();

let observer = null;
let reducedQuery = null;
const reducedListeners = new Set();

function reducedQueryList() {
	if ( ! reducedQuery && typeof window.matchMedia === 'function' ) {
		reducedQuery = window.matchMedia( '(prefers-reduced-motion: reduce)' );
		const notify = () => {
			reducedListeners.forEach( ( listener ) =>
				listener( reducedQuery.matches )
			);
		};
		if ( typeof reducedQuery.addEventListener === 'function' ) {
			reducedQuery.addEventListener( 'change', notify );
		} else if ( typeof reducedQuery.addListener === 'function' ) {
			reducedQuery.addListener( notify );
		}
	}
	return reducedQuery;
}

/**
 * Whether the visitor asks for reduced motion now. For JavaScript loops; CSS loops use the media query.
 *
 * @return {boolean} True under `prefers-reduced-motion: reduce`.
 */
export function prefersReducedMotion() {
	const query = reducedQueryList();
	return Boolean( query && query.matches );
}

/**
 * Call back when the reduced-motion preference changes.
 *
 * @param {Function} listener Called with the new boolean value.
 * @return {Function} Removes the listener.
 */
export function onReducedMotionChange( listener ) {
	reducedQueryList();
	reducedListeners.add( listener );
	return () => reducedListeners.delete( listener );
}

function sharedObserver() {
	if ( ! observer && typeof window.IntersectionObserver === 'function' ) {
		observer = new window.IntersectionObserver( ( entries ) => {
			entries.forEach( ( entry ) => {
				const loop = loops.get( entry.target );
				if ( loop ) {
					loop.visible = entry.isIntersecting;
					loop.apply();
				}
			} );
		} );
	}
	return observer;
}

function icon( kind, path ) {
	const svg = document.createElementNS( SVG_NS, 'svg' );
	svg.setAttribute(
		'class',
		`sgs-motion-pause__icon sgs-motion-pause__icon--${ kind }`
	);
	svg.setAttribute( 'viewBox', '0 0 24 24' );
	svg.setAttribute( 'width', '20' );
	svg.setAttribute( 'height', '20' );
	svg.setAttribute( 'aria-hidden', 'true' );
	svg.setAttribute( 'focusable', 'false' );
	const shape = document.createElementNS( SVG_NS, 'path' );
	shape.setAttribute( 'd', path );
	shape.setAttribute( 'fill', 'currentColor' );
	svg.appendChild( shape );
	return svg;
}

// The helper's button markup (`sgs_motion_pause_button()`), `inline` placement.
function createButton( label ) {
	const button = document.createElement( 'button' );
	button.type = 'button';
	button.className = 'sgs-motion-pause sgs-motion-pause--inline';
	button.setAttribute( 'aria-pressed', 'false' );
	button.setAttribute( 'aria-label', label );
	button.setAttribute( 'data-sgs-motion-pause', '' );
	button.hidden = true;
	button.appendChild( icon( 'pause', 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' ) );
	button.appendChild( icon( 'play', 'M8 5v14l11-7z' ) );
	return button;
}

function groupFor( root ) {
	let group = groups.get( root );
	if ( group ) {
		return group;
	}
	group = { loops: new Set(), button: null, stopReduced: null };
	// The controller owns the visitor's pause and the focus pause. Its own button slot holds a detached element so a
	// stray `[data-sgs-motion-pause]` inside the root is never adopted; the visible button delegates to
	// `controller.pause()` and `controller.play()`.
	group.controller = initMotionPause( root, {
		button: document.createElement( 'button' ),
		hover: false,
		touch: 'none',
		onChange: () => group.loops.forEach( ( loop ) => loop.apply() ),
	} );
	groups.set( root, group );
	return group;
}

function ensureButton( group, root, el, label ) {
	if ( group.button ) {
		return;
	}
	const button = createButton( label );
	button.addEventListener( 'click', () => {
		const pressed = button.getAttribute( 'aria-pressed' ) === 'true';
		if ( pressed ) {
			group.controller.play();
		} else {
			group.controller.pause();
		}
		button.setAttribute( 'aria-pressed', pressed ? 'false' : 'true' );
	} );
	if ( root === el ) {
		el.after( button );
	} else {
		root.appendChild( button );
	}
	group.button = button;
	// A CSS loop does not run under reduced motion, so the button stays hidden then.
	const showWhenMoving = ( reduced ) => {
		button.hidden = reduced;
	};
	showWhenMoving( prefersReducedMotion() );
	group.stopReduced = onReducedMotionChange( showWhenMoving );
}

function removeButton( group ) {
	if ( group.stopReduced ) {
		group.stopReduced();
		group.stopReduced = null;
	}
	if ( group.button ) {
		group.button.remove();
		group.button = null;
	}
}

/**
 * Put one element's animation under the loop control.
 *
 * @param {HTMLElement} el                     The looping element.
 * @param {Object}      [options]
 * @param {boolean}     [options.pauseControl] Create the pause button for the element's block root.
 * @param {string}      [options.label]        The button's accessible name.
 * @return {{pause: Function, play: Function, isPaused: Function, destroy: Function}} Controller.
 */
export function registerLoop( el, options = {} ) {
	const root = el.closest( ROOT_SELECTOR ) || el.parentElement || el;
	const group = groupFor( root );

	const loop = {
		visible: true,
		paused: false,
		apply() {
			const paused = ! loop.visible || group.controller.isPaused();
			if ( paused ) {
				el.setAttribute( PAUSED_ATTR, '' );
			} else {
				el.removeAttribute( PAUSED_ATTR );
			}
			if ( paused !== loop.paused ) {
				loop.paused = paused;
				if ( typeof options.onPausedChange === 'function' ) {
					options.onPausedChange( paused );
				}
			}
		},
	};
	group.loops.add( loop );
	loops.set( el, loop );

	if ( options.pauseControl === true ) {
		ensureButton(
			group,
			root,
			el,
			typeof options.label === 'string' && options.label
				? options.label
				: DEFAULT_LABEL
		);
	}

	const io = sharedObserver();
	if ( io ) {
		io.observe( el );
	}
	loop.apply();

	return {
		pause: () => {
			group.controller.pause();
			if ( group.button ) {
				group.button.setAttribute( 'aria-pressed', 'true' );
			}
		},
		play: () => {
			group.controller.play();
			if ( group.button ) {
				group.button.setAttribute( 'aria-pressed', 'false' );
			}
		},
		isPaused: () => el.hasAttribute( PAUSED_ATTR ),
		destroy() {
			if ( ! loops.has( el ) ) {
				return;
			}
			if ( observer ) {
				observer.unobserve( el );
			}
			loops.delete( el );
			group.loops.delete( loop );
			el.removeAttribute( PAUSED_ATTR );
			if ( group.loops.size === 0 ) {
				removeButton( group );
			}
		},
	};
}

const DEFAULTS = {
	period: 4200,
	phase: 0,
	easing: 'ease-in-out',
	direction: 'alternate',
};
const DIRECTIONS = [ 'normal', 'reverse', 'alternate', 'alternate-reverse' ];
const BREAKPOINTS = [ '(max-width: 1023px)', '(max-width: 767px)' ];

/**
 * A time custom property as milliseconds (`4200ms`, `4.2s`, a bare number), or the fallback.
 *
 * @param {string} text     The property's computed text.
 * @param {number} fallback Value when the text is empty or unreadable.
 * @return {number} Milliseconds.
 */
export function parseTime( text, fallback ) {
	const match = /^\s*(-?\d*\.?\d+)\s*(ms|s)?\s*$/.exec( text || '' );
	if ( ! match ) {
		return fallback;
	}
	const value = parseFloat( match[ 1 ] );
	return match[ 2 ] === 's' ? value * 1000 : value;
}

/**
 * A length custom property as CSS text (`12px`), or the fallback.
 *
 * @param {string} text     The property's computed text.
 * @param {string} fallback Value when the text is empty or unreadable.
 * @return {string} A length.
 */
export function parseLength( text, fallback ) {
	const value = ( text || '' ).trim();
	return /^-?\d*\.?\d+(px|rem|em|%)?$/.test( value ) ? value : fallback;
}

/**
 * The shared timing of a loop from its computed custom properties `--sgs-<name>-period`, `-phase`, `-easing` and
 * `-direction`.
 *
 * @param {HTMLElement} el   The loop element.
 * @param {string}      name The effect's property prefix, for example `float`.
 * @return {{period: number, phase: number, easing: string, direction: string}} Timing in milliseconds.
 */
export function readLoopTiming( el, name ) {
	const style = window.getComputedStyle( el );
	const get = ( key ) =>
		style.getPropertyValue( `--sgs-${ name }-${ key }` ).trim();
	const direction = get( 'direction' );
	const period = parseTime( get( 'period' ), DEFAULTS.period );
	return {
		period: period > 0 ? period : DEFAULTS.period,
		phase: Math.max( 0, parseTime( get( 'phase' ), DEFAULTS.phase ) ),
		easing: get( 'easing' ) || DEFAULTS.easing,
		direction: DIRECTIONS.includes( direction )
			? direction
			: DEFAULTS.direction,
	};
}

/**
 * Run an infinite Web Animations loop under the loop control.
 *
 * @param {HTMLElement} el                    The looping element.
 * @param {Object}      config
 * @param {Function}    config.read           `() => values`; the current values, with `period`, `phase`, `easing` and
 *                                            `direction` as `readLoopTiming` returns them.
 * @param {Function}    config.keyframes      `( values ) => Keyframe[]`.
 * @param {boolean}     [config.pauseControl] As `registerLoop`.
 * @param {string}      [config.label]        As `registerLoop`.
 * @return {{pause: Function, play: Function, isPaused: Function, destroy: Function}} Controller.
 */
export function animateLoop( el, config ) {
	const { read, keyframes } = config;
	let animation = null;
	let loop = null;

	const stop = () => {
		if ( animation ) {
			animation.cancel();
			animation = null;
		}
	};

	const build = () => {
		stop();
		if ( prefersReducedMotion() || typeof el.animate !== 'function' ) {
			return;
		}
		const values = read();
		animation = el.animate( keyframes( values ), {
			duration: values.period,
			delay: -values.phase,
			iterations: Infinity,
			direction: values.direction,
			easing: values.easing,
			fill: 'both',
		} );
		if ( loop && loop.isPaused() ) {
			animation.pause();
		}
	};

	loop = registerLoop( el, {
		pauseControl: config.pauseControl,
		label: config.label,
		onPausedChange: ( paused ) => {
			if ( animation ) {
				if ( paused ) {
					animation.pause();
				} else {
					animation.play();
				}
			}
		},
	} );

	const stopReduced = onReducedMotionChange( build );
	const queries =
		typeof window.matchMedia === 'function'
			? BREAKPOINTS.map( ( query ) => window.matchMedia( query ) )
			: [];
	queries.forEach( ( query ) => {
		if ( typeof query.addEventListener === 'function' ) {
			query.addEventListener( 'change', build );
		}
	} );
	build();

	return {
		...loop,
		destroy() {
			stopReduced();
			queries.forEach( ( query ) => {
				if ( typeof query.removeEventListener === 'function' ) {
					query.removeEventListener( 'change', build );
				}
			} );
			stop();
			loop.destroy();
		},
	};
}
