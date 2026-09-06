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
import { chromeOffsetPx } from '../motion-utils.js';

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
 * `setup` also receives the matchMedia CONTEXT as its second argument. It is
 * available for consumers that want it; `setup( gsap )` — one argument — keeps
 * working unchanged for every consumer that has no breakpoint of its own
 * (`fx-scrub.js`, `fx-pin-scrub.js`, `fx-split-reveal.js`).
 *
 * ⚠ DO NOT register a consumer's OWN breakpoint on this context (D416,
 * 2026-07-30). An earlier note here instructed exactly that, on the grounds
 * that nesting "reverts the same trigger twice and is documented as redundant".
 * Both halves were wrong, and acting on it would have shipped an accessibility
 * regression:
 *
 *   · GSAP's docs say nesting a manual `gsap.context()` inside a matchMedia is
 *     REDUNDANT. They nowhere say it reverts anything twice, and they are not
 *     talking about a nested `gsap.matchMedia()` at all.
 *   · Verified against the compiled GSAP 3.15.0 in
 *     `build/vendor-modules/gsap-core.js`: `MatchMedia`'s constructor runs
 *     `s && s.data.push(this)`, so a matchMedia created inside an active
 *     context self-registers with it and the parent cleans it up. Nesting is
 *     supported, not a leak.
 *   · Decisively: conditions added to ONE MatchMedia are INDEPENDENT SIBLINGS.
 *     Each `.add()` constructs its own Context and fires purely on its own
 *     query. So `context.add('(min-width: 768px)', …)` here would run for a
 *     visitor who asked for reduced motion — while the CSS that stands the
 *     native scroller down remains gated on `no-preference`, leaving a GSAP pin
 *     and a native scroller fighting over the same element.
 *
 * A consumer needing its own breakpoint should keep nesting its own
 * `gsap.matchMedia()` inside `setup` (as `fx-horizontal-panel.js` does). That
 * nested instance is gated by reduced motion for free, because `setup` only
 * ever runs inside the no-preference condition below.
 *
 * @param {Function} setup Receives the shared gsap instance and this call's
 *                         matchMedia context; may return its own cleanup
 *                         function, run when the context reverts.
 * @return {Function} Cleanup — reverts the context and detaches listeners.
 */
export { chromeOffsetPx };

/**
 * Resolve an effect's ScrollTrigger `start`, optionally clearing sticky chrome.
 *
 * ⚠ Only the module's DEFAULT is ever offset. An author-set `data-sgs-fx-start`
 * is returned untouched: silently appending an offset to a deliberately authored
 * value would be the "injected default overrides the faithful value" pattern
 * this project treats as a cheat to remove, not a feature to add.
 *
 * WHY `clearChrome` EXISTS — DO NOT DELETE IT AS REDUNDANT PLUMBING
 * This helper was written for PINNING effects, and for those the chrome offset
 * is the whole point: a pin parks the section wherever the trigger fired, so a
 * bare `top top` parks it UNDER the sticky header and hides its top edge for the
 * entire pin (see `chromeOffsetPx()` above for the measured case and for why
 * raising z-index is the wrong fix).
 *
 * But `top top+=93` is not a translation of an arbitrary start — it is a
 * DIFFERENT START. For a non-pinning effect the module default expresses "how
 * far into the viewport should the element be before this begins", e.g.
 * `top 85%` = "once its top has risen to 85% of the viewport height". Rewriting
 * that to `top top+=93` moves the trigger to "once its top is nearly at the top
 * of the screen" — near the END of the element's visible life rather than the
 * start of it. Shipped that way, the offset was applied UNCONDITIONALLY whenever
 * a sticky header existed (i.e. on every real site), so three non-pinning
 * modules silently lost their own defaults:
 *
 *   · fx-draw            `top 85%`    → `top top+=93`
 *   · fx-image-sequence  `top 80%`    → `top top+=93`
 *   · fx-motion-path     `top bottom` → `top top+=93`
 *
 * Owner-observed on the canary: the logo only finished drawing once it was
 * mostly hidden behind the header, and the scrubbed image sequence did not
 * begin until the block was nearly off the top of the screen. Corroborated by
 * measurement — `reports/visual-diff/image-sequence-2026-07-31.md` recorded
 * canvas luminance FLAT at 86.14 for scroll fractions 0.00, 0.25 and 0.50, i.e.
 * 60% of the scroll pass produced no visible change at all.
 *
 * So the chrome offset is opt-IN. A caller asks for it only when the effect
 * genuinely parks content at the top of the viewport — today that is
 * `fx-pin-scrub.js` and `fx-horizontal-panel.js`, the two modules that set
 * `pin: true`. Every other caller gets its own default back verbatim.
 *
 * @param {HTMLElement} el                    Element carrying the fx attributes.
 * @param {string}      fallback              The module's own default.
 * @param {Object}      [options]             Behaviour switches.
 * @param {boolean}     [options.clearChrome] Offset the fallback below sticky
 *                                            chrome. ONLY for effects that pin.
 * @return {string} A ScrollTrigger `start` string.
 */
