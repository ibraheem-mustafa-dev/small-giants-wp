/**
 * Tier G effect — horizontal scroll panel. Spec 38 FR-38-8.
 *
 * A `sgs/container` block variation ("Horizontal scroll section"): vertical
 * scroll maps to horizontal travel of a pinned row of panels. Desktop-only
 * upgrade — mobile (<768px) and reduced motion both fall back to the SAME
 * native horizontal scroll-snap the Tier V carousel pattern already uses.
 *
 * FAIL-OPEN CONTRACT (read before touching this file):
 * the fallback for BOTH mobile and reduced-motion is CSS, not JS. The block's
 * own `style.css` must render `[data-sgs-fx="horizontal-panel"]` as a native
 * `overflow-x: auto; scroll-snap-type: x mandatory;` row by default (with its
 * track's children `scroll-snap-align: start`) — that is the SSR finished
 * state (FR-38-2). This module never builds or removes that fallback; it only
 * UPGRADES a desktop, motion-allowed page to a pinned GSAP-driven translate.
 * That split is deliberate: `withMotionAllowed` never runs this module's
 * setup at all under reduced motion, so if the scroll-snap fallback lived
 * behind a JS-applied class, reduced-motion users would land on a page with
 * NEITHER the pin NOR the fallback — unreachable content, which the build
 * brief calls out explicitly as a defect, not a degradation. Putting the
 * fallback in the block's static CSS instead means it is always present and
 * this module only ever ADDS behaviour on top, never gates access to it.
 *
 * Track markup contract (REASONED — the spec names the mechanism, "pinned
 * row", but not the DOM convention): the pinned element's scrollable content
 * lives in a single child carrying `data-sgs-fx-track` (the row that gets
 * translated). If no such child exists, this module falls back to the
 * element's first child — but flags that as a fallback rather than a silent
 * guess, since a wrong track element would translate the wrong thing.
 *
 * Reduced motion (§10): SIMPLIFY — falls back to native horizontal
 * scroll-snap, content reachable, nothing moves by itself. See the fail-open
 * note above for how that is structurally guaranteed rather than JS-applied.
 *
 * @package SGS\Blocks
 */

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	tierG,
	withMotionAllowed,
	bootEffect,
	resolveStart,
} from '@sgs/motion-provider';

/**
 * Read a string fx parameter, falling back when absent/blank. Mirrors the
 * helper in `fx-pin-scrub.js` — kept file-local per this wave's file-per-
 * effect boundary (no shared param-reading util exists yet).
 *
 * @param {HTMLElement} el       Element carrying the data attributes.
 * @param {string}      name     Attribute suffix (e.g. 'start').
 * @param {string}      fallback Value when unset.
 * @return {string} The resolved value.
 */
function stringParam( el, name, fallback ) {
	const raw = el.getAttribute( `data-sgs-fx-${ name }` );
	return raw && raw.trim() ? raw.trim() : fallback;
}

/**
 * Resolve the track element whose horizontal position gets tweened.
 *
 * @param {HTMLElement} el The pinned panel container.
 * @return {HTMLElement|null} The track element, or null if the container is
 *                            empty (nothing to pin against).
 */
function resolveTrack( el ) {
	const marked = el.querySelector( ':scope > [data-sgs-fx-track]' );
	if ( ! marked ) {
		// No server-side mark: the wrapper did not emit an inner element, so
		// every remaining candidate belongs to a child. Bail rather than
		// translate the wrong thing — the CSS scroll-snap fallback still works.
		return null;
	}

	/*
	 * The element to translate is the marked element's CONTENT WRAPPER, not the
	 * marked element itself. Verified against the rendered DOM:
	 *
	 *   <section data-sgs-fx="horizontal-panel">
	 *     <div class="sgs-container__inner" data-sgs-fx-track>   <- marked
	 *       <div class="wp-block-sgs-container">                 <- translate THIS
	 *         <section> panel … </section>
	 *
	 * `__inner` wraps the block's InnerBlocks content wrapper, so it always has
	 * exactly ONE child. Translating `__inner` moved a row containing a single
	 * shrink-to-content item: measured 96px against a 1200px container, so
	 * scrollWidth never exceeded clientWidth, travel distance was zero, and the
	 * effect silently did nothing at all.
	 *
	 * Falls back to the marked element itself so a container whose content is
	 * NOT wrapped still animates rather than dying.
	 */
	return (
		marked.querySelector( ':scope > .wp-block-sgs-container' ) || marked
	);
}

