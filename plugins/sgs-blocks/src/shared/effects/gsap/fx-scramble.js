/**
 * Tier G effect — ScrambleText heading toy. Spec 38 FR-38-11.
 *
 * Randomises a heading's characters and lets them settle back into the
 * SAME text they already read — a "decoding" flourish for tech/creative
 * clients. Default OFF (§2 placement table), shipped for the niche use-case
 * only; this is the one Tier G effect the spec itself calls "not worth a
 * bespoke maintained implementation for a default-OFF niche toy" (§2), so it
 * stays deliberately small: no bespoke chars/reveal-delay controls beyond
 * what `data-sgs-fx-duration`/`-ease` already give every other effect (§11.2)
 * — there is no `data-sgs-fx-chars` in the grammar, so this module does not
 * invent one.
 *
 * FAIL-OPEN BY CONSTRUCTION, NOT BY EXTRA CODE (FR-38-2). Unlike a reveal
 * effect that starts an element HIDDEN and needs JS to show it, scrambleText
 * animates FROM the server-rendered, already-correct text TO that same text
 * (`scrambleText: { text: originalText }`). So the pre-JS state and the
 * settled post-animation state are identical strings — there is no hidden
 * intermediate state for a failed/blocked script to strand the visitor in.
 * If this module never runs, the heading simply never scrambles; it still
 * reads correctly from the first paint.
 *
 * ACCESSIBILITY IS THE HEADLINE REQUIREMENT, not a setting — same standing
 * as `fx-split-reveal.js` (§3.2 groups SplitText and ScrambleText together
 * for exactly this reason). Unlike SplitText, GSAP's ScrambleTextPlugin has
 * NO `aria` option of its own (verified in the installed
 * `node_modules/gsap/ScrambleTextPlugin.js` — the plugin's only job is to
 * mutate `textContent` on a tick timer; it does not touch the accessibility
 * tree at all). Left alone, that means a screen reader landing on this
 * element mid-animation — via `aria-live`, a skip link, or simply a fast
 * screen-reader user reaching it before the tween settles — would be read
 * whatever garbled fragment happens to be in the DOM at that instant. That
 * is exactly the "H. e. l. l. o." failure mode `fx-split-reveal.js` guards
 * against, produced by a different mechanism (character churn vs. DOM
 * fragmentation), so it needs the same category of guard, hand-built here
 * since the plugin does not provide one:
 *
 *   1. The element's ORIGINAL text is moved into a child `<span>` — the
 *      "visual" node — which is what actually gets scrambled.
 *   2. The visual node is marked `aria-hidden="true"` for the ENTIRE time it
 *      exists, including before and after the tween runs, not just while
 *      scrambling — a churning-then-settling text node is exactly the kind
 *      of content a screen reader should never be handed piecemeal.
 *   3. The host element gets `aria-label` set to the trimmed original text,
 *      so its accessible name is STABLE and correct throughout — a screen
 *      reader announces the real heading once, never the scramble in
 *      progress, exactly mirroring SplitText's `aria: 'auto'` contract
 *      (parent gets the label, generated fragments get hidden).
 *   4. Cleanup reverses the wrap exactly: original child nodes move back
 *      onto `el`, the visual span is removed, and `aria-label` is stripped —
 *      so a mid-session reduced-motion revert (or a bfcache restore) leaves
 *      the plain original markup behind, not a span-wrapped heading wearing
 *      a stale label.
 *
 * Reduced motion (§10): **SUPPRESS** — ScrambleText is the one effect in the
 * whole roster the spec calls out as suppressed rather than simplified to an
 * end-state (unlike SplitText, which falls back to a plain fade). Handled
 * structurally by `withMotionAllowed`: the scramble is never created when
 * `(prefers-reduced-motion: no-preference)` fails to match, so the heading
 * renders as the plain, unwrapped, unscrambled server-rendered text — and if
 * the OS setting flips mid-session, `context.revert()` runs this module's
 * cleanup, unwrapping the span and restoring the plain node rather than
 * freezing it mid-scramble.
 *
 * @package SGS\Blocks
 */

import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
	tierG,
	withMotionAllowed,
	bootEffect,
	resolveTrigger,
	bindHoverReplay,
} from '@sgs/motion-provider';