export function resolveStart( el, fallback = 'top top', options = {} ) {
	const authored = el.getAttribute( 'data-sgs-fx-start' );
	if ( null !== authored && '' !== authored.trim() ) {
		return authored;
	}

	const { clearChrome = false } = options;
	if ( ! clearChrome ) {
		return fallback;
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
/**
 * Resolve WHEN an effect should fire — Spec 38 §11.2's `load | scroll | hover`.
 *
 * Unset, blank or unrecognised all resolve to `scroll`, the module default.
 * Falling back rather than honouring an unknown string matters because the
 * editor only ever offers the values an effect declares in `fx_effects.triggers`;
 * anything else reaching here came from hand-edited markup, and guessing at it
 * would be worse than doing the ordinary thing.
 *
 * @param {HTMLElement} el Element carrying the fx attributes.
 * @return {'scroll'|'load'|'hover'} The resolved trigger.
 */
export function resolveTrigger( el ) {
	const raw = el.getAttribute( 'data-sgs-fx-trigger' );
	const value = raw && raw.trim() ? raw.trim() : 'scroll';
	return 'load' === value || 'hover' === value ? value : 'scroll';
}

/**
 * Bind a paused tween to hover, and to keyboard focus.
 *
 * ⚠ THE CALLER MUST CREATE THE TWEEN WITH `paused: true` AND
 * `immediateRender: false`. That pairing is what makes this arm safe rather
 * than merely convenient, and it is not a style preference:
 *
 * These effects are `fromTo` tweens whose FROM state is `opacity: 0`. `fromTo`
 * renders its from-state immediately by default, so a tween that is waiting for
 * a trigger has ALREADY hidden its element. If that trigger then never arrives
 * — a touch device with no hover, a visitor who never points at the element,
 * a section containing nothing focusable — the content stays invisible
 * permanently. That is unreachable content, which Spec 38 treats as a defect
 * rather than a degradation.
 *
 * With `immediateRender: false` the element simply stays as the server rendered
 * it (visible, finished) until something plays the tween, and hover REPLAYS the
 * reveal rather than releasing it. No hover capability means no replay and no
 * harm — the safety needs no device sniffing, no `(hover: none)` branch, and no
 * assumption about how the visitor is browsing.
 *
 * `focusin` is bound alongside `mouseenter` so a keyboard user reaching a
 * focusable descendant gets the same effect a pointer user gets. It is parity,
 * not the safety mechanism — the safety is the paragraph above, which holds
 * even for an element with nothing focusable in it.
 *
 * @param {HTMLElement} el    Element to watch.
 * @param {Object}      tween The paused tween to replay.
 * @return {Function} Cleanup that detaches both listeners.
 */
export function bindHoverReplay( el, tween ) {
	const replay = () => tween.restart();

	el.addEventListener( 'mouseenter', replay );
	el.addEventListener( 'focusin', replay );

	return () => {
		el.removeEventListener( 'mouseenter', replay );
		el.removeEventListener( 'focusin', replay );
	};
}

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
/**
 * Is this element disabled at the CURRENT device tier?
 *
 * Reads `data-sgs-fx-disable-tablet` / `-mobile` (Step 15). The tiers are the
 * project's device-tier standard — mobile <=767, tablet 768-1023, desktop
 * >=1024 — NOT arbitrary visual breakpoints, which are design-driven and must
 * never be swept into this vocabulary.
 *
 * Gating here rather than inside each effect module is deliberate: `bootEffect`
 * is the one choke point every effect boots through, so a single check covers
 * every effect present and future, with no per-effect carve-out (R-31-9).
 *
 * Skipping boot is SAFE by construction: per FR-38-2 each effect applies its own
 * initial hidden/offset state and the server never renders one, so an element
 * that is never booted simply stays fully visible. Fail-open, same as JS-blocked.
 *
 * @param {HTMLElement} el Element carrying the fx attributes.
 * @return {boolean} True when the effect must not run at this viewport.
 */
function isDisabledAtThisTier( el ) {
	if ( typeof window.matchMedia !== 'function' ) {
		return false;
	}
	if (
		el.hasAttribute( 'data-sgs-fx-disable-mobile' ) &&
		window.matchMedia( '(max-width: 767px)' ).matches
	) {
		return true;
	}
	return (
		el.hasAttribute( 'data-sgs-fx-disable-tablet' ) &&
		window.matchMedia( '(min-width: 768px) and (max-width: 1023px)' ).matches
	);
}

export function bootEffect( effect, init ) {
	const selector = `[data-sgs-fx="${ effect }"]`;
	/*
	 * Evaluated once, at boot. A visitor who RESIZES across a tier boundary
	 * mid-session keeps whatever was decided on load — re-booting effects on
	 * resize would mean tearing down and rebuilding live ScrollTriggers, which
	 * is a materially riskier change than this one and is not what Step 15
	 * asked for. Stated here rather than left for someone to discover.
	 */
	const elements = Array.from( document.querySelectorAll( selector ) ).filter(
		( el ) => ! isDisabledAtThisTier( el )
	);

	const cleanups = elements.map( ( el ) => init( el ) );

	return () => {
		cleanups.forEach( ( cleanup ) => {
			if ( typeof cleanup === 'function' ) {
				cleanup();
			}
		} );
	};
}
