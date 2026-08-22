/**
 * Tier G effect — GSAP Flip layout transition for WooCommerce Product
 * Collection re-filtering. Spec 38 FR-38-12, redirected 2026-08-20 from the
 * dead `sgs/filter-search` ↔ `sgs/card-grid` pairing (D426) to WooCommerce's
 * native Product Collection block.
 *
 * Design gate: `.claude/plans/2026-08-20-flip-woocommerce-product-collection-design-gate.md`.
 *
 * WHY A MUTATIONOBSERVER, NOT WOOCOMMERCE'S INTERACTIVITY API ROUTER
 * Product Collection re-filters via the WordPress Interactivity API's
 * client-side router (`data-wc-navigation-id` region diffing), whose internal
 * markup (`.wc-block-product-template`, `.wc-block-product`) WooCommerce
 * documents as "private, subject to change without notice". Hooking Flip into
 * that router would tie SGS to an implementation WC has explicitly reserved
 * the right to change. `.wp-block-woocommerce-product-collection` — the
 * element this module watches, via `data-sgs-fx="flip"` on the same node — IS
 * part of WC's public contract, so a MutationObserver on it survives WC
 * internal refactors with no coupling to router internals.
 *
 * WHY `:scope li`, NOT A WC-SPECIFIC CLASS
 * Reading `[data-sgs-fx="flip"] li` (via `:scope li` below) rather than
 * `.wc-block-product` means a WC class-name change cannot break detection —
 * only a change to "products render as list items" would, which is the
 * semantic HTML level WC's own docs commit to. This module resolves the
 * product LIST ONCE (`productList()`) and reads only its direct `<li>`
 * children — see the docblock on `productNodes()` for why "any nested `<li>`
 * anywhere in the root" was too loose for this framework's own product-page
 * component set.
 *
 * MECHANISM
 * A `MutationObserver` callback is NEVER a "before" moment — it is only ever
 * delivered (as a microtask) after the mutation it reports has already been
 * applied to the DOM. This was proven live on the canary (2026-08-20): the
 * FIRST mutation record that ever touches a product `<li>` already reports
 * the fully-settled POST-filter geometry, byte-identical to the geometry
 * measured 2 seconds later once everything has long finished moving. So
 * `Flip.getState()` cannot be called inside the observer callback itself —
 * doing so captures the "after" state twice and Flip always computes a
 * zero-pixel delta (the ORIGINAL bug: FR-38-12 shipped fully wired, with the
 * observer firing correctly, `Flip.from()` reached correctly, and NO visible
 * animation ever, because there was no genuine "before" to flip from).
 *
 * The fix: keep a snapshot, `lastFrameState`, refreshed on
 * `requestAnimationFrame` ticks BEFORE any mutation can have landed for that
 * frame — so it is always **at most one frame (~16.7ms) old**, frozen the
 * instant the first LI-touching mutation is seen (`requestAnimationFrame`
 * gives no stronger ordering guarantee than that against an arbitrary
 * task/microtask DOM write, so that is the property this module actually
 * relies on — not a claim that the snapshot "necessarily" predates every
 * possible mutation). When the observer sees a mutation that actually
 * touches a product `<li>` (see `touchesProductNode()` below — a second,
 * independently proven defect: the watched subtree carries a continuous,
 * filtering-unrelated ~200ms `childList` mutation stream even at total page
 * idle, from the Product Template's own resize/scroll-watch sentinel
 * `<div>`s, which would otherwise thrash the debounce and race the real
 * capture), it adopts `lastFrameState` as `capturedState`. Further
 * LI-touching mutations reset a debounce timer; once mutations go quiet for
 * DEBOUNCE_MS, `Flip.from()` animates from that genuinely-prior state to
 * wherever the settled DOM now has the same nodes.
 *
 * WHY THE rAF LOOP IS ARMED, NOT ALWAYS-ON
 * A loop reading `Flip.getState()` — which reads `getBoundingClientRect()`
 * and computed style per product node — every frame for the life of the page
 * would touch layout ~60 times/second at total idle, regardless of whether
 * anyone ever filters. The snapshot only has to predate the mutation, and
 * the mutation is always downstream of a user interaction or a history
 * navigation, so the loop is armed for a short window on `pointerdown` /
 * `keydown` / `change` / `submit` / `popstate` and stops itself the moment
 * that window lapses with nothing in flight. Idle cost is zero. See `arm()`
 * and `tick()` below.
 *
 * No-GSAP / reduced-motion fallback: `withMotionAllowed` never runs `setup`
 * outside `(prefers-reduced-motion: no-preference)`, so neither the observer
 * nor the rAF loop is ever started, and WooCommerce's own instant re-layout
 * is completely unchanged.
 *
 * Editor story: no-preview (Spec 38 §9) — filter interaction does not exist
 * in the block-editor canvas, so this module has nothing to do there and is
 * never enqueued for a `ServerSideRender` request (see `sgs_is_frontend_render()`
 * gating in `SGS_Motion_Registry::sniff_block()`).
 *
 * @package SGS\Blocks
 */

