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
 * The pure attribute resolvers (`resolveEase`, `resolveStart`, `resolveScrub`, `resolveTrigger`,
 * `bindHoverReplay`) live in `provider-resolvers.js` and are re-exported here, so this module keeps the one
 * shared runtime (plugin registry, defaults, matchMedia gate, boot) and effects import every name from it.
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

export {
	bindHoverReplay,
	chromeOffsetPx,
	resolveEase,
	resolveScrub,
	resolveStart,
	resolveTrigger,
} from './provider-resolvers.js';

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
 * The device tier the viewport is in now, or null when it cannot be read.
 *
 * The tiers are the project's device-tier standard: mobile <=767, tablet
 * 768-1023, desktop >=1024. They are NOT arbitrary visual breakpoints, which
 * are design-driven and must never be swept into this vocabulary.
 *
 * @return {'mobile'|'tablet'|'desktop'|null} The current tier.
 */
function currentTier() {
	if ( typeof window.matchMedia !== 'function' ) {
		return null;
	}
	if ( window.matchMedia( '(max-width: 767.98px)' ).matches ) {
		return 'mobile';
	}
	if (
		window.matchMedia( '(min-width: 768px) and (max-width: 1023.98px)' )
			.matches
	) {
		return 'tablet';
	}
	return 'desktop';
}

/**
 * Is this effect switched off on this element at the CURRENT device tier?
 *
 * Two switches are read, per tier (tablet, mobile):
 *   · `data-sgs-fx-disable-<tier>`: written from the layer's per-device off
 *     setting. Present = every effect on the element is off at that tier.
 *   · `data-sgs-fx-off-<tier>`: a motion layer's `off` list (Spec 38A),
 *     written by `Sgs_Motion_Fx_Emitter` as space-separated effect slugs (the
 *     `data-sgs-fx` vocabulary). Only the listed effects are off at that
 *     tier, so a sibling effect on the same element keeps running.
 *
 * Gating here rather than inside each effect module is deliberate: `bootEffect`
 * is the one choke point every Tier G effect boots through, so a single check
 * covers every such effect present and future, with no per-effect carve-out
 * (R-31-9).
 *
 * Skipping boot is SAFE by construction: per FR-38-2 each effect applies its own
 * initial hidden/offset state and the server never renders one, so an element
 * that is never booted simply stays fully visible. Fail-open, same as JS-blocked.
 * `bootEffect` asks again on every tier change where the browser reports
 * media-query changes, so the answer is the current tier's.
 *
 * @param {HTMLElement} el     Element carrying the fx attributes.
 * @param {string}      effect Effect name as it appears in `data-sgs-fx`.
 * @return {boolean} True when this effect must not run at this viewport.
 */
export function isDisabledAtThisTier( el, effect ) {
	const tier = currentTier();
	if ( tier !== 'mobile' && tier !== 'tablet' ) {
		return false;
	}
	if ( el.hasAttribute( `data-sgs-fx-disable-${ tier }` ) ) {
		return true;
	}
	const off = el.getAttribute( `data-sgs-fx-off-${ tier }` ) || '';
	return off.split( /\s+/ ).includes( effect );
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
	const selector = `[data-sgs-fx~="${ effect }"]`;
	/*
	 * The tier gate is re-checked whenever the viewport crosses a device-tier
	 * boundary (FR-38A-23). Every matching element keeps its own state, so an
	 * effect that is off at the new tier is torn down through its cleanup
	 * (leaving the server-rendered, fully visible content) and an effect that
	 * booted off starts once its tier allows it. An element whose on/off state
	 * does not change is left alone: an enabled effect that must re-read its
	 * per-device parameters does so itself (`scroll-rows.js::rebuildOnTierChange`).
	 */
	const states = Array.from( document.querySelectorAll( selector ) ).map(
		( el ) => ( { el, cleanup: undefined, running: false } )
	);

	const start = ( state ) => {
		state.cleanup = init( state.el );
		state.running = true;
	};

	const stop = ( state ) => {
		if ( typeof state.cleanup === 'function' ) {
			state.cleanup();
		}
		state.cleanup = undefined;
		state.running = false;
	};

	states.forEach( ( state ) => {
		if ( ! isDisabledAtThisTier( state.el, effect ) ) {
			start( state );
		}
	} );

	const onTierChange = () => {
		states.forEach( ( state ) => {
			const off = isDisabledAtThisTier( state.el, effect );
			if ( off && state.running ) {
				stop( state );
			} else if ( ! off && ! state.running ) {
				start( state );
			}
		} );
	};

	// The same tier queries `currentTier()` reads. A browser without
	// matchMedia, or a returned object without addEventListener, gets no
	// listener: the boot-time decision then stands.
	const tierQueries = [
		'(max-width: 767.98px)',
		'(min-width: 768px) and (max-width: 1023.98px)',
	];
	const queries =
		typeof window.matchMedia === 'function'
			? tierQueries
					.map( ( query ) => window.matchMedia( query ) )
					.filter(
						( list ) =>
							list && typeof list.addEventListener === 'function'
					)
			: [];
	queries.forEach( ( query ) =>
		query.addEventListener( 'change', onTierChange )
	);

	return () => {
		queries.forEach( ( query ) => {
			if ( typeof query.removeEventListener === 'function' ) {
				query.removeEventListener( 'change', onTierChange );
			}
		} );
		states.forEach( ( state ) => {
			if ( state.running ) {
				stop( state );
			}
		} );
	};
}