/**
 * Read a numeric fx parameter, falling back when absent or unparseable.
 *
 * Copied from `fx-split-reveal.js` rather than shared — Spec 38 effect
 * modules are deliberately standalone (each is its own registered script
 * module, loaded only on pages that use it), so a shared util here would
 * pull an extra import graph into every effect for one four-line function.
 *
 * @param {HTMLElement} el       Element carrying the data attributes.
 * @param {string}      name     Attribute suffix (e.g. 'duration').
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
 * Wrap `el`'s current children in a fresh `aria-hidden` span, so the churn
 * caused by scrambling has somewhere to live that a screen reader will never
 * read from — see the accessibility section of the file docblock.
 *
 * @param {HTMLElement} el Element whose content is about to be scrambled.
 * @return {HTMLElement} The new inner span carrying the moved content.
 */
function wrapForScramble( el ) {
	const visual = document.createElement( 'span' );
	visual.setAttribute( 'aria-hidden', 'true' );

	while ( el.firstChild ) {
		visual.appendChild( el.firstChild );
	}
	el.appendChild( visual );

	return visual;
}

/**
 * Reverse `wrapForScramble()` exactly: move the visual span's children back
 * onto `el` and remove the span, so cleanup leaves plain original markup
 * behind rather than a permanently span-wrapped heading.
 *
 * @param {HTMLElement} el     The original host element.
 * @param {HTMLElement} visual The wrapper span created by `wrapForScramble`.
 */
function unwrapScramble( el, visual ) {
	while ( visual.firstChild ) {
		el.appendChild( visual.firstChild );
	}
	visual.remove();
}

/**
 * Initialise one scramble-text element.
 *
 * @param {HTMLElement} el The element carrying `data-sgs-fx="scramble"`.
 * @return {Function} Cleanup that kills the tween and unwraps the markup.
 */
export function initScramble( el ) {
	return withMotionAllowed( ( gsap ) => {
		const trigger = resolveTrigger( el );

		// Captured BEFORE the wrap, from the untouched original node, so it
		// is the exact string the visitor already sees — the scramble
		// animates to this same string, never to different copy (see the
		// fail-open section of the file docblock).
		const originalText = el.textContent;

		const visual = wrapForScramble( el );

		// Stable accessible name for the whole lifetime of the effect —
		// see point 3 in the file docblock's accessibility section.
		el.setAttribute( 'aria-label', originalText.trim() );

		const common = {
			duration: numericParam( el, 'duration', 1.2 ),
			ease: el.getAttribute( 'data-sgs-fx-ease' ) || 'none',
			scrambleText: {
				text: originalText,
				// `tweenLength: false` keeps the string at its FINAL length
				// for the whole tween, rather than animating the length
				// too. Without it the plugin grows/shrinks the string
				// toward `text`'s length as it scrambles, which reflows a
				// heading mid-animation — a layout-shift the visual effect
				// does not need to justify.
				tweenLength: false,
			},
		};

		let tween;

		/*
		 * `load` and `hover` carry no ScrollTrigger — the scramble PLAYS
		 * rather than waiting for a scroll position.
		 *
		 * `immediateRender: false` is set unconditionally per provider.js's
		 * `bindHoverReplay` contract. For this `to()` tween it is already
		 * GSAP's own default (unlike SplitText's `from()` tweens, a `to()`
		 * tween does not render its start state on creation), so stating it
		 * here is asserting the safety explicitly rather than relying on an
		 * implicit default the next edit could change.
		 */
		if ( 'scroll' !== trigger ) {
			tween = gsap.to( visual, {
				...common,
				paused: 'hover' === trigger,
				immediateRender: false,
			} );
		} else {
			tween = gsap.to( visual, {
				...common,
				immediateRender: false,
				scrollTrigger: {
					trigger: el,
					// `data-sgs-fx-start` — the attribute the inspector's
					// "Start position" control writes (§11.2). Mirrors the
					// same read in `fx-split-reveal.js`.
					start: el.getAttribute( 'data-sgs-fx-start' ) || 'top 85%',
				},
			} );
		}

		const unbindHover =
			'hover' === trigger ? bindHoverReplay( el, tween ) : undefined;

		// Order matters: kill the tween BEFORE unwrapping. Killing first
		// stops the plugin's tick timer from writing to `visual.textContent`
		// after its parent link has been touched by the unwrap.
		return () => {
			if ( unbindHover ) {
				unbindHover();
			}
			tween?.scrollTrigger?.kill();
			tween?.kill();
			el.removeAttribute( 'aria-label' );
			unwrapScramble( el, visual );
		};
	} );
}

/*
 * Registering the plugins is load-bearing, not housekeeping — see
 * provider.js. Both are required here for the same reason as
 * `fx-split-reveal.js`: this effect's `scroll` arm depends on ScrollTrigger,
 * and the module must be self-sufficient rather than relying on some other
 * effect happening to register ScrollTrigger first on the same page.
 */
tierG( ScrambleTextPlugin, ScrollTrigger );

bootEffect( 'scramble', initScramble );
