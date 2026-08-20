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
 * semantic HTML level WC's own docs commit to.
 *
 * MECHANISM
 * On the FIRST MutationRecord of a burst, `Flip.getState()` captures the
 * product nodes' current geometry — this is the layout the DOM was in as the
 * burst started (idiomorph-style region diffing fires many small mutations in
 * quick succession; the leading edge is the closest available approximation
 * of "before"). Further mutations reset a debounce timer; once mutations go
 * quiet for DEBOUNCE_MS, `Flip.from()` animates from that captured state to
 * wherever the settled DOM now has the same nodes.
 *
 * No-GSAP / reduced-motion fallback: `withMotionAllowed` never runs `setup`
 * outside `(prefers-reduced-motion: no-preference)`, so the observer is never
 * attached and WooCommerce's own instant re-layout is completely unchanged.
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
 * The product nodes inside one Product Collection root.
 *
 * `:scope li` (not `:scope > li`, not a WC class) on purpose — see the module
 * docblock. WooCommerce's product list is the only `<li>`-bearing structure
 * inside this root at any depth; pagination controls render as `<nav>`/
 * `<button>`, not list items.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="flip"`.
 * @return {HTMLElement[]} Product nodes, in document order.
 */
function productNodes( el ) {
	return Array.from( el.querySelectorAll( ':scope li' ) );
}

/**
 * Initialise one Product Collection root.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="flip"`.
 * @return {Function} Cleanup that disconnects the observer.
 */
export function initFlip( el ) {
	return withMotionAllowed( ( gsap ) => {
		/** @type {object|null} Flip state captured at the start of a mutation burst. */
		let capturedState = null;
		/** @type {ReturnType<typeof setTimeout>|null} */
		let debounceTimer = null;

		const settle = () => {
			debounceTimer = null;
			if ( ! capturedState ) {
				return;
			}
			const state = capturedState;
			capturedState = null;

			Flip.from( state, {
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
			} );
		};

		const observer = new MutationObserver( () => {
			if ( ! capturedState ) {
				capturedState = Flip.getState( productNodes( el ) );
			}
			if ( debounceTimer ) {
				clearTimeout( debounceTimer );
			}
			debounceTimer = setTimeout( settle, DEBOUNCE_MS );
		} );

		observer.observe( el, { childList: true, subtree: true } );

		return () => {
			observer.disconnect();
			if ( debounceTimer ) {
				clearTimeout( debounceTimer );
			}
		};
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( Flip );

bootEffect( 'flip', initFlip );
