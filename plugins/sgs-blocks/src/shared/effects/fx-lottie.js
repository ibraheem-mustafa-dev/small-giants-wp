/**
 * `@sgs/fx-lottie` — the boot module `SGS_Motion_Registry::enqueue_effect()` enqueues for every page rendering
 * `data-sgs-fx` with the `lottie` token. It finds every such element, reads its settings (`lottie-config.js`: trigger,
 * loop, speed, pause control), wires the trigger and drives the player through `lottie-adapter.js`; this module never
 * touches `lottie-web` directly. An element is either an effect layer on a part (any element carrying the layer's
 * attributes) or a `sgs_render_lottie()` span.
 *
 * NO GSAP: the scroll trigger is vanilla IntersectionObserver plus a passive, rAF-throttled scroll listener, so a
 * Lottie page never pulls the GSAP graph into `tier_h_lottie`'s 60 KB allowance.
 *
 * Looping and pausing: a looping animation, or one with the pause button switched on, is registered with the shared
 * loop control (`@sgs/loop-control`, `registerLoop`). The control pauses it off screen, while focus is inside its
 * block (always on, WCAG 2.2.2) and from the pause button it creates (or the server-rendered one beside a
 * `sgs_render_lottie()` span); this module pauses and plays the player from `onPausedChange`. A scroll-driven
 * animation is scrubbed by the scrollbar and never loops, so it is not registered.
 *
 * Reduced motion: checked BEFORE the dynamic import, so a `prefers-reduced-motion: reduce` visitor loads no player
 * bytes and keeps the poster already in the markup. A live change to `reduce` destroys every instance; a change back
 * re-arms the triggers from scratch.
 *
 * `pagehide` tears every instance down; `pageshow` with `persisted` (a bfcache restore) rebuilds from scratch.
 *
 * A motion layer's per-device off switch (`data-sgs-fx-off-<tier>`, `data-sgs-fx-disable-<tier>`, Spec 38A FR-38A-23)
 * is honoured through `bootGated`: at a tier where the Lottie is off the element has no binding, trigger or player and
 * keeps its poster; crossing into that tier tears the binding down (a mount still in flight is discarded when it
 * lands), and leaving it binds the element again. The visibility, breakpoint and scroll listeners are shared: they
 * attach with the first live binding and detach with the last.
 *
 * @package
 */

import { init as playerInit } from './lottie-adapter.js';
import { bootGated } from './off-switch.js';
import { prefersReducedMotion, rafThrottle } from '../effects/motion-utils.js';
import {
	readConfig,
	readSpeed,
	scrollProgress,
	isLayer,
} from './lottie-config.js';
import { registerWithLoopControl, playIfAllowed } from './lottie-loop.js';
import { BREAKPOINTS } from '@sgs/loop-control'; // eslint-disable-line import/no-unresolved -- a webpack external (script module `@sgs/loop-control`).

const SELECTOR = '[data-sgs-fx~="lottie"]';
const LAYER_CLASS = 'sgs-lottie-layer';

/** Live bindings by element, so cleanup can find every one. */
const instances = new Map();

/** The single shared scroll/resize driver for scroll-triggered instances. */
let scrollDriver = null;

/** The loop control's breakpoint queries this module listens to, so a tier change re-reads the speed. */
let breakpointQueries = [];

/** Whether the visibility and breakpoint listeners are attached (they follow the live bindings). */
let sharedListening = false;

/** Stops the tier-gated binding of every element. */
let stopGated = null;

/** The reduced-motion query and the one-off listeners that outlive `cleanup()`. */
let reducedQuery = null;
let permanentBound = false;

/**
 * @typedef {Object} LottieBinding
 * @property {Element}                   el         The Lottie element.
 * @property {Object}                    config     The result of `readConfig`.
 * @property {Object|null}               player     The adapter instance once mounted.
 * @property {Object|null}               loopCtl    The loop control handle once registered.
 * @property {boolean}                   active     Whether the trigger currently asks for playback.
 * @property {boolean}                   inView     Whether the element is in view.
 * @property {boolean}                   mounted    Whether the player is mounted or mounting.
 * @property {IntersectionObserver|null} observer   The trigger's observer.
 * @property {AbortController}           controller Cancels listeners and fetches on cleanup.
 * @property {number}                    epoch      Bumped by every teardown, so a mount that started earlier can tell.
 * @property {boolean}                   scrollWired Whether the shared scroll driver serves this binding.
 */

/**
 * Discover and bind every Lottie element on the page.
 *
 * @return {void}
 */
export function init() {
	if ( stopGated ) {
		return;
	}
	stopGated = bootGated( 'lottie', SELECTOR, bindInstance );

	window.addEventListener( 'pagehide', cleanup );
	if ( ! permanentBound ) {
		permanentBound = true;
		window.addEventListener( 'pageshow', ( event ) => {
			if ( event.persisted ) {
				cleanup();
				init();
			}
		} );
		if ( 'function' === typeof window.matchMedia ) {
			reducedQuery = window.matchMedia(
				'(prefers-reduced-motion: reduce)'
			);
			reducedQuery.addEventListener( 'change', handleReducedMotionChange );
		}
	}
	syncSharedListeners();
}