/**
 * Initialise one horizontal-panel section. Desktop (≥768px) ONLY — the
 * `gsap.matchMedia` breakpoint below is the tier split FR-38-8 calls for
 * ("mobile falls back to native horizontal scroll-snap, NOT a pinned
 * translate"); this is not a progressive enhancement of the mobile layout,
 * it is a DIFFERENT layout entirely below the breakpoint, so the desktop
 * context's own revert (matchMedia switching contexts on resize) is what
 * hands control back to the CSS fallback — no manual class toggling needed.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="horizontal-panel"`.
 * @return {Function} Cleanup that reverts the matchMedia context, killing
 *                     whichever breakpoint branch was active.
 */
export function initHorizontalPanel( el ) {
	return withMotionAllowed( ( gsap ) => {
		const track = resolveTrack( el );
		if ( ! track ) {
			// Nothing to pin against — leave the CSS scroll-snap fallback as
			// the only behaviour rather than pinning an empty container.
			return undefined;
		}

		const mm = gsap.matchMedia();

		mm.add( '(min-width: 768px)', () => {
			// Recomputed on every ScrollTrigger refresh, so a webfont swap or a
			// client editing the panel count never leaves a stale travel
			// distance baked into the tween.
			/*
			 * NEVER DERIVE THIS BY SUBTRACTING ONE WIDTH FROM ANOTHER.
			 *
			 * That is the trap this defect kept falling into. Every candidate
			 * width (host, band, track, scrollWidth) silently carries padding,
			 * gaps or a content band inside it, so every subtraction landed
			 * short by however much was hidden in the operand.
			 *
			 * THE REQUIREMENT (Bean, 2026-07-30): at the end of the pin the LAST
			 * panel's left edge sits where the FIRST panel's left edge sat before
			 * any travel — so the last panel's text lands where the first
			 * panel's text was. Empty band to the right of the last panel at the
			 * end is the accepted, intended consequence.
			 *
			 * THE DERIVATION. Translating the track by -T moves every panel left
			 * by T, so the last panel finishes at `last.left - T`. Setting that
			 * equal to `first.left` gives T = last.offsetLeft - first.offsetLeft.
			 * Both terms are measured in the SAME offsetParent, so band padding,
			 * flex gap, and any whole-row offset cancel instead of needing to be
			 * discovered. `offsetLeft` is defined over layout boxes and ignores
			 * the GSAP transform on the track, so it stays correct on every
			 * `invalidateOnRefresh` recompute mid-pin — unlike
			 * `getBoundingClientRect()`, which earlier probes used.
			 *
			 * MEASURED LIVE 2026-07-30, canary /motion-canary-horizontal-panel/
			 * at 1440x900, four panels (this replaces the earlier figures in
			 * this comment, which were stale — taken before `1ca8d465` gave
			 * panels a default width, and internally impossible under the
			 * current CSS):
			 *   panel offsetLeft   0 / 1100 / 2200 / 3300   (each 1100 wide)
			 *   track.scrollWidth  4400          host el.clientWidth 1200
			 *   required travel    3300          old formula gave      3200
			 *   => landing error   exactly 100px = host 1200 - panel 1100
			 * The 100px is the signature of "stop when the row is flush right"
			 * instead of "stop when panel N reaches panel 1's start".
			 *
			 * FAILED APPROACHES — do not retry:
			 *  · `track.clientWidth` computes 0 (the track is `width: max-content`,
			 *    so client === scroll width) and kills the effect outright.
			 *    Shipped in 6914cb8f, reverted in 69fe0929.
			 *  · `track.parentElement.clientWidth` — equals the host width here,
			 *    so it changes nothing. NOTE: an earlier version of this comment
			 *    claimed this was tried and failed; `git log -S parentElement`
			 *    shows it was never committed. Recorded accurately now so the
			 *    history stops misleading.
			 *
			 * THE `max()` IS A REACHABILITY FLOOR, NOT A CAP. A council review
			 * proposed clamping with `Math.min( ideal, scrollWidth - clientWidth )`
			 * as a safety net; that evaluates to 3200 here — precisely the broken
			 * value — and would have silently undone the fix. The over-travel IS
			 * the fix. What genuinely needs guarding is the opposite end: if a
			 * client sets `--sgs-fx-panel-width` WIDER than the host, the ideal
			 * travel would leave part of the last panel off-screen to the right.
			 *
			 * ⚠ CORRECTION (2026-08-01, keyboard-focus follow-up measured
			 * against Chromium/Firefox/WebKit): the comment that stood here
			 * claimed the >=768px CSS sets `overflow-x: clip`, "not
			 * programmatically scrollable". That is FALSE. `fx-horizontal-
			 * panel.css`'s upgrade rule sets `overflow-x: clip` but never
			 * touches `overflow-y`, which the file's own always-on base rule
			 * already set to `hidden`. Per the CSS Overflow spec's mixed-value
			 * normalisation (verified empirically, not assumed — Chromium
			 * 145/Firefox/WebKit all agree), `overflow-x: clip` paired with a
			 * NON-clip, NON-visible `overflow-y` computes to `overflow-x:
			 * hidden`, not `clip`. The host is therefore a genuine scroll
			 * container, which is DELIBERATE-LOOKING BUT ACCIDENTAL: it is
			 * exactly what lets every tested browser's native focus-time
			 * "scroll the ancestor into view" fire on `host.scrollLeft` when
			 * Tab lands on a not-yet-travelled panel — confirmed live: a
			 * focused control outside the visible box is pulled fully into
			 * view by the browser alone (`host.scrollLeft` 0 -> ~1660 on a
			 * 1100px-panel/1200px-host fixture), with NO code in this file
			 * doing it, and the compensation decays cleanly back to 0 as the
			 * scrub continues (verified: the end-of-pin state after this
			 * rescue fired is BYTE-IDENTICAL to a clean run where nothing was
			 * ever focused). Do NOT "fix" the CSS to make BOTH axes genuinely
			 * `clip` to match the sentence this replaces — that would silently
			 * delete this project's only current WCAG 2.4.11 mitigation for
			 * this effect, with nothing to catch the regression. See
			 * `scripts/motion-qa/probe-horizontal-panel-focus.mjs` for the
			 * measurement and `.claude/decisions.md` (D453 follow-up register)
			 * for the fuller writeup. This CSS behaviour lives in
			 * `assets/css/fx-horizontal-panel.css`, outside this file's
			 * ownership — flagged as an open follow-up to document/harden
			 * there (make the `hidden` behaviour deliberate + commented,
			 * rather than an accident of an unrelated axis), not fixed here.
			 * Taking the MAX of the ideal and the flush-right distance means the
			 * row always travels at least far enough to bring the last panel's
			 * right edge to the host's right edge, so every panel is fully
			 * visible at some point in the scroll. With the shipped default
			 * (panel 1100 < host 1200) the ideal wins and Bean's requirement
			 * holds; the floor only binds in the oversized-panel case.
			 */
			const getTravelDistance = () => {
				/*
				 * Laid-out ELEMENTS only. Spec 32's no-inline contract has each
				 * styled container PREPEND a scoped `<style>` as a preceding
				 * SIBLING (`class-sgs-container-wrapper.php` — `return
				 * $style_tag . $element;`), and every panel here is itself an
				 * sgs/container. On the live frontend those tags are lifted out
				 * to an external stylesheet at `render_block` p99, so they are
				 * absent by the time this runs — verified live 2026-07-30,
				 * `track.children` was 4 SECTIONs. This filter is therefore
				 * DEFENCE, not the observed cause: it keeps the calculation
				 * correct in any context where the lift has not run (the editor
				 * canvas being the obvious one), where `panels[0]` would
				 * otherwise be a `display:none` <style> whose offsetLeft is 0
				 * and the row would over-travel by panel 1's offset.
				 */
				const panels = Array.from( track.children ).filter(
					( node ) =>
						node.nodeType === 1 &&
						( node.offsetWidth > 0 || null !== node.offsetParent )
				);

				// Fewer than two panels means there is no "first to last"
				// distance to measure. Returning 0 leaves the CSS scroll-snap
				// fallback as the only behaviour, which is the correct outcome.
				if ( panels.length < 2 ) {
					return 0;
				}

				const first = panels[ 0 ];
				const last = panels[ panels.length - 1 ];

				/*
				 * offsetLeft is only comparable between two elements sharing an
				 * offsetParent. Today they always do, because
				 * `container/style.css` gives every container child
				 * `position: relative` — but that is a Z-INDEX STACKING rule
				 * that nothing obliges anyone to preserve, and it lives in a
				 * file with no connection to this effect. Assert rather than
				 * inherit the assumption: on a mismatch, bail to the CSS
				 * fallback instead of emitting a confidently wrong number.
				 */
				if ( first.offsetParent !== last.offsetParent ) {
					return 0;
				}

				const ideal = last.offsetLeft - first.offsetLeft;
				const flushRight =
					last.offsetLeft + last.offsetWidth - el.clientWidth;

				return Math.max( 0, ideal, flushRight );
			};

			const tween = gsap.to( track, {
				x: () => -getTravelDistance(),
				ease: 'none',
				scrollTrigger: {
					trigger: el,
					// Same chrome-clearing rule as fx-pin-scrub: this effect
					// pins too, so it had the identical (currently unobservable,
					// because the effect is inert) occlusion defect.
					// FUNCTION-based, not a resolved string — load-bearing. ScrollTrigger
					// re-evaluates a function `start` on every refresh, so the
					// offset picks up the header's MEASURED height once
					// header-behaviours/view.js publishes it. Resolving it eagerly
					// captured the pre-JS fallback (80px) instead of the real 93px
					// and left 13px of the section still behind the header.
					//
					// `clearChrome: true` is OPT-IN and this module is one of only
					// two entitled to it (see resolveStart's docblock): it sets
					// `pin: true` below, so the row is genuinely parked at the
					// viewport top for the whole pin.
					start: () =>
						resolveStart( el, 'top top', { clearChrome: true } ),
					// Pin length tracks the travel distance by default so
					// scroll speed feels consistent regardless of panel
					// count; a client-set `data-sgs-fx-end` overrides it for
					// a deliberately longer/shorter pin.
					end: () =>
						el.getAttribute( 'data-sgs-fx-end' ) ||
						`+=${ getTravelDistance() }`,
					pin: true,
					scrub: true,
					invalidateOnRefresh: true,
				},
			} );

			// Keyboard focus: this branch only ever writes a `transform` on
			// the track via GSAP — it never touches `tabindex`, DOM order,
			// or `overflow`, so sequential Tab order follows the same
			// document order it would with JS disabled. Nothing here
			// "scroll-jacks" focus; the visual position and the DOM
			// position are allowed to disagree during the pin, same as any
			// pinned section.
			//
			// This is DELIBERATELY unlike fx-pin-scrub.js/fx-split-reveal.js
			// (D453): those effects needed a focusin handler because their
			// hidden content is opacity-based and CSS gives no other recovery
			// path. This effect's risk shape is geometric, not opacity-based,
			// and measurement (2026-08-01, see the getTravelDistance docblock
			// correction above + probe-horizontal-panel-focus.mjs) found the
			// browser ALREADY recovers it natively via `host.scrollLeft`,
			// because of how `fx-horizontal-panel.css`'s overflow-x/-y rules
			// actually compute. No focusin handler is added here: one would
			// be a SECOND mechanism competing with the browser's own — either
			// inert (masking that the CSS accident is the only thing keeping
			// this reachable) or actively conflicting with it, and neither is
			// provable from this file alone. The real fix, if the CSS
			// accident is ever tightened up to genuine `clip` on both axes, is
			// in `assets/css/fx-horizontal-panel.css`, not here.
			return () => {
				tween.scrollTrigger?.kill();
				tween.kill();
			};
		} );

		// Below 768px this matchMedia instance registers no handler, so GSAP
		// creates nothing — the element is left exactly as the CSS fallback
		// rendered it (native horizontal scroll-snap, §10).

		return () => mm.revert();
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( ScrollTrigger );

bootEffect( 'horizontal-panel', initHorizontalPanel );