import { Flip } from 'gsap/Flip';
import { tierG, withMotionAllowed, bootEffect } from '@sgs/motion-provider';

/**
 * How long a burst of mutations must go quiet before Flip runs.
 *
 * Region diffing on a re-filter fires many small `childList` mutations across
 * a handful of frames rather than one atomic swap. 150-200ms is the accepted
 * range in the design gate; 180ms is picked as the midpoint — comfortably
 * longer than a single diff pass, short enough that the animation still reads
 * as an immediate reaction to the filter change rather than a lag.
 *
 * @type {number}
 */
const DEBOUNCE_MS = 180;

/**
 * How long the rAF snapshot loop stays armed after an interaction, in ms.
 *
 * Must comfortably outlast the slowest realistic round-trip from interaction
 * to the Interactivity router's DOM diff landing (network fetch + render),
 * or the loop can disarm mid-flight and hand the observer a stale snapshot.
 * The observer callback re-extends this window itself (see below) so a slow
 * response is covered regardless of this constant's exact value; 2000ms is a
 * generous single-shot window for the common case of no observed activity.
 *
 * @type {number}
 */
const ARM_MS = 2000;

/**
 * The product LIST inside one Product Collection root, resolved once.
 *
 * Cached per root on first access via a WeakMap so repeated calls don't
 * re-run `querySelector` every frame the loop is armed.
 *
 * @type {WeakMap<HTMLElement, HTMLElement|null>}
 */
const listCache = new WeakMap();

/**
 * Resolve the product list element for a Product Collection root.
 *
 * WooCommerce's product list is a single `<ul>`/`<ol>` inside the root; only
 * its DIRECT `<li>` children are products. Earlier revisions of this module
 * read `:scope li` (any depth) on the assumption that the product list was
 * the only `<li>`-bearing structure inside the root — this framework's own
 * product-surface components disprove that: `sgs/option-picker` pill groups,
 * `sgs/product-card` variant pickers, star ratings, and `sgs/icon-list` can
 * all render `<li>` nested inside a product card. A nested `<li>` inflated
 * the per-frame `Flip.getState()` cost and made `touchesProductNode()` fire
 * on card-LOCAL interactions (e.g. picking a size), triggering a whole-
 * collection Flip for something that never actually re-filtered.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="flip"`.
 * @return {HTMLElement|null} The resolved list element, or null if absent.
 */
function productList( el ) {
	if ( listCache.has( el ) ) {
		return listCache.get( el );
	}
	const list = el.querySelector( 'ul, ol' );
	listCache.set( el, list );
	return list;
}

/**
 * The product nodes inside one Product Collection root.
 *
 * Direct `<li>` children of the resolved product list ONLY — see
 * `productList()` for why this stopped being `:scope li` at any depth.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="flip"`.
 * @return {HTMLElement[]} Product nodes, in document order.
 */
function productNodes( el ) {
	const list = productList( el );
	return list ? Array.from( list.children ).filter( ( node ) => node.matches( 'li' ) ) : [];
}

/**
 * Whether a burst of MutationRecords includes a product `<li>` being added
 * or removed FROM THE RESOLVED PRODUCT LIST.
 *
 * Proven live (2026-08-20): the watched subtree carries a continuous
 * `childList` mutation stream — roughly one burst every 200ms, present even
 * with zero user interaction — from `<ul data-wp-init="callbacks.initResizeObserver">`'s
 * own resize/scroll-watch sentinel `<div>`s (`position:absolute;
 * pointer-events:none`, added then immediately removed). None of that is a
 * WC-private class or internal we're coupling to — this filters on the same
 * "products render as list items" semantic-HTML signal `productNodes()`
 * already commits to, just applied to the mutation records instead of a
 * live query. Without this filter, that noise resets the debounce timer on
 * a ~200ms cadence indefinitely and can starve a genuine re-filter of a
 * clean settle window.
 *
 * The record's target must also BE the resolved product list — not just any
 * `<li>` anywhere in the subtree — for the same reason `productNodes()` only
 * reads the list's direct children: a card-local `<li>` mutation (an
 * option-picker pill re-rendering inside one product card) must not trigger
 * a whole-collection Flip.
 *
 * @param {MutationRecord[]} records Records from one observer callback.
 * @param {HTMLElement|null} list    The resolved product list for this root.
 * @return {boolean} True if any record's added/removed nodes include an `<li>`
 *                    whose mutation target is the product list itself.
 */
function touchesProductNode( records, list ) {
	if ( ! list ) {
		return false;
	}
	const isLi = ( node ) => node.nodeType === Node.ELEMENT_NODE && node.matches( 'li' );
	return records.some(
		( record ) =>
			record.target === list &&
			( Array.from( record.addedNodes ).some( isLi ) ||
				Array.from( record.removedNodes ).some( isLi ) )
	);
}

/**
 * Initialise one Product Collection root.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="flip"`.
 * @return {Function} Cleanup that disconnects the observer, the rAF loop and
 *                     the arming listeners, and kills any in-flight tween.
 */
