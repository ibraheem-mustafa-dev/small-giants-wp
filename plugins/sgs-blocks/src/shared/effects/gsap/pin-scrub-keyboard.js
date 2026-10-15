/**
 * Tier G effect: the keyboard reveal of a pinned section (Spec 38 FR-38-6, D453).
 *
 * Holds a pin-scrub timeline at its end state while keyboard focus is inside the pinned section, so a control reached
 * by Tab is never focusable but invisible. Exports a function only; nothing runs on import.
 *
 * @package
 */

/**
 * Reveal the section's content while keyboard focus is inside it.
 *
 * @param {Object}      gsap     The GSAP instance.
 * @param {HTMLElement} el       The pinned section.
 * @param {Object}      timeline The section's pin-scrub timeline.
 * @return {Function} Cleanup that removes the listeners and the ticker callback.
 */
export function revealOnKeyboardFocus( gsap, el, timeline ) {
	/*
	 * D453 — KEYBOARD REVEAL. WCAG 2.4.11 / 2.4.7.
	 *
	 * `fromTo` defaults to `immediateRender: true`, so every preset's FROM
	 * state (`opacity: 0` in all five presets) lands the moment this
	 * timeline is BUILT — before any scroll. A visitor tabbing faster than
	 * the scroll-driven stagger therefore lands focus on controls that are
	 * fully focusable and completely invisible.
	 *
	 * Measured live on canary page 2114 (a pinned section containing a real
	 * link, text field and submit button): the link's own opacity was 0, the
	 * field's 0.4, and the button read 1 while its ANCESTOR — the actual
	 * stagger participant — was 0. CSS opacity does not inherit as a
	 * computed value, which is precisely why a per-element check missed it
	 * and an ancestor check caught it.
	 *
	 * Fix: keyboard entry COMPLETES the choreography rather than competing
	 * with it. Content is only ever added, never removed (a hidden control
	 * becoming visible), so this cannot make the visual state worse.
	 *
	 * Why not CSS `:focus-within`: GSAP writes opacity as an INLINE style,
	 * which no stylesheet rule can beat without `!important` — and
	 * `!important` on `opacity` in a render surface is what the cheat-gate
	 * exists to reject.
	 *
	 * Mouse users are unaffected: `focusin` does not fire on scroll, and a
	 * subsequent scroll re-drives the scrubbed timeline normally.
	 *
	 * ─────────────────────────────────────────────────────────────────
	 * WHY THIS IS A HELD STATE AND NOT A ONE-SHOT `progress(1)` CALL
	 *
	 * The original D453 fix WAS a one-shot, and it loses a race. `scrub`
	 * is not a one-time jump to the scroll-derived progress: when the
	 * resolved scrub value is a NUMBER — which `readSmoothing()` returns by
	 * DEFAULT (1) whenever a block sets no `data-sgs-fx-scrub`, so this is
	 * the framework's normal configuration, not an edge case —
	 * ScrollTrigger builds an internal catch-up tween that re-drives the
	 * timeline's `totalProgress` toward the raw scroll value, and every
	 * subsequent scroll update calls `resetTo` on it and starts it again
	 * (`ScrollTrigger.js` `self.update`, gsap 3.15.0). A single forced
	 * `progress(1)` is therefore overwritten on a later frame, with no
	 * self-recovery: the control stays focused and invisible.
	 *
	 * Both one-shot shapes were MEASURED failing on the live canary
	 * (page 2114, link focused inside the scrub window, effective opacity
	 * traced at 50ms for 2.6s):
	 *
	 *   - `timeline.progress(1)` alone .............. flat 0 throughout.
	 *   - GSAP's own documented scrub idiom,
	 *     `scrollTrigger.getTween().progress(1)` then
	 *     `timeline.progress(1)` ..................... rose to 0.32, then
	 *     was dragged back to 0 and stayed there.
	 *
	 * (Note for anyone re-reading D453: its claim that the scrub tween is
	 * a closure-local variable which "cannot be killed or paused from
	 * outside" is FALSE. `ScrollTrigger.getTween()` returns it and is
	 * documented public API — `node_modules/gsap/types/scroll-trigger.d.ts`
	 * carries the signature, a docs link and the `scrub.progress(1)`
	 * example. The reason that idiom is not used here is not that it is
	 * unreachable; it is that finishing the scrub once does not stop the
	 * NEXT scroll update from starting it again, which is exactly what the
	 * measurement above shows.)
	 *
	 * So the reveal is a HELD state for as long as keyboard focus is
	 * inside the section, re-asserted on the GSAP ticker. A ticker callback
	 * added here runs after gsap's own root update (the core registers
	 * `_updateRoot` when it wakes, long before any focus event), so it
	 * deterministically writes last in the frame and cannot be undone by
	 * the scrub's write in that same frame. It is removed the moment focus
	 * leaves, so there is exactly zero per-frame cost for a mouse user —
	 * verified: with no focus anywhere in the section the callback ran 0
	 * frames across a full scroll sweep, and the children's opacity still
	 * tracked scroll across 6 distinct values from 0 to 1, i.e. the
	 * choreography is untouched.
	 *
	 * Measured with the hold in place, same fixture and same 50ms trace:
	 * effective opacity (the focused control's own value multiplied up its
	 * ancestor chain to the pinned root — CSS opacity does not inherit as a
	 * computed value, so the chain is the only honest measure) converges to
	 * 1 within ~320ms and holds at 1 for the rest of the 2.6s window; and
	 * scrolling AGAIN while focus is still held keeps it at 1 (minimum 1
	 * across a further 2s), which is the specific case a one-shot cannot
	 * survive.
	 *
	 * Deliberately NOT done: `scrollTrigger.disable()` (D451 — a trigger
	 * cannot re-enable itself through a callback that only fires while
	 * enabled), and killing the scrub tween (it would leave `scrubTween`
	 * pointing at a dead tween that the next `resetTo` cannot revive,
	 * breaking the scrub permanently for that section).
	 */
	let keyboardHeld = false;

	const holdComplete = () => {
		if ( timeline.progress() < 1 ) {
			timeline.progress( 1 );
		}
	};

	const revealForKeyboard = () => {
		// Guard against re-adding on every focus move BETWEEN controls in
		// the same section — `focusin` bubbles and fires once per control.
		if ( keyboardHeld ) {
			return;
		}
		keyboardHeld = true;
		gsap.ticker.add( holdComplete );
		// Apply immediately as well as on the next tick, so the reveal
		// starts on the event rather than up to one frame later.
		holdComplete();
	};

	const releaseForKeyboard = ( event ) => {
		// `focusout` also fires when focus moves to a SIBLING control still
		// inside the section; only release when it has genuinely left.
		if ( event.relatedTarget && el.contains( event.relatedTarget ) ) {
			return;
		}
		keyboardHeld = false;
		gsap.ticker.remove( holdComplete );
	};

	el.addEventListener( 'focusin', revealForKeyboard );
	el.addEventListener( 'focusout', releaseForKeyboard );

	return () => {
		// D453 — paired with the `focusin`/`focusout` listeners added above
		// the hold block. Removed here rather than relying on the element
		// being discarded: a mid-session switch to reduced motion reverts
		// the timeline while the element STAYS in the document, so a
		// listener left bound would keep calling `progress()` on a killed
		// timeline. The ticker callback is removed unconditionally for the
		// same reason — if focus happened to be inside the section at the
		// moment the context reverted, `releaseForKeyboard` will never
		// fire, and a ticker callback left registered would run on EVERY
		// frame for the rest of the page's life, touching a dead timeline.
		el.removeEventListener( 'focusin', revealForKeyboard );
		el.removeEventListener( 'focusout', releaseForKeyboard );
		keyboardHeld = false;
		gsap.ticker.remove( holdComplete );
	};
}
