/**
 * Tier G effect — scroll-scrubbed element timeline. Spec 38 FR-38-7.
 *
 * Ties an element's own transform/opacity to its progress through the
 * viewport, so the motion tracks the scrollbar rather than playing once on
 * entry.
 *
 * BOUNDARY WITH TIER V (§3.1) — do not widen this without amending the spec:
 * a SINGLE-property fade or translate scrub stays vanilla (the existing CSS
 * scroll-driven parallax pattern plus `--sgs-scroll-progress`). Tier G owns
 * this because it is multi-keyframe and needs cross-browser scrub consistency
 * that CSS Scroll-Driven Animations cannot yet give (Safari stable still lacks
 * them). If Safari ships them, §1.3 says this is a candidate to DEMOTE back to
 * Tier V — the doctrine ratchets toward cheap, not toward GSAP.
 *
 * Reduced motion (§10): SIMPLIFY — the element renders at its end state,
 * static. Handled structurally by `withMotionAllowed`: the tween is never
 * created, and the server-rendered markup already IS the end state.
 *
 * @package SGS\Blocks
 */

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	tierG,
	withMotionAllowed,
	bootEffect,
	resolveScrub,
	resolveTrigger,
	bindHoverReplay,
} from '@sgs/motion-provider';

/**
 * Read a numeric fx parameter, falling back when absent or unparseable.
 *
 * @param {HTMLElement} el       Element carrying the data attributes.
 * @param {string}      name     Attribute suffix (e.g. 'scrub').
 * @param {number}      fallback Value when unset or not a number.
 * @return {number} The resolved value.
 */
function numericParam( el, name, fallback ) {
	const raw = el.getAttribute( `data-sgs-fx-${ name }` );
	if ( null === raw || '' === raw.trim() ) {
		return fallback;
	}
	const parsed = parseFloat( raw );
	return Number.isFinite( parsed ) ? parsed : fallback;
}

/**
 * Initialise one scrubbed element.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="scrub"`.
 * @return {Function} Cleanup that kills this element's tween and trigger.
 */