export function initFlip( el ) {
	return withMotionAllowed( ( gsap, context ) => {
		/** @type {object|null} The state Flip will animate FROM, once settled. */
		let capturedState = null;
		/** @type {ReturnType<typeof setTimeout>|null} */
		let debounceTimer = null;
		/** @type {ReturnType<typeof requestAnimationFrame>|null} */
		let rafId = null;
		/** @type {gsap.core.Tween|null} The in-flight Flip tween, if any. */
		let flipTween = null;
		/** @type {number} Timestamp (performance.now()) the rAF loop stays armed until. */
		let armUntil = 0;

		const list = productList( el );

		// A continuously-refreshed "before" snapshot — see the module docblock
		// MECHANISM section for why this exists: a MutationObserver callback
		// cannot supply a genuine "before" state itself, because by the time it
		// fires the mutation it reports has already been applied. Re-captured
		// every frame ONLY while armed AND no re-filter is currently captured
		// or animating, so it's always the geometry from immediately before
		// whatever mutation is about to be observed.
		let lastFrameState = Flip.getState( productNodes( el ) );

		const tick = () => {
			if ( performance.now() >= armUntil || capturedState || flipTween ) {
				rafId = null;
				return;
			}
			lastFrameState = Flip.getState( productNodes( el ) );
			rafId = requestAnimationFrame( tick );
		};

		/**
		 * Extend the arm window and (re)start the rAF loop if it isn't running.
		 *
		 * Called on every interaction signal AND from inside the observer
		 * callback — the latter so a slow network round-trip between the
		 * interaction and the router's DOM diff landing cannot let the window
		 * lapse mid-flight and disarm the loop before the mutation is seen.
		 */
		const arm = () => {
			armUntil = performance.now() + ARM_MS;
			if ( rafId === null ) {
				lastFrameState = Flip.getState( productNodes( el ) );
				rafId = requestAnimationFrame( tick );
			}
		};

		const settle = () => {
			debounceTimer = null;
			if ( ! capturedState ) {
				return;
			}
			const state = capturedState;
			capturedState = null;

			Flip.killFlipsOf( productNodes( el ) );

			// NOT context.add(fn) — `context` here is the MatchMedia instance
			// withMotionAllowed() passes into every effect's setup(gsap, context),
			// and MatchMedia#add() has signature (conditions, func, scope), never
			// a bare single function. Calling it with just an arrow function makes
			// GSAP treat that function itself AS the "conditions" argument: it
			// gets wrapped as {matches: fn}, then window.matchMedia(fn) is called
			// with a function coerced to a (nonsense) query string, which never
			// matches — so `active` stays falsy and the wrapped callback (the
			// actual Flip.from() call) is registered but NEVER INVOKED. This was
			// the entire cause of FR-38-12 never animating: the module reached
			// this line and returned a truthy `flipTween` every time (the return
			// value of a no-op MatchMedia#add() call, not a Flip tween), so every
			// upstream check ("did settle() run", "was Flip.from called") looked
			// healthy while nothing GSAP actually managed ever ticked.
			// Cleanup here doesn't need GSAP's context auto-tracking anyway —
			// `flipTween?.kill()` in the returned teardown already handles it
			// manually — so call Flip.from() directly.
			flipTween = Flip.from( state, {
				duration: 0.5,
				ease: 'power2.out',
				// Per-item stagger, so a re-filter reads as cards resettling one
				// after another rather than the whole grid snapping as one block.
				stagger: 0.03,
				// A card moving between positions passes over cards mid-transit;
				// `absolute` takes each flipping element out of flow for the
				// duration so those overlaps don't fight the grid's own layout.
				absolute: true,
				nested: true,
				onComplete: () => {
					flipTween = null;
				},
			} );
		};

		const observer = new MutationObserver( ( records ) => {
			if ( ! touchesProductNode( records, list ) ) {
				return;
			}
			// Extend the arm window — see the docblock on `arm()`.
			arm();
			if ( ! capturedState ) {
				capturedState = lastFrameState;
			}
			if ( debounceTimer ) {
				clearTimeout( debounceTimer );
			}
			debounceTimer = setTimeout( settle, DEBOUNCE_MS );
		} );

		observer.observe( el, { childList: true, subtree: true } );

		// Arm on any plausible pre-mutation interaction signal. `popstate` is
		// required because the Interactivity router restores filtered state on
		// back/forward navigation with no preceding in-page event to arm on.
		const armEvents = [ 'pointerdown', 'keydown', 'change', 'submit' ];
		armEvents.forEach( ( type ) =>
			document.addEventListener( type, arm, { capture: true, passive: true } )
		);
		window.addEventListener( 'popstate', arm );

		return () => {
			observer.disconnect();
			if ( debounceTimer ) {
				clearTimeout( debounceTimer );
			}
			if ( rafId !== null ) {
				cancelAnimationFrame( rafId );
				rafId = null;
			}
			flipTween?.kill();
			armEvents.forEach( ( type ) =>
				document.removeEventListener( type, arm, { capture: true } )
			);
			window.removeEventListener( 'popstate', arm );
		};
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( Flip );

bootEffect( 'flip', initFlip );
