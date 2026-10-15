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
 * @package
 */

import { init as playerInit } from './lottie-adapter.js';
import { prefersReducedMotion, rafThrottle } from '../effects/motion-utils.js';
import { readConfig, scrollProgress, isLayer } from './lottie-config.js';
import { registerWithLoopControl, playIfAllowed } from './lottie-loop.js';

const SELECTOR = '[data-sgs-fx~="lottie"]';
const LAYER_CLASS = 'sgs-lottie-layer';

/** Live bindings by element, so cleanup can find every one. */
const instances = new Map();

/** The single shared scroll/resize driver for scroll-triggered instances. */
let scrollDriver = null;

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
 */

/**
 * Discover and bind every Lottie element on the page.
 *
 * @return {void}
 */
export function init() {
	document.querySelectorAll( SELECTOR ).forEach( bindInstance );

	window.addEventListener( 'pagehide', cleanup );
	window.addEventListener( 'pageshow', ( event ) => {
		if ( event.persisted ) {
			cleanup();
			init();
		}
	} );
	document.addEventListener( 'visibilitychange', handleVisibilityChange );

	if ( 'function' === typeof window.matchMedia ) {
		window
			.matchMedia( '(prefers-reduced-motion: reduce)' )
			.addEventListener( 'change', handleReducedMotionChange );
	}
}

/**
 * Tear every live instance down and release shared listeners.
 *
 * @return {void}
 */
export function cleanup() {
	instances.forEach( ( binding ) => teardownBinding( binding ) );
	instances.clear();

	if ( scrollDriver ) {
		window.removeEventListener( 'scroll', scrollDriver );
		window.removeEventListener( 'resize', scrollDriver );
		if ( scrollDriver.cancel ) {
			scrollDriver.cancel();
		}
		scrollDriver = null;
	}

	window.removeEventListener( 'pagehide', cleanup );
	document.removeEventListener( 'visibilitychange', handleVisibilityChange );
}

/**
 * @param {Element} el One Lottie element.
 * @return {void}
 */
function bindInstance( el ) {
	if ( instances.has( el ) ) {
		return;
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
	};
	instances.set( el, binding );

	if ( prefersReducedMotion() ) {
		// No trigger is scheduled: the poster already in the markup is the whole experience.
		return;
	}
	wireTrigger( binding );
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
		const start = () => activate( binding, true );
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
	const { el, controller } = binding;

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
		const options = { passive: true, signal: controller.signal };
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
		binding.mounted = false;
		return;
	}

	if ( ! document.body.contains( el ) ) {
		return;
	}

	try {
		if ( isLayer( el ) ) {
			el.classList.add( LAYER_CLASS );
		}
		binding.player = await playerInit( {
			container: el,
			animationData,
			loop: config.loop,
			speed: config.speed,
		} );
	} catch ( error ) {
		binding.mounted = false;
		return;
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
	binding.mounted = false;
	binding.inView = false;
	binding.active = false;

	if ( opts.keepBinding ) {
		binding.controller = new AbortController();
	}
}

init();
