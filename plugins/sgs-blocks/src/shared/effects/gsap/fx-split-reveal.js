/**
 * Tier G effect — SplitText character/word/line reveal. Spec 38 FR-38-10.
 *
 * Splits an element's text into per-character/word/line `<span>`s and
 * staggers them in on scroll-into-view. This is the canonical Tier G case
 * vanilla CSS cannot reach (§3.2) — there is no CSS-only way to stagger
 * arbitrary text fragments without DOM-splitting the text node first.
 *
 * ACCESSIBILITY IS THE HEADLINE REQUIREMENT, not a setting (§3.2, FR-38-10).
 * Splitting text into spans is destructive to the accessibility tree unless
 * guarded: a screen reader that walks per-character spans either reads each
 * fragment as if it were a separate word ("H. e. l. l. o.") or, if the spans
 * carry no signal at all, may skip them. GSAP 3.15's SplitText handles this
 * itself via the `aria` config option (verified live in
 * `node_modules/gsap/dist/SplitText.js`):
 *
 *   - `aria: 'auto'` (SplitText's own DEFAULT when the option is omitted,
 *     `dist/SplitText.js:210`) sets `aria-label` on the SPLIT PARENT to the
 *     element's original trimmed `textContent` (`:219`,
 *     `element.setAttribute('aria-label', (element.textContent||'').trim())`)
 *     and marks every generated `char`/`word`/`line` wrapper span
 *     `aria-hidden="true"` unless `aria === 'none'` (`:55`,
 *     `aria !== 'none' && el.setAttribute('aria-hidden','true')`). A screen
 *     reader then announces the element's accessible name ONCE, from the
 *     `aria-label`, and skips every hidden fragment span entirely — the
 *     split becomes invisible to assistive tech while the sighted reveal
 *     still plays.
 *   - `revert()` restores the exact pre-split state, including the
 *     `aria-label`/`aria-hidden` it added: `dist/SplitText.js:23-26`
 *     (`_revertOriginal`) puts back whatever `aria-label`/`aria-hidden` the
 *     element carried BEFORE the split (typically none), so a mid-session
 *     revert-on-reduced-motion returns the element to a plain readable node,
 *     not one left wearing a stale `aria-label`.
 *
 * This module passes `aria: 'auto'` EXPLICITLY rather than relying on the
 * default, so the accessibility behaviour survives if GSAP's own default
 * ever changes upstream — the contract is asserted here, not inherited.
 *
 * Reduced motion (§10): SIMPLIFY. No split, no mask, no stagger — the
 * element renders as server-rendered, unsplit, fully-readable text. Handled
 * structurally by `withMotionAllowed`: the split is never created when
 * `(prefers-reduced-motion: no-preference)` fails to match, and if the user
 * flips the OS setting mid-session `context.revert()` calls this module's
 * returned cleanup, which reverts the split — never leaves fragment spans
 * behind mid-animation.
 *
 * @package SGS\Blocks
 */

import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { tierG, withMotionAllowed, bootEffect } from '@sgs/motion-provider';

/**
 * Read a numeric fx parameter, falling back when absent or unparseable.
 *
 * Copied from `fx-scrub.js` rather than shared — Spec 38 effect modules are
 * deliberately standalone (each is its own registered script module, loaded
 * only on pages that use it), so a shared util here would pull an extra
 * import graph into every effect for one four-line function.
 *
 * @param {HTMLElement} el       Element carrying the data attributes.
 * @param {string}      name     Attribute suffix (e.g. 'stagger').
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
 * Resolve the split-granularity param to SplitText's `type` string.
 *
 * `data-sgs-fx-split` accepts `chars` | `words` | `lines` (§7 inspector
 * choice — a client picks one granularity per instance, not a combination,
 * so the stagger reads as one coherent reveal rather than a nested cascade).
 * An unrecognised or absent value falls back to `words` — the safest default
 * for readability-during-motion and the cheapest DOM split (a headline of
 * any length still gets a handful of spans, not hundreds of char spans).
 *
 * @param {HTMLElement} el Element carrying the data attribute.
 * @return {string} One of SplitText's `type` values: 'chars' | 'words' | 'lines'.
 */
function splitTypeParam( el ) {
	const raw = el.getAttribute( 'data-sgs-fx-split' );
	return [ 'chars', 'words', 'lines' ].includes( raw ) ? raw : 'words';
}

/**
 * Initialise one split-reveal element.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="split-reveal"`.
 * @return {Function} Cleanup that kills the tween and reverts the split.
 */
export function initSplitReveal( el ) {
	return withMotionAllowed( ( gsap ) => {
		const splitType = splitTypeParam( el );

		// `mask` clips each fragment's overflow to its own line box, so a
		// 'lines' reveal slides up out of a hairline mask instead of a full
		// element-height clip. Opt-in via `data-sgs-fx-mask="lines"` (or
		// `"words"`/`"chars"` matching the split type) — §7 exposes this as a
		// checkbox in the inspector, wired to whichever granularity is active,
		// because masking a granularity SplitText isn't already splitting on
		// is a silent no-op in the plugin.
		const maskParam = el.getAttribute( 'data-sgs-fx-mask' );
		const mask = maskParam === splitType ? splitType : undefined;

		const split = SplitText.create( el, {
			type: splitType,
			mask,
			// Load-bearing for a11y — see file doc-block above. Passed
			// explicitly rather than relied on as SplitText's own default.
			aria: 'auto',
		} );

		const targets = split[ splitType ] || split.words;

		const tween = gsap.from( targets, {
			opacity: 0,
			y: '0.6em',
			duration: numericParam( el, 'duration', 0.6 ),
			stagger: numericParam( el, 'stagger', 0.03 ),
			ease: el.getAttribute( 'data-sgs-fx-ease' ) || 'power2.out',
			scrollTrigger: {
				trigger: el,
				start: el.getAttribute( 'data-sgs-fx-trigger' ) || 'top 85%',
				once: true,
			},
		} );

		// Order matters: kill the tween BEFORE reverting the split. Reverting
		// first would let GSAP's tween keep a dangling reference to nodes
		// SplitText has already removed from the DOM.
		return () => {
			tween.scrollTrigger?.kill();
			tween.kill();
			split.revert();
		};
	} );
}

/*
 * Registering the plugins is load-bearing, not housekeeping — see provider.js.
 *
 * BOTH are required here. This effect's reveal is scroll-triggered (the
 * `scrollTrigger` config above), so it genuinely depends on ScrollTrigger as
 * well as SplitText, and it must be self-sufficient rather than relying on
 * some other effect module happening to load first on the same page.
 *
 * ⚠ There is NO lazy fallback to fall back ON: gsap does not auto-require a
 * plugin when it meets an unknown config key. In an ES-module build there is
 * no global `window.gsap` for the plugin to self-register against either
 * (ScrollTrigger.js:2702 is a no-op here), so an unregistered ScrollTrigger
 * means the `scrollTrigger` config is silently IGNORED — the tween would run
 * immediately on load instead of on scroll, with no error anywhere. Registering
 * explicitly is the only thing standing between this effect and that failure.
 */
tierG( SplitText, ScrollTrigger );

bootEffect( 'split-reveal', initSplitReveal );
