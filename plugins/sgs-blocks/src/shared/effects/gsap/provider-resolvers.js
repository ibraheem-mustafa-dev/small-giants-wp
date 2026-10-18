/**
 * Pure resolvers for the Tier G provider: they read an effect element's `data-sgs-fx-*` attributes (ease, start,
 * scrub, trigger) and bind the hover replay. None of them touches shared runtime state, so the provider module
 * re-exports them and every effect still imports them from `@sgs/motion-provider`.
 *
 * @package SGS\Blocks
 */

import { chromeOffsetPx } from '../motion-utils.js';
import { parseEase } from './bezier-ease.js';

/**
 * Resolve an ease value into something GSAP accepts.
 *
 * A `cubic-bezier()` string, or an SGS easing token (`token:easing.<name>`,
 * read from the `--wp--custom--easing--<name>` custom property) that resolves
 * to one, becomes a bezier ease function. Anything else (GSAP names such as
 * `power2.out`, `none`, empty or a function) passes through unchanged.
 *
 * @param {*} value An ease string or function.
 * @return {*} A GSAP-compatible ease.
 */
export function resolveEase( value ) {
	if ( 'string' !== typeof value ) {
		return value;
	}
	let candidate = value.trim();
	const token = /^token:easing\.([a-z0-9-]+)$/i.exec( candidate );
	if ( token ) {
		const root = document.documentElement;
		candidate = root
			? window
					.getComputedStyle( root )
					.getPropertyValue( `--wp--custom--easing--${ token[ 1 ].replace( /(?<=[0-9])(?=[a-z])/g, '-' ) }` )
					.trim()
			: '';
	}
	return parseEase( candidate ) || value;
}

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
 * entire pin (see `chromeOffsetPx()` in `../motion-utils.js` for the measured case and for why
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
export function resolveScrub( el, fallback = 1 ) {
	const raw = el.getAttribute( 'data-sgs-fx-scrub' );
	const parsed = null === raw ? NaN : parseFloat( raw );
	const seconds = Number.isFinite( parsed ) ? parsed : fallback;
	return seconds > 0 ? seconds : true;
}

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
