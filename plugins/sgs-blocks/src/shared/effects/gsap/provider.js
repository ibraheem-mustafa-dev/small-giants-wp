/**
 * Tier G runtime provider — the shared GSAP entry point for every fx effect.
 *
 * Spec 38 FR-38-2. This is built as its OWN registered script module
 * (`@sgs/motion-provider`) and externalised from every effect module. That is
 * deliberate: if each effect bundled its own copy of this file, each would get
 * a private `registered` flag and a private matchMedia context, so plugin
 * registration and reduced-motion teardown would fragment across effects on
 * the same page. One module = one shared runtime.
 *
 * It imports GSAP core ONLY. Plugins are imported and passed in by the effect
 * that needs them (`tierG( ScrollTrigger )`), which is what keeps loading
 * conditional — a page with a scrub never pulls SplitText.
 *
 * House contract (mirrors `../motion-utils.js`, which the Tier V effects use):
 *   · reduced motion is checked LIVE, never cached at module load
 *   · every effect exposes `init( el ) → cleanup()`
 *   · fail-open: server-rendered markup is already the finished state, so an
 *     effect that never initialises leaves readable, complete content
 *   · bfcache-safe: a back-navigation restores a live page, not a fresh one
 *
 * @package SGS\Blocks
 */

import { gsap } from 'gsap';

/**
 * Plugins already handed to `gsap.registerPlugin()` this page-load. GSAP
 * tolerates re-registration, but tracking it keeps the work idempotent when
 * ten blocks on a page each initialise the same effect.
 *
 * @type {Set<object>}
 */
const registeredPlugins = new Set();

let defaultsApplied = false;

/**
 * Register Tier G plugins and return the shared GSAP instance.
 *
 * ⚠ Calling this is NOT optional housekeeping. Verified against gsap 3.15.0:
 * the plugins do not import core — they look it up through the global
 * `window.gsap` (`ScrollTrigger.js:81`, `SplitText.js:9`) and self-register
 * only if that global exists (`ScrollTrigger.js:2702`). An ES-module build has
 * no such global, so without this explicit call the plugin loads and then sits
 * inert, warning at most once to the console. The failure is SILENT — which is
 * why the verification for this wave asserts that plugins are REGISTERED, not
 * merely that their module was fetched.
 *
 * @param {...object} plugins Plugin objects to register (e.g. ScrollTrigger).
 * @return {object} The shared `gsap` instance.
 */
export function tierG( ...plugins ) {
	const unregistered = plugins.filter(
		( plugin ) => plugin && ! registeredPlugins.has( plugin )
	);

	if ( unregistered.length > 0 ) {
		gsap.registerPlugin( ...unregistered );
		unregistered.forEach( ( plugin ) => registeredPlugins.add( plugin ) );
	}

	if ( ! defaultsApplied ) {
		// House motion feel. Individual effects override per tween; these are
		// the values an effect gets when the client sets nothing.
		gsap.defaults( { ease: 'power2.out', duration: 0.6 } );
		defaultsApplied = true;
	}

	return gsap;
}

/**
 * Run an effect's setup ONLY while the user has not asked for reduced motion,
 * and tear it down automatically the moment they do.
 *
 * `gsap.matchMedia()` is the Tier G equivalent of `prefersReducedMotion()`'s
 * live check (Spec 38 §4.5): everything created inside the callback is owned by
 * the returned context, so when `(prefers-reduced-motion: no-preference)` stops
 * matching mid-session, GSAP reverts every tween and ScrollTrigger it created —
 * restoring the element to its server-rendered state rather than freezing it
 * part-way through an animation. That revert-on-change behaviour is why this
 * wraps matchMedia rather than doing a one-time boolean check.
 *
 * @param {Function} setup Receives the shared gsap instance; may return its own
 *                         cleanup function, run when the context reverts.
 * @return {Function} Cleanup — reverts the context and detaches listeners.
 */
export function withMotionAllowed( setup ) {
	const context = gsap.matchMedia();

	context.add( '(prefers-reduced-motion: no-preference)', () => {
		const teardown = setup( gsap );
		return typeof teardown === 'function' ? teardown : undefined;
	} );

	// bfcache: a back-navigation restores the page mid-scroll with stale
	// measurements. Any ScrollTrigger present must re-measure, or pinned
	// sections resume against positions that no longer describe the layout.
	const onPageShow = ( event ) => {
		if ( ! event.persisted ) {
			return;
		}
		const ScrollTrigger = gsap.core?.globals?.().ScrollTrigger;
		if ( ScrollTrigger?.refresh ) {
			ScrollTrigger.refresh();
		}
	};
	window.addEventListener( 'pageshow', onPageShow );

	return () => {
		window.removeEventListener( 'pageshow', onPageShow );
		context.revert();
	};
}

/**
 * Boot every element carrying a given fx effect, returning one cleanup for all
 * of them. The shared shape each effect module's entry point uses.
 *
 * Elements are matched on `data-sgs-fx` (Spec 38 §11.2). The initial hidden or
 * offset state is applied by the effect itself, never in server-rendered
 * markup — so with JS blocked, or before this runs, the content is fully
 * visible (FR-38-2 fail-open).
 *
 * @param {string}   effect Effect name as it appears in `data-sgs-fx`.
 * @param {Function} init   Per-element initialiser; may return a cleanup.
 * @return {Function} Cleanup for every element booted.
 */
export function bootEffect( effect, init ) {
	const selector = `[data-sgs-fx="${ effect }"]`;
	const elements = Array.from( document.querySelectorAll( selector ) );

	const cleanups = elements.map( ( el ) => init( el ) );

	return () => {
		cleanups.forEach( ( cleanup ) => {
			if ( typeof cleanup === 'function' ) {
				cleanup();
			}
		} );
	};
}
