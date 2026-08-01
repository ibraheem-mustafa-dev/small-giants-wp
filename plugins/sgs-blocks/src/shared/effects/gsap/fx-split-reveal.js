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
		const trigger = resolveTrigger( el );

		/*
		 * D453 EXTENDED TO fx-split-reveal.js's SCROLL ARM (2026-08-01) —
		 * WCAG 2.4.11 / 2.4.7. See `.claude/decisions.md` D453 for the full
		 * mechanism; this file's investigation and the reasoning for why the
		 * fix here is SIMPLER than pin-scrub's/fx-scrub.js's are below.
		 *
		 * THE DEFECT IS REAL, THOUGH NARROWER THAN THE SIBLING FILES: the
		 * scroll branch's `gsap.from(targets, {opacity:0, y:'0.6em', ...})`
		 * (below, inside `onSplit`) has the same `immediateRender: true`
		 * default as every other `from`/`fromTo` reveal in this codebase, so
		 * every split fragment starts invisible the moment the split runs —
		 * before any scroll — with zero focus handling anywhere in this file
		 * (confirmed: no `focus` reference existed here before this change).
		 * GSAP's own SplitText marks the GENERATED WRAPPER SPANS
		 * `aria-hidden="true"` (see this file's top docblock), so the
		 * fragments themselves are never in the tab order — but this effect
		 * is offered as a UNIVERSAL `fx` choice on any block SplitText can
		 * run against (`src/blocks/extensions/fx.js` `SHIPPED_EFFECTS`), and
		 * SplitText does not remove pre-existing interactive descendants
		 * (e.g. a `<a>` inline inside the split text, or a block whose
		 * RichText target sits alongside a real CTA) — it keeps them as
		 * ancestors of the fragment spans it creates around their text. A
		 * real link/button in that position is exposed to exactly the same
		 * "focusable but invisible before the reveal fires" defect the
		 * sibling files were fixed for.
		 *
		 * WHY THE FIX HERE CAN BE A ONE-SHOT, NOT A HELD STATE: unlike
		 * `fx-scrub.js` and `fx-pin-scrub.js`, this scroll branch carries NO
		 * `scrub` key at all (confirmed: the `scrollTrigger` object below has
		 * only `trigger`/`start`). Without `scrub`, ScrollTrigger does not
		 * build the internal catch-up `scrubTween` that re-drives progress on
		 * every scroll update (`resolveScrub()`/D453's `resetTo` mechanism is
		 * specific to a numeric/true `scrub` config) — this is a toggle-style
		 * trigger that calls the animation's own `play()` once on entry, with
		 * ScrollTrigger's documented DEFAULT `toggleActions: 'play none none
		 * none'` (no config here overrides it), so nothing ever plays it
		 * backward either. A forced `tween.progress(1)` therefore has nothing
		 * left to fight it back down: a later native `onEnter` still calls
		 * `play()`, which on an already-finished tween is a no-op forward
		 * continuation, not a reset. `keyboardHeld` is still tracked (not a
		 * one-time flag) so a re-split — autoSplit's webfont/resize path,
		 * this file's own onSplit docblock — re-applies the hold to the NEW
		 * tween it creates, since a re-split replaces the fragment nodes and
		 * would otherwise silently drop a held reveal.
		 */
		let keyboardHeld = false;

		// `mask` clips each fragment's overflow to its own line box, so a
		// 'lines' reveal slides up out of a hairline mask instead of a full
		// element-height clip. Opt-in via `data-sgs-fx-mask="lines"` (or
		// `"words"`/`"chars"` matching the split type) — §7 exposes this as a
		// checkbox in the inspector, wired to whichever granularity is active,
		// because masking a granularity SplitText isn't already splitting on
		// is a silent no-op in the plugin.
		const maskParam = el.getAttribute( 'data-sgs-fx-mask' );
		const mask = maskParam === splitType ? splitType : undefined;

		let tween;

		/*
		 * `autoSplit: true` + creating the tween INSIDE onSplit is one fix, not
		 * two — half of it is worse than neither.
		 *
		 * THE BUG IT FIXES (confirmed in installed source, gsap 3.15.0):
		 * SplitText.js:289 gates the webfont re-split on autoSplit —
		 *   `_fonts && splitLines && autoSplit && _fonts.addEventListener(...)`
		 * and :293 gates the width-change ResizeObserver identically. Without
		 * autoSplit there is NO re-split path at all. So a `lines` split
		 * computed before the webfont swaps keeps the FALLBACK font's line
		 * boundaries: after the swap the text reflows, fragments straddle the
		 * visible lines, and the stagger reveals groupings that match nothing
		 * on screen. The width half is font-independent and hits anyone who
		 * rotates a phone.
		 *
		 * ⚠ There is NO console warning for this in 3.15.0 (grep: zero
		 * console.warn in dist/SplitText.js), so it fails completely silently —
		 * which is why it survived a passing build and a live check.
		 *
		 * WHY THE TWEEN MUST LIVE IN onSplit: SplitText.js:290-291 assigns the
		 * callback's returned animation to `this._data.anim` and resumes it
		 * across re-splits. A tween created outside would keep animating the
		 * fragment nodes from the PREVIOUS split, which the re-split has already
		 * removed from the DOM — trading wrong line boundaries for an animation
		 * driving detached nodes.
		 *
		 * autoSplit is inert unless `type` includes 'lines', so passing it
		 * unconditionally costs nothing for words/chars.
		 */
		const split = SplitText.create( el, {
			type: splitType,
			mask,
			// Load-bearing for a11y — see file doc-block above. Passed
			// explicitly rather than relied on as SplitText's own default.
			aria: 'auto',
			autoSplit: true,
			onSplit( self ) {
				// Read `self`, never the outer `split` — it is still undefined
				// on the first call.
				const targets = self[ splitType ] || self.words;

				const common = {
					opacity: 0,
					y: '0.6em',
					duration: numericParam( el, 'duration', 0.6 ),
					stagger: numericParam( el, 'stagger', 0.03 ),
					ease: el.getAttribute( 'data-sgs-fx-ease' ) || 'power2.out',
				};

				/*
				 * `load` and `hover` carry no ScrollTrigger — the reveal PLAYS
				 * rather than waiting for a scroll position.
				 *
				 * `immediateRender: false` on the hover arm is load-bearing, not
				 * tidiness: `gsap.from` renders its from-state at once, so a
				 * paused hover tween would hide every fragment the instant it is
				 * created, and a visitor who never hovers — or cannot, on a touch
				 * screen — would be left looking at invisible text. With it, the
				 * text stays exactly as the server rendered it and hover replays
				 * the reveal. See `bindHoverReplay` in provider.js.
				 */
				if ( 'scroll' !== trigger ) {
					tween = gsap.from( targets, {
						...common,
						paused: 'hover' === trigger,
						immediateRender: 'hover' !== trigger,
					} );
					return tween;
				}

				tween = gsap.from( targets, {
					...common,
					scrollTrigger: {
						trigger: el,
						// `data-sgs-fx-start` — the attribute the inspector's
						// "Start position" control actually writes. This read
						// was previously `-trigger`, which nothing writes, so
						// the control silently did nothing and every instance
						// used the hardcoded default below.
						start: el.getAttribute( 'data-sgs-fx-start' ) || 'top 85%',
					},
				} );

				// D453 re-apply on re-split: autoSplit's webfont/resize path
				// replaces the fragment nodes and creates a fresh tween, which
				// would otherwise silently drop a hold that was already
				// engaged when the re-split happened.
				if ( keyboardHeld ) {
					tween.progress( 1 );
				}

				// Returned so SplitText can carry it across a re-split
				// (SplitText.js:290-291).
				return tween;
			},
		} );

		/*
		 * Hover is bound OUTSIDE onSplit, against the element rather than the
		 * fragments, so a re-split (webfont swap, resize) does not need to
		 * rebind it. `tween` is read at event time, so the replay always drives
		 * whichever tween the CURRENT split produced — binding the tween object
		 * itself here would animate detached nodes after a re-split.
		 */
		const unbindHover =
			'hover' === trigger
				? bindHoverReplay( el, {
						restart: () => tween?.restart(),
				  } )
				: undefined;

		/*
		 * D453 — keyboard reveal, SCROLL ARM ONLY. See the docblock above
		 * `let keyboardHeld = false;` for why a one-shot suffices here (no
		 * `scrub` config, default `toggleActions: 'play none none none'`).
		 * Bound on `el`, not on the fragment spans, for the same reason hover
		 * is bound on `el` above: `focusin` bubbles, and a re-split replaces
		 * the fragment nodes the listener would otherwise have to be rebound
		 * to.
		 */
		const revealForKeyboard = () => {
			if ( keyboardHeld ) {
				return;
			}
			keyboardHeld = true;
			tween?.progress( 1 );
		};

		const releaseForKeyboard = ( event ) => {
			if ( event.relatedTarget && el.contains( event.relatedTarget ) ) {
				return;
			}
			keyboardHeld = false;
		};

		if ( 'scroll' === trigger ) {
			el.addEventListener( 'focusin', revealForKeyboard );
			el.addEventListener( 'focusout', releaseForKeyboard );
		}

		// Order matters: kill the tween BEFORE reverting the split. Reverting
		// first would let GSAP's tween keep a dangling reference to nodes
		// SplitText has already removed from the DOM.
		return () => {
			if ( 'scroll' === trigger ) {
				el.removeEventListener( 'focusin', revealForKeyboard );
				el.removeEventListener( 'focusout', releaseForKeyboard );
			}
			keyboardHeld = false;
			if ( unbindHover ) {
				unbindHover();
			}
			tween?.scrollTrigger?.kill();
			tween?.kill();
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
