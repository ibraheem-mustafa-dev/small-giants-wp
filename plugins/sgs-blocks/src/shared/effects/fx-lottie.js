/**
 * `@sgs/fx-lottie` — the boot module `SGS_Motion_Registry::enqueue_effect()`
 * enqueues for every page rendering `data-sgs-fx="lottie"` (U-17, design
 * §3.3). Finds every `.sgs-lottie` element, wires its trigger, and drives it
 * through `src/shared/effects/lottie-adapter.js` — this module never touches
 * `lottie-web` directly.
 *
 * NO GSAP (council fix 3): the scroll trigger below is vanilla
 * IntersectionObserver + a passive, rAF-throttled scroll listener. Adding a
 * GSAP ScrollTrigger dependency here would pull `@sgs/gsap-core` +
 * `@sgs/gsap-scrolltrigger` into every Lottie page's dynamic-dep graph,
 * which `check-motion-bundle-budget.py` counts against `tier_h_lottie`'s
 * 60 KB allowance — an allowance sized for the player alone.
 *
 * Reduced motion (§1.6): checked BEFORE the dynamic import ever runs, so a
 * `prefers-reduced-motion: reduce` visitor loads zero player bytes. A LIVE
 * change to `reduce` mid-session destroys any running instance and leaves
 * the poster; a change back to `no-preference` re-arms the trigger from
 * scratch (never resumes a torn-down instance).
 *
 * `init()` -> `cleanup()` lifecycle: `pagehide` tears every instance down;
 * `pageshow` with `event.persisted` (a bfcache restore) rebuilds from
 * scratch, matching every other Tier V/H effect module's own pattern.
 *
 * @package SGS\Blocks
 */

import { init as playerInit } from './lottie-adapter.js';
import { prefersReducedMotion, rafThrottle } from '../effects/motion-utils.js';

/** Elements the render layer marked. */
const SELECTOR = '.sgs-lottie[data-sgs-fx="lottie"]';

/** Live instances, keyed by their element, so cleanup can find every one. */
const instances = new Map();

/** The single shared scroll/resize driver for scroll-triggered instances. */
let scrollDriver = null;

/**
 * One instance's full lifecycle state.
 *
 * @typedef {Object} LottieBinding
 * @property {Element} el
 * @property {string} src
 * @property {string} trigger
 * @property {boolean} loop
 * @property {number} speed
 * @property {Object|null} player   The adapter instance once mounted, else null.
 * @property {IntersectionObserver|null} observer
 * @property {AbortController} controller  Cancels in-flight listeners/fetches on cleanup.
 * @property {boolean} mounted
 * @property {boolean} inView
 */

/**
 * Discover and bind every `.sgs-lottie` element on the page.
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

	if ( 'undefined' !== typeof document && document.addEventListener ) {
		document.addEventListener( 'visibilitychange', handleVisibilityChange );
	}

	if (
		'undefined' !== typeof window &&
		'function' === typeof window.matchMedia
	) {
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
 * @param {Element} el One `.sgs-lottie` element.
 * @return {void}
 */
function bindInstance( el ) {
	if ( instances.has( el ) ) {
		return;
	}

	const binding = {
		el,
		src: el.getAttribute( 'data-src' ) || '',
		trigger: el.getAttribute( 'data-trigger' ) || 'visible',
		loop: '1' === el.getAttribute( 'data-loop' ),
		speed: parseFloat( el.getAttribute( 'data-speed' ) || '1' ) || 1,
		player: null,
		observer: null,
		controller: new AbortController(),
		mounted: false,
		inView: false,
	};

	instances.set( el, binding );

	if ( prefersReducedMotion() ) {
		// Never even schedule a trigger — the poster already in the markup
		// (`sgs_render_lottie()`'s `poster_html`) is the whole experience.
		return;
	}

	wireTrigger( binding );
}

/**
 * @param {LottieBinding} binding
 * @return {void}
 */
function wireTrigger( binding ) {
	const { el, trigger, controller } = binding;

	if ( 'load' === trigger ) {
		const start = () => mountAndPlay( binding );
		if ( 'requestIdleCallback' in window ) {
			window.requestIdleCallback( start, { timeout: 2000 } );
		} else {
			window.setTimeout( start, 200 );
		}
		return;
	}

	if ( 'hover' === trigger ) {
		const onEnter = () => mountAndPlay( binding );
		const onLeave = () => {
			if ( binding.player ) {
				binding.player.pause();
			}
		};
		el.addEventListener( 'pointerenter', onEnter, { signal: controller.signal } );
		el.addEventListener( 'focusin', onEnter, { signal: controller.signal } );
		el.addEventListener( 'pointerleave', onLeave, { signal: controller.signal } );
		el.addEventListener( 'focusout', onLeave, { signal: controller.signal } );
		return;
	}

	if ( 'scroll' === trigger ) {
		wireScrollTrigger( binding );
		return;
	}

	// 'visible' (default) and any unrecognised value fall back to it.
	binding.observer = new IntersectionObserver(
		( entries ) => {
			entries.forEach( ( entry ) => {
				binding.inView = entry.isIntersecting;
				if ( entry.isIntersecting ) {
					mountAndPlay( binding );
				} else if ( binding.player ) {
					binding.player.pause();
				}
			} );
		},
		{ threshold: 0.25 }
	);
	binding.observer.observe( el );
}

