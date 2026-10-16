/**
 * SGS motion: the shared loop control (Spec 38A FR-38A-37).
 *
 * Registered as the script module `@sgs/loop-control` and externalised in webpack, so every looping effect (ambient
 * float, ken-burns, svg-loop, lottie and marquee) shares this one instance, one IntersectionObserver and one
 * reduced-motion listener.
 *
 * A loop is an element whose animation runs by itself. `animateLoop` runs it through the Web Animations API, and
 * `registerLoop( el, options )` keeps the pause state: it sets the attribute `data-sgs-loop-paused` on the element as a
 * state marker (`isPaused()` reads it back; no stylesheet reacts to it) and calls `onPausedChange` so the effect pauses
 * or plays its own animation or player. This module never writes an animation or a style property itself. A loop is
 * paused when:
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
 *   hoverRate       0 to 1; the playback rate while a mouse or pen pointer is over the block root. 1 leaves the loop
 *                   alone; 0 pauses it while hovered; between, `onRateChange( rate )` is called on entering (with the
 *                   rate) and leaving (with 1). Default: hover does nothing.
 *   onRateChange    called with the playback rate the loop should run at.
 *   pauseOnTouch    a touch tap on the block root pauses the loop, and the next tap resumes it. Default false.
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
import { ensureButton as makeButton, removeButton } from './loop-button';

export { parseTime, parseLength, readLoopTiming } from './loop-timing';

const ROOT_SELECTOR = '[class*="wp-block-sgs-"]';
const PAUSED_ATTR = 'data-sgs-loop-paused';
const DEFAULT_LABEL = 'Pause animation';
const BREAKPOINTS = [ '(max-width: 1023px)', '(max-width: 767px)' ];

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

	const hoverRate =
		typeof options.hoverRate === 'number' &&
		options.hoverRate >= 0 &&
		options.hoverRate < 1
			? options.hoverRate
			: null;

	const loop = {
		visible: true,
		paused: false,
		hovered: false,
		tapped: false,
		rate: 1,
		apply() {
			const stoppedByHover = loop.hovered && hoverRate === 0;
			const paused =
				! loop.visible ||
				loop.tapped ||
				stoppedByHover ||
				group.controller.isPaused();
			const rate = loop.hovered && hoverRate !== null ? hoverRate : 1;
			if ( rate !== loop.rate ) {
				loop.rate = rate;
				if ( typeof options.onRateChange === 'function' ) {
					options.onRateChange( rate );
				}
			}
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

	// Hover and touch are read on the block root, like the focus pause. Entries are (event, handler) pairs so
	// `destroy()` removes exactly what was added.
	const listeners = [];
	const listen = ( type, handler ) => {
		root.addEventListener( type, handler );
		listeners.push( [ type, handler ] );
	};
	if ( hoverRate !== null ) {
		listen( 'pointerenter', ( event ) => {
			if ( event.pointerType !== 'touch' ) {
				loop.hovered = true;
				loop.apply();
			}
		} );
		listen( 'pointerleave', () => {
			loop.hovered = false;
			loop.apply();
		} );
	}
	if ( options.pauseOnTouch === true ) {
		listen( 'pointerdown', ( event ) => {
			if ( event.pointerType === 'touch' ) {
				loop.tapped = ! loop.tapped;
				loop.apply();
			}
		} );
	}

	if ( options.pauseControl === true ) {
		makeButton(
			group,
			root,
			el,
			typeof options.label === 'string' && options.label
				? options.label
				: DEFAULT_LABEL,
			{ matches: prefersReducedMotion, onChange: onReducedMotionChange }
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
			listeners.forEach( ( [ type, handler ] ) =>
				root.removeEventListener( type, handler )
			);
			el.removeAttribute( PAUSED_ATTR );
			if ( group.loops.size === 0 ) {
				removeButton( group );
				// The root's motion has ended: a later registerLoop on it starts from a fresh state, not the old
				// visitor pause behind a new button that says playing.
				group.controller.reset();
			}
		},
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
 * @param {number}      [config.hoverRate]    As `registerLoop`; applied to the animation's playback rate.
 * @param {boolean}     [config.pauseOnTouch] As `registerLoop`.
 * @return {{pause: Function, play: Function, isPaused: Function, destroy: Function}} Controller.
 */
export function animateLoop( el, config ) {
	const { read, keyframes } = config;
	let animation = null;
	let loop = null;
	let currentRate = 1;

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
		if ( currentRate !== 1 ) {
			animation.updatePlaybackRate( currentRate );
		}
		if ( loop && loop.isPaused() ) {
			animation.pause();
		}
	};

	loop = registerLoop( el, {
		pauseControl: config.pauseControl,
		label: config.label,
		hoverRate: config.hoverRate,
		pauseOnTouch: config.pauseOnTouch,
		onRateChange: ( rate ) => {
			currentRate = rate;
			if ( animation ) {
				animation.updatePlaybackRate( rate );
			}
		},
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
		rebuild: build,
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