/**
 * Attach the visibility and breakpoint listeners while at least one binding is live, and detach them with the last.
 *
 * @return {void}
 */
function syncSharedListeners() {
	const wanted = instances.size > 0 && null !== stopGated;
	if ( wanted === sharedListening ) {
		return;
	}
	sharedListening = wanted;
	if ( wanted ) {
		document.addEventListener( 'visibilitychange', handleVisibilityChange );
		if ( 'function' === typeof window.matchMedia ) {
			breakpointQueries = BREAKPOINTS.map( ( text ) =>
				window.matchMedia( text )
			);
			breakpointQueries.forEach( ( query ) =>
				query.addEventListener( 'change', handleBreakpointChange )
			);
		}
		return;
	}
	document.removeEventListener( 'visibilitychange', handleVisibilityChange );
	breakpointQueries.forEach( ( query ) =>
		query.removeEventListener( 'change', handleBreakpointChange )
	);
	breakpointQueries = [];
}

/**
 * Detach the shared scroll driver once no live binding is scroll-wired.
 *
 * @return {void}
 */
function releaseScrollDriver() {
	if (
		! scrollDriver ||
		Array.from( instances.values() ).some( ( entry ) => entry.scrollWired )
	) {
		return;
	}
	window.removeEventListener( 'scroll', scrollDriver );
	window.removeEventListener( 'resize', scrollDriver );
	if ( scrollDriver.cancel ) {
		scrollDriver.cancel();
	}
	scrollDriver = null;
}

/**
 * A breakpoint was crossed: the emitter's media queries now give `--sgs-lottie-speed` the new tier's value, so re-read
 * it and apply it to the live player (a player still mounting reads `config.speed` when it is created).
 *
 * @return {void}
 */
function handleBreakpointChange() {
	instances.forEach( ( binding ) => {
		binding.config.speed = readSpeed( binding.el );
		if ( binding.player ) {
			binding.player.setSpeed( binding.config.speed );
		}
	} );
}

/**
 * Tear every live instance down and release shared listeners.
 *
 * @return {void}
 */
export function cleanup() {
	if ( stopGated ) {
		const stop = stopGated;
		stopGated = null;
		stop();
	}
	instances.forEach( ( binding ) => teardownBinding( binding ) );
	instances.clear();
	releaseScrollDriver();
	window.removeEventListener( 'pagehide', cleanup );
	syncSharedListeners();
}

/**
 * @param {Element} el One Lottie element.
 * @return {Function|undefined} Releases the binding (the off switch's stop).
 */
function bindInstance( el ) {
	if ( instances.has( el ) ) {
		return undefined;
	}

	const binding = {
		el,
		config: readConfig( el ),
		player: null,
		loopCtl: null,
		active: false,
		inView: false,
		mounted: false,
		observer: null,
		controller: new AbortController(),
		epoch: 0,
		scrollWired: false,
	};
	instances.set( el, binding );
	syncSharedListeners();

	if ( ! prefersReducedMotion() ) {
		// Under reduced motion no trigger is scheduled: the poster already in the markup is the whole experience.
		wireTrigger( binding );
	}

	return () => {
		teardownBinding( binding );
		instances.delete( el );
		releaseScrollDriver();
		syncSharedListeners();
	};
}

/**
 * @param {LottieBinding} binding
 * @return {void}
 */
function wireTrigger( binding ) {
	const { el, controller } = binding;
	const { trigger } = binding.config;
	const signal = { signal: controller.signal };

	if ( 'load' === trigger ) {
		const start = () => {
			// The idle callback may land after the binding was torn down (the off tier, a reduced-motion switch).
			if ( ! signal.signal.aborted ) {
				activate( binding, true );
			}
		};
		if ( 'requestIdleCallback' in window ) {
			window.requestIdleCallback( start, { timeout: 2000 } );
		} else {
			window.setTimeout( start, 200 );
		}
		return;
	}

	if ( 'hover' === trigger ) {
		const enter = () => activate( binding, true );
		const leave = () => activate( binding, false );
		el.addEventListener( 'pointerenter', enter, signal );
		el.addEventListener( 'focusin', enter, signal );
		el.addEventListener( 'pointerleave', leave, signal );
		el.addEventListener( 'focusout', leave, signal );
		return;
	}

	if ( 'scroll' === trigger ) {
		wireScrollTrigger( binding );
		return;
	}

	// 'visible': plays while at least a quarter of the element is in view.
	binding.observer = new window.IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				binding.inView = entry.isIntersecting;
				activate( binding, entry.isIntersecting );
			} );
		},
		{ threshold: 0.25 }
	);
	binding.observer.observe( el );
}

/**
 * `scroll` trigger: while the element is in view, a passive, rAF-throttled scroll listener maps its progress through
 * the viewport onto `seek()`.
 *
 * @param {LottieBinding} binding
 * @return {void}
 */
