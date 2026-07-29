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
 * `setup` also receives the matchMedia CONTEXT as its second argument
 * (gold-standard item 14, [MUST]). A `gsap.matchMedia()` call already creates
 * a `gsap.context()` internally, so a consumer that needs its OWN breakpoint
 * (e.g. `fx-horizontal-panel.js`'s desktop-only `min-width:768px` split) must
 * register it on THIS context via `context.add(query, handler)` rather than
 * minting a second, nested `gsap.matchMedia()`/`gsap.context()` inside the
 * `setup` callback — nesting reverts the same trigger twice and is documented
 * as redundant. `setup( gsap )` — one argument — keeps working unchanged for
 * every consumer that has no breakpoint of its own (`fx-scrub.js`,
 * `fx-pin-scrub.js`, `fx-split-reveal.js`); the second parameter is additive.
 *
 * @param {Function} setup Receives the shared gsap instance and this call's
 *                         matchMedia context; may return its own cleanup
 *                         function, run when the context reverts.
 * @return {Function} Cleanup — reverts the context and detaches listeners.
 */
/**
 * Height of the persistent chrome occupying the top of the viewport, in px.
 *
 * WHY PINNING EFFECTS MUST KNOW THIS
 * ScrollTrigger's `pin` holds an element wherever it sat when the trigger
 * fired. With the default `start: 'top top'` that is viewport y=0 — space the
 * sticky site header already owns. Measured on the canary: header 93px at
 * `z-index: 100`, pinned element `position: fixed` at `z-index: auto`, so the
 * header wins the paint contest and the top 93px of the pinned section is
 * invisible for the entire pin. A heading in that band is simply gone.
 *
 * ⚠ RAISING THE PINNED ELEMENT'S z-index IS THE WRONG FIX. It inverts the
 * problem: the section then covers the header, so navigation disappears for the
 * duration of the pin and any focusable header control stays in the tab order
 * while being visually obscured — a WCAG 2.4.11 focus-obscured failure. Trading
 * a hidden heading for hidden navigation is strictly worse. The defect is
 * GEOMETRY, not stacking: move the pin below the chrome and nothing competes
 * for those pixels at all.
 *
 * WHY THE CSS CUSTOM PROPERTY, RATHER THAN MEASURING HERE
 * `--sgs-header-height` is not a static guess. `src/header-behaviours/view.js`
 * measures the header with a ResizeObserver and publishes the rounded px value
 * to `:root` and `body`, so it tracks shrink-on-scroll and per-breakpoint
 * heights. (The `80px` literal in `theme/.../utilities.css` is only the pre-JS
 * fallback; verified live, the published value reads 93px and matches the
 * measured header exactly.) Critically, that module publishes an explicit `0`
 * when the header is NOT pinned — it gates on the COMPUTED position, which is
 * the only reliable signal here: a header set both sticky and transparent
 * computes `absolute` and is not pinned despite still carrying the sticky body
 * class. So conditionality comes free, and a non-sticky header self-disables
 * the offset.
 *
 * Re-measuring the header in this file would recreate the duplicate
 * `--sgs-header-height` publisher the project deliberately deleted (D330,
 * 2026-07-14) and would have to re-derive that sticky-vs-transparent rule —
 * a known trap. Consuming the published value inherits the reasoning instead.
 *
 * @return {number} Offset in px; 0 when nothing persistent occupies the top.
 */
export function chromeOffsetPx() {
	let offset = 0;

	const published = getComputedStyle( document.documentElement )
		.getPropertyValue( '--sgs-header-height' )
		.trim();
	const parsed = parseFloat( published );

	if ( Number.isFinite( parsed ) ) {
		offset = parsed;
	} else {
		// Fallback for a page where header-behaviours/view.js is not enqueued:
		// measure, but gate on the same COMPUTED-position test that module uses
		// so a non-pinned header still yields 0.
		const header = document.querySelector( 'header' );
		if ( header ) {
			const position = getComputedStyle( header ).position;
			if ( 'sticky' === position || 'fixed' === position ) {
				offset = header.getBoundingClientRect().height;
			}
		}
	}

	// The admin bar is a SEPARATE term — `--sgs-header-height` deliberately
	// excludes it (utilities.css composes them with calc() for scroll-padding).
	// It is fixed to the very top for logged-in users only, so it is measured
	// from the live element rather than assumed: reading the CSS var with a
	// 32px default would wrongly add 32px for every logged-OUT visitor.
	// Worth knowing when triaging: this term makes the defect look worse when
	// signed in and can vanish entirely in a logged-out check.
	const adminBar = document.getElementById( 'wpadminbar' );
	if ( adminBar && 'fixed' === getComputedStyle( adminBar ).position ) {
		offset += adminBar.getBoundingClientRect().height;
	}

	return offset;
}

/**
 * Resolve a pinning effect's ScrollTrigger `start`, clearing persistent chrome.
 *
 * ⚠ Only the module's DEFAULT is offset. An author-set `data-sgs-fx-start` is
 * returned untouched: silently appending an offset to a deliberately authored
 * value would be the "injected default overrides the faithful value" pattern
 * this project treats as a cheat to remove, not a feature to add.
 *
 * @param {HTMLElement} el       Element carrying the fx attributes.
 * @param {string}      fallback The module's own default (e.g. 'top top').
 * @return {string} A ScrollTrigger `start` string.
 */
export function resolveStart( el, fallback = 'top top' ) {
	const authored = el.getAttribute( 'data-sgs-fx-start' );
	if ( null !== authored && '' !== authored.trim() ) {
		return authored;
	}

	const offset = Math.round( chromeOffsetPx() );
	return offset > 0 ? `top top+=${ offset }` : fallback;
}

/**
 * Resolve a scrub setting from `data-sgs-fx-scrub`.
 *
 * GSAP semantics: `scrub: true` ties progress directly to the scrollbar with no
 * lag; `scrub: <number>` adds that many seconds of catch-up smoothing. So a
 * client-chosen **0 means "no smoothing" and must map to `true`**, not to a
 * falsy value.
 *
 * ⚠ This must be an EXPLICIT mapping, not `numericParam(...) || true`. That
 * older form only worked by accident: 0 is falsy, so it fell through to `true`.
 * The accident was invisible and one tidy-up away from becoming a real bug —
 * remove the `|| true` as redundant and a deliberate 0 silently becomes a falsy
 * `scrub`, disabling scrubbing altogether. Stating the intent removes the trap.
 *
 * (The other half of this fix lives in the save/render layers, which used to
 * drop a zero before it ever reached this function.)
 *
 * @param {HTMLElement} el       Element carrying the fx attributes.
 * @param {number}      fallback Smoothing to use when unset.
 * @return {number|boolean} Seconds of smoothing, or `true` for none.
 */
export function resolveScrub( el, fallback = 1 ) {
	const raw = el.getAttribute( 'data-sgs-fx-scrub' );
	const parsed = null === raw ? NaN : parseFloat( raw );
	const seconds = Number.isFinite( parsed ) ? parsed : fallback;
	return seconds > 0 ? seconds : true;
}

export function withMotionAllowed( setup ) {
	const context = gsap.matchMedia();

	context.add( '(prefers-reduced-motion: no-preference)', () => {
		const teardown = setup( gsap, context );
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

	/*
	 * Late-loading content: ScrollTrigger resolves `start`/`end` to PIXEL
	 * positions when it initialises. An image without width/height attributes
	 * finishing later pushes everything below it down, so those pixel positions
	 * no longer describe where the element actually is — the scroll window
	 * lands somewhere else entirely and the effect appears not to fire, or
	 * fires off-screen.
	 *
	 * Silent, intermittent, and worst on slow connections — i.e. worst for the
	 * visitors least able to tolerate it, on exactly the image-heavy marketing
	 * pages these effects are built for. One refresh after `load` re-resolves
	 * every trigger against final layout.
	 *
	 * Once only: `load` fires a single time, and the listener is detached on
	 * cleanup so a reduced-motion revert does not leave it attached.
	 */
	const onLoad = () => {
		const ScrollTrigger = gsap.core?.globals?.().ScrollTrigger;
		if ( ScrollTrigger?.refresh ) {
			ScrollTrigger.refresh();
		}
	};
	if ( 'complete' === document.readyState ) {
		onLoad();
	} else {
		window.addEventListener( 'load', onLoad, { once: true } );
	}

	return () => {
		window.removeEventListener( 'pageshow', onPageShow );
		window.removeEventListener( 'load', onLoad );
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