/**
 * `scroll` trigger: while the element is in view (its own IntersectionObserver),
 * a passive, rAF-throttled scroll listener maps the element's progress through
 * the viewport (0 at the point it enters, 1 at the point it leaves) onto
 * `goToAndStop`. Vanilla — no GSAP ScrollTrigger (council fix 3).
 *
 * @param {LottieBinding} binding
 * @return {void}
 */
function wireScrollTrigger( binding ) {
	const { el, controller } = binding;

	binding.observer = new IntersectionObserver(
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
				if ( 'scroll' === entry.trigger && entry.inView && entry.player ) {
					entry.player.seek( scrollProgress( entry.el ) );
				}
			} );
		} );
		window.addEventListener( 'scroll', scrollDriver, {
			passive: true,
			signal: controller.signal,
		} );
		window.addEventListener( 'resize', scrollDriver, {
			passive: true,
			signal: controller.signal,
		} );
	}
}

/**
 * The element's progress through the viewport, 0 (just entering the bottom
 * edge) to 1 (just leaving the top edge).
 *
 * @param {Element} el
 * @return {number} 0..1.
 */
function scrollProgress( el ) {
	const rect = el.getBoundingClientRect();
	const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
	const total = viewportHeight + rect.height;
	const traveled = viewportHeight - rect.top;
	return Math.min( 1, Math.max( 0, traveled / total ) );
}

/**
 * Fetch the animation JSON (same-origin only) and mount the player, then
 * start playback for every trigger except `scroll` (which drives frames via
 * `seek()` instead of `play()`).
 *
 * @param {LottieBinding} binding
 * @return {Promise<void>}
 */
async function mountAndPlay( binding ) {
	await mount( binding );
	if ( binding.player && 'scroll' !== binding.trigger ) {
		binding.player.play();
	}
}

/**
 * @param {LottieBinding} binding
 * @return {Promise<void>}
 */
async function mount( binding ) {
	if ( binding.mounted || ! binding.src ) {
		return;
	}
	binding.mounted = true;

	let animationData;
	try {
		const response = await fetch( binding.src, {
			credentials: 'same-origin',
			signal: binding.controller.signal,
		} );
		if ( ! response.ok ) {
			throw new Error( `sgs-lottie: fetch failed (${ response.status })` );
		}
		animationData = await response.json();
	} catch ( error ) {
		// Fetch/parse failure -> the poster markup already in the DOM stays,
		// exactly as an attachment with no valid meta does server-side.
		binding.mounted = false;
		return;
	}

	if ( ! document.body.contains( binding.el ) ) {
		// Torn down (e.g. a fast pagehide) while the fetch was in flight.
		return;
	}

	try {
		binding.player = await playerInit( {
			container: binding.el,
			animationData,
			loop: binding.loop,
			speed: binding.speed,
		} );
	} catch ( error ) {
		binding.mounted = false;
		return;
	}

	wirePauseButton( binding );
}

/**
 * Wire the WCAG 2.2.2 pause button `sgs_render_lottie()` rendered as a
 * sibling of this wrapper (never inside it — the button lives outside the
 * `<span class="sgs-lottie">`, per the render function's own contract, so it
 * is looked up from the surrounding DOM rather than assumed to be a child).
 *
 * @param {LottieBinding} binding
 * @return {void}
 */
function wirePauseButton( binding ) {
	const { el, controller } = binding;
	const pauseButton =
		el.querySelector( ':scope > .sgs-lottie__pause' ) ||
		el.nextElementSibling?.matches?.( '.sgs-lottie__pause' )
			? el.nextElementSibling
			: el.parentElement?.querySelector?.( '.sgs-lottie__pause' );

	if ( ! pauseButton ) {
		return;
	}

	let paused = false;
	pauseButton.addEventListener(
		'click',
		() => {
			if ( ! binding.player ) {
				return;
			}
			paused = ! paused;
			if ( paused ) {
				binding.player.pause();
			} else {
				binding.player.play();
			}
			pauseButton.setAttribute( 'aria-pressed', paused ? 'true' : 'false' );
		},
		{ signal: controller.signal }
	);
}

/**
 * `document.hidden` pauses every mounted, currently-playing instance —
 * mirrors the off-screen pause the IntersectionObserver already does, for
 * the case where the tab itself is backgrounded rather than scrolled away.
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
		} else if ( binding.inView && 'scroll' !== binding.trigger ) {
			binding.player.play();
		}
	} );
}

/**
 * A LIVE `prefers-reduced-motion` change. Turning it ON destroys every
 * mounted instance (back to the poster). Turning it OFF re-arms every
 * binding's trigger from scratch — never resumes a torn-down player.
 *
 * @param {MediaQueryListEvent} event
 * @return {void}
 */
function handleReducedMotionChange( event ) {
	if ( event.matches ) {
		instances.forEach( ( binding ) => teardownBinding( binding, { keepBinding: true } ) );
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
 * @param {Object} [opts]
 * @param {boolean} [opts.keepBinding] Keep the binding in `instances` (used
 *                                     by the reduced-motion handler, which
 *                                     re-arms the same binding rather than
 *                                     re-discovering the element).
 * @return {void}
 */
function teardownBinding( binding, opts = {} ) {
	if ( binding.observer ) {
		binding.observer.disconnect();
		binding.observer = null;
	}
	binding.controller.abort();
	if ( binding.player ) {
		binding.player.destroy();
		binding.player = null;
	}
	binding.mounted = false;
	binding.inView = false;

	if ( opts.keepBinding ) {
		binding.controller = new AbortController();
	}
}

init();