export function initScrub( el ) {
	return withMotionAllowed( ( gsap ) => {
		const trigger = resolveTrigger( el );
		const ease = el.getAttribute( 'data-sgs-fx-ease' ) || 'none';

		/*
		 * `load` and `hover` drop the ScrollTrigger entirely — the tween PLAYS
		 * rather than being scrubbed, so there is no scroll range to tie it to.
		 * Both arms return early; the scroll arm below is unchanged.
		 */
		if ( 'scroll' !== trigger ) {
			const isHover = 'hover' === trigger;
			const played = gsap.fromTo(
				el,
				{ opacity: 0, y: 40 },
				{
					opacity: 1,
					y: 0,
					// A scrubbed tween takes its duration from the scroll
					// distance; a played one needs a real duration. The house
					// default (provider.js `gsap.defaults`) applies unless the
					// client set one.
					duration: numericParam( el, 'duration', 0.6 ),
					ease: 'none' === ease ? 'power2.out' : ease,
					paused: isHover,
					// See bindHoverReplay: without this the from-state hides the
					// element the moment the tween is created, and a hover that
					// never comes leaves it hidden for good.
					immediateRender: ! isHover,
				}
			);

			const unbind = isHover ? bindHoverReplay( el, played ) : undefined;

			return () => {
				if ( unbind ) {
					unbind();
				}
				played.kill();
			};
		}

		const tween = gsap.fromTo(
			el,
			{ opacity: 0, y: 40 },
			{
				opacity: 1,
				y: 0,
				ease,
				scrollTrigger: {
					trigger: el,
					start: el.getAttribute( 'data-sgs-fx-start' ) || 'top 85%',
					end: el.getAttribute( 'data-sgs-fx-end' ) || 'top 40%',
					// `scrub: true` locks progress to the scrollbar; a number
					// adds that many seconds of catch-up smoothing.
					scrub: resolveScrub( el ),
				},
			}
		);

		/*
		 * D453 EXTENDED TO fx-scrub.js (2026-08-01) — WCAG 2.4.11 / 2.4.7.
		 * `.claude/decisions.md` D453 fixes the identical defect on
		 * `fx-pin-scrub.js`; this is the scrub-only adaptation, not a fresh
		 * design. Read that entry for the full mechanism proof (scrubTween /
		 * resetTo / ticker-ordering) — it is not re-derived here.
		 *
		 * `fromTo` defaults to `immediateRender: true`, so `opacity: 0` lands
		 * on `el` the instant this tween is built, before any scroll. There is
		 * no separate children timeline here — `el` ITSELF is the thing being
		 * scrubbed, so `el` may itself be the focusable control (e.g.
		 * `data-sgs-fx="scrub"` set directly on a link or button) or may
		 * CONTAIN focusable descendants (a card, a text block with an inline
		 * link). `focusin` bubbles, so one listener on `el` catches both
		 * shapes without needing to know which one applies.
		 *
		 * A HELD state, not a one-shot, for the same reason as pin-scrub:
		 * `resolveScrub()` (provider.js) returns the NUMBER `1` whenever the
		 * block sets no `data-sgs-fx-scrub` — the framework's default, not an
		 * edge case — so ScrollTrigger builds an internal catch-up
		 * `scrubTween` that re-drives `totalProgress` toward the scroll value
		 * on every `self.update`, and each further scroll event calls
		 * `resetTo` on it. A one-time `tween.progress(1)` would be
		 * overwritten on the very next scroll frame with no self-recovery —
		 * the exact race D453 measured `timeline.progress(1)` losing on
		 * pin-scrub, and this tween sits behind the identical `scrub:
		 * resolveScrub(el)` config.
		 *
		 * `gsap.ticker.add(holdComplete)` is appended (not `prioritize:true`),
		 * so per D453's M2 (verified against the installed gsap.js source) it
		 * always runs AFTER gsap's own root update in the same tick — it is
		 * the last write of the frame and cannot be undone by the scrub's own
		 * render in that same tick.
		 *
		 * Not done, for the same reasons D453 rejected them: no
		 * `scrollTrigger.disable()` (D451 — a trigger cannot re-enable itself
		 * through a callback that only fires while enabled), and the scrub
		 * tween is never killed (killing it would leave `scrubTween` pointing
		 * at a dead tween the next `resetTo` cannot revive, breaking the
		 * scrub permanently for this element).
		 */
		let keyboardHeld = false;

		const holdComplete = () => {
			if ( tween.progress() < 1 ) {
				tween.progress( 1 );
			}
		};

		const revealForKeyboard = () => {
			// Guard against re-adding on every focus move between multiple
			// focusable descendants inside the same scrubbed element —
			// `focusin` bubbles and fires once per descendant.
			if ( keyboardHeld ) {
				return;
			}
			keyboardHeld = true;
			gsap.ticker.add( holdComplete );
			// Apply immediately too, so the reveal starts on the event rather
			// than up to one frame later.
			holdComplete();
		};

		const releaseForKeyboard = ( event ) => {
			// `focusout` also fires when focus moves to a SIBLING focusable
			// descendant still inside `el`; only release once it has
			// genuinely left.
			if ( event.relatedTarget && el.contains( event.relatedTarget ) ) {
				return;
			}
			keyboardHeld = false;
			gsap.ticker.remove( holdComplete );
		};

		el.addEventListener( 'focusin', revealForKeyboard );
		el.addEventListener( 'focusout', releaseForKeyboard );

		/*
		 * Returned to the matchMedia context, so a mid-session switch to
		 * reduced motion reverts the element to its rendered end state rather
		 * than stranding it at whatever opacity the scroll had reached.
		 *
		 * ⚠ The end-state restore does NOT come from this .kill() call.
		 * Verified against the installed source (gsap 3.15.0):
		 * ScrollTrigger.js:2508 skips animation.revert() inside kill() when
		 * its `revert` argument is undefined, which an argument-less call
		 * always is. The actual restore comes from Context.kill()'s own
		 * tween-revert pass (gsap.js:3722), which context.revert() (in
		 * withMotionAllowed, above) runs BEFORE any cleanup this function
		 * returns is invoked (gsap.js:3742). This function's job is only to
		 * release the ScrollTrigger's scroll listener and pin state so the
		 * instance is garbage-collectable (gold-standard item 13) — not to
		 * revert anything. Passing explicit args makes that honest: true
		 * for revert costs nothing (the context already reverted the tween)
		 * and removes the dependency on kill()'s undocumented no-arg
		 * default; false for allowAnimation matches the explicit
		 * tween.kill() call below it, so the tween is killed exactly once.
		 */
		return () => {
			// D453 — paired with the `focusin`/`focusout` listeners added
			// above. Removed unconditionally: a mid-session reduced-motion
			// switch reverts the tween while `el` stays in the document, and
			// if focus happened to be held at that moment `releaseForKeyboard`
			// would never fire, leaving a ticker callback touching a dead
			// tween for the rest of the page's life.
			el.removeEventListener( 'focusin', revealForKeyboard );
			el.removeEventListener( 'focusout', releaseForKeyboard );
			keyboardHeld = false;
			gsap.ticker.remove( holdComplete );
			tween.scrollTrigger?.kill( true, false );
			tween.kill();
		};
	} );
}

// Registering the plugin is load-bearing, not housekeeping — see provider.js.
tierG( ScrollTrigger );

bootEffect( 'scrub', initScrub );