function wireScrollTrigger( binding ) {
	const { el } = binding;

	binding.observer = new window.IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				binding.inView = entry.isIntersecting;
				if ( entry.isIntersecting && ! binding.mounted ) {
					mount( binding );
				}
			} );
		},
		{ threshold: 0 }
	);
	binding.observer.observe( el );
	binding.scrollWired = true;

	if ( ! scrollDriver ) {
		scrollDriver = rafThrottle( () => {
			instances.forEach( ( entry ) => {
				if (
					'scroll' === entry.config.trigger &&
					entry.inView &&
					entry.player
				) {
					entry.player.seek( scrollProgress( entry.el ) );
				}
			} );
		} );
		// Shared by every scroll-triggered binding, so no one binding's abort signal owns it.
		const options = { passive: true };
		window.addEventListener( 'scroll', scrollDriver, options );
		window.addEventListener( 'resize', scrollDriver, options );
	}
}

/**
 * The trigger asks for playback (`wanted` true) or stops asking.
 *
 * @param {LottieBinding} binding
 * @param {boolean}       wanted
 * @return {Promise<void>}
 */
async function activate( binding, wanted ) {
	binding.active = wanted;
	if ( wanted ) {
		await mount( binding );
		playIfAllowed( binding );
	} else if ( binding.player ) {
		binding.player.pause();
	}
}

/**
 * Fetch the animation JSON (same-origin only), mount the player, and put a looping or pausable animation under the
 * loop control.
 *
 * @param {LottieBinding} binding
 * @return {Promise<void>}
 */
async function mount( binding ) {
	const { el, config } = binding;
	if ( binding.mounted || ! config.src ) {
		return;
	}
	binding.mounted = true;
	// A teardown while this mount is awaiting bumps the epoch; the mount then discards what it fetched or built.
	const epoch = binding.epoch;

	let animationData;
	try {
		const response = await fetch( config.src, {
			credentials: 'same-origin',
			signal: binding.controller.signal,
		} );
		if ( ! response.ok ) {
			throw new Error(
				`sgs-lottie: fetch failed (${ response.status })`
			);
		}
		animationData = await response.json();
	} catch ( error ) {
		// The poster markup already in the DOM stays.
		if ( epoch === binding.epoch ) {
			binding.mounted = false;
		}
		return;
	}

	if ( epoch !== binding.epoch || ! document.body.contains( el ) ) {
		return;
	}

	let player;
	try {
		if ( isLayer( el ) ) {
			el.classList.add( LAYER_CLASS );
		}
		player = await playerInit( {
			container: el,
			animationData,
			loop: config.loop,
			speed: config.speed,
		} );
	} catch ( error ) {
		if ( epoch === binding.epoch ) {
			binding.mounted = false;
		}
		return;
	}

	if ( epoch !== binding.epoch ) {
		// Torn down while the player was being built: release it without ever attaching it.
		player.destroy();
		return;
	}
	binding.player = player;

	// A scroll-driven animation shows the frame for where the page already is; the scroll listener only seeks on the
	// next scroll, so a page opened or restored part-way down would otherwise hold frame 0.
	if ( 'scroll' === config.trigger ) {
		binding.player.seek( scrollProgress( el ) );
	}

	registerWithLoopControl( binding );
}

/**
 * A backgrounded tab pauses every mounted instance; coming back resumes the ones the trigger still wants.
 *
 * @return {void}
 */
function handleVisibilityChange() {
	instances.forEach( ( binding ) => {
		if ( ! binding.player ) {
			return;
		}
		if ( document.hidden ) {
			binding.player.pause();
		} else if ( 'scroll' !== binding.config.trigger ) {
			playIfAllowed( binding );
		}
	} );
}

/**
 * A LIVE `prefers-reduced-motion` change. ON destroys every mounted instance (back to the poster); OFF re-arms every
 * binding's trigger from scratch.
 *
 * @param {MediaQueryListEvent} event
 * @return {void}
 */
function handleReducedMotionChange( event ) {
	if ( event.matches ) {
		instances.forEach( ( binding ) =>
			teardownBinding( binding, { keepBinding: true } )
		);
		releaseScrollDriver();
		return;
	}

	instances.forEach( ( binding ) => {
		if ( ! binding.mounted ) {
			wireTrigger( binding );
		}
	} );
}

/**
 * @param {LottieBinding} binding
 * @param {Object}        [opts]
 * @param {boolean}       [opts.keepBinding] Re-arm the same binding afterwards (reduced-motion handler).
 * @return {void}
 */
function teardownBinding( binding, opts = {} ) {
	if ( binding.observer ) {
		binding.observer.disconnect();
		binding.observer = null;
	}
	binding.controller.abort();
	if ( binding.loopCtl ) {
		binding.loopCtl.destroy();
		binding.loopCtl = null;
	}
	if ( binding.player ) {
		binding.player.destroy();
		binding.player = null;
	}
	binding.el.classList.remove( LAYER_CLASS );
	binding.epoch += 1;
	binding.scrollWired = false;
	binding.mounted = false;
	binding.inView = false;
	binding.active = false;

	if ( opts.keepBinding ) {
		binding.controller = new AbortController();
	}
}

init();
