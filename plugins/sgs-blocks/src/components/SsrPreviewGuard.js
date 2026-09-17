/**
 * SsrPreviewGuard — replaces `<Disabled>` around `<ServerSideRender>` previews.
 *
 * WHY NOT `<Disabled>` (regression fix, 2026-09-17): `<Disabled>` from
 * `@wordpress/components` makes its whole subtree `inert` (the native HTML
 * `inert` attribute) and sets `pointer-events: none` on top of it. Browsers
 * never dispatch ANY pointer event — click, hover, `mouseenter`/`mouseleave`,
 * focus — into an inert subtree. That is why wrapping a block's
 * `<ServerSideRender>` in `<Disabled>` (the original fix for real `<a href>`
 * clicks navigating the editor tab away instead of selecting the block)
 * silently killed every real CSS `:hover` state AND every JS-driven
 * interaction (e.g. `sgs/nav-bar-menu`'s Interactivity API mega-menu
 * disclosure store, which listens for `mouseenter`/`click` on the real
 * rendered DOM) — confirmed live: `getComputedStyle()` on a link inside
 * `.components-disabled` reported `pointer-events: none` and the wrapper
 * itself carries `inert="true"`.
 *
 * WHAT THIS DOES INSTEAD: a capture-phase click/submit interceptor, nothing
 * more. Real mouse and focus events reach the real DOM completely normally —
 * CSS `:hover`, `mouseenter`/`mouseleave`, and any of the block's own
 * click-driven interactivity all keep working exactly as the frontend
 * renders them. The ONLY thing this cancels is the BROWSER'S OWN default
 * action for a link/button/form (`event.preventDefault()`), which stops
 * navigation/submission without `stopPropagation()` — so:
 *   - the click still bubbles up to WordPress's own block-selection handler
 *     (clicking a nav link in the editor selects the block, exactly like
 *     clicking any other part of the preview);
 *   - the click still reaches any of the block's own click-driven listeners
 *     on the same or a descendant element (`preventDefault()` never stops
 *     other listeners on the event from running — only the element's own
 *     default browser behaviour).
 *
 * Scope of what gets its default action cancelled: real links (`a[href]`),
 * buttons, and submit/reset/button-type inputs, plus form submission. This
 * intentionally does NOT touch anything else — no pointer-events change, no
 * `inert`, no focus trapping — so the preview behaves like the live page for
 * every interaction except "leaving the editor".
 *
 * DISCLOSURE TOGGLE (2026-09-17, nav dropdown/chevron live-preview fix).
 * Bean rejected the premise that a `<ServerSideRender>` preview can never show
 * live interactive behaviour — that is a property of THIS component's choice
 * of mechanism, not a WordPress ceiling (core's own Navigation block and this
 * codebase's `sgs/tabs`/`sgs/accordion` all prove genuinely interactive
 * editor-canvas previews are achievable; `sgs/tabs`' `edit.js` does it with a
 * plain `useState` driving conditional JSX — but that path only exists
 * because tabs never routes its interactive part through ServerSideRender at
 * all). A block that DOES preview via ServerSideRender (this one) needs a
 * different mechanism, because the frontend Interactivity API runtime never
 * hydrates inside this static markup (confirmed live: zero interactivity
 * runtime script loads in the canvas) — so `data-wp-on--click`/
 * `data-wp-bind--aria-expanded` directives on the SSR'd HTML are inert here.
 *
 * The fix does NOT reimplement the Interactivity API. It doesn't need to:
 * `includes/nav-menu-markup.php` + `includes/nav-menu-submenu-css.php` (shared
 * by `sgs/nav-bar-menu` and `sgs/nav-drawer-menu`) already express the ENTIRE
 * visual open/close contract as plain CSS keyed off one HTML attribute —
 * `[data-sgs-mega-trigger][aria-expanded="true"] ~ .…__mega-panel-wrap` /
 * `…__submenu-wrap { display:block; }` for the panel, and
 * `[data-sgs-mega-trigger][aria-expanded="true"] .…__caret { transform:
 * rotate(180deg); }` for the chevron. Flipping that ONE attribute by hand on
 * click reproduces the real frontend visual, using the real frontend CSS —
 * nothing hand-rolled, nothing that can drift from render.php. Scoped to
 * exactly the documented `[data-sgs-mega-trigger]` contract, so any future
 * block emitting that same markup pattern gets a live editor preview for
 * free, with no per-block carve-out.
 *
 * Single-open is mirrored too (closing any other open trigger within this
 * same preview when one opens) — it costs one extra attribute read per click
 * and avoids two panels visibly stacked open at once, which the frontend's
 * `state.openMegaId` mechanism never allows. Everything else the frontend
 * store does (hover-intent, safe-triangle, outside-click, positioning,
 * reparenting, keyboard) is deliberately NOT reproduced here — this is an
 * editor-canvas demonstration of the open/close visual, not a parity
 * reimplementation of the live disclosure engine.
 *
 * WIDER ROLLOUT (2026-09-17, universal SsrPreviewGuard audit). Bean's mandate:
 * every block using this guard should behave like the frontend for every
 * interaction except link navigation. Audited all 9 current callers
 * (`before-after`, `brand-strip`, `business-info`, `card-grid`,
 * `nav-bar-menu`, `nav-drawer-menu`, `product-card`, `responsive-logo`,
 * `trustpilot-reviews`) against their real frontend `view.js`. Two more
 * blocks had real, currently-broken interactivity of the SAME general shape
 * this file already proves out (an interaction writes ONE plain DOM
 * attribute/property that the block's own CSS already keys its visual state
 * off) — extended below, same pattern, no store reimplementation:
 *
 *   - `sgs/before-after`'s ALWAYS-PRESENT native `<input type="range">` layer
 *     (see that block's `view.js` docblock — "layer 1", zero GSAP
 *     dependency) drives `--sgs-before-after-position` on the block root
 *     purely from the range's own `input` event. Confirmed live: the
 *     interactivity-free layer never wires up in the canvas, so a visitor
 *     could drag the native thumb (browser-native, no JS required) and the
 *     comparison image never actually moved. `handleInputCapture` below
 *     reproduces exactly that one write.
 *   - `sgs/trustpilot-reviews`'s carousel/mini-carousel prev/next arrows +
 *     pagination dots scroll `.sgs-trustpilot-reviews__track` — a plain
 *     `scrollBy`/`scrollTo` the browser already knows how to do; the block's
 *     `view.js` only computes WHERE to scroll to. `handleClickCapture` below
 *     reproduces that computation for the click-driven controls only.
 *
 * Deliberately NOT reproduced (checked, not skipped):
 *   - `sgs/product-card` bound mode (`sourceMode='wc-product'/'sgs-cpt'`) pill
 *     swapping + add-to-cart: these mutate a large seeded manifest (price,
 *     gallery, stock, per-unit note, WooCommerce Store API cart calls) via
 *     the Interactivity API context proxy — not a single attribute, a real
 *     state machine. Reproducing it here would be the "reimplement the
 *     Interactivity API" trap this file already rejected for nav-bar-menu's
 *     OWN disclosure engine. Add-to-cart mutating the real WooCommerce cart
 *     from inside a post-editor preview would also be a genuine data-safety
 *     regression, not a missing feature — this guard's existing
 *     `preventDefault()` on the submit button is the CORRECT behaviour here,
 *     not a gap.
 *   - `sgs/brand-strip`'s infinite-scroll marquee (clones DOM nodes, measures
 *     rendered image widths, starts a CSS animation) and its hover/tap pause
 *     are AUTONOMOUS motion, not a user-triggered interaction — Bean's
 *     mandate lists interactions (click/hover/drag), and this block has no
 *     currently-broken CLICK/HOVER-triggered state (real CSS `:hover` and
 *     the `mouseenter`/`pointerdown` pause listeners already fire correctly
 *     per this file's core `<Disabled>` removal — there is simply nothing
 *     scrolling yet to pause). Left as a known, documented gap rather than
 *     re-implementing the whole clone-and-measure marquee boot inside a
 *     shared guard component.
 *   - `sgs/business-info`, `sgs/card-grid`, `sgs/responsive-logo` — audited,
 *     no `view.js`, no Interactivity API directives, no interactivity beyond
 *     real CSS `:hover` (already fixed by this file's core change). Nothing
 *     to add.
 *
 * @package SGS\Blocks
 */
import { useCallback } from '@wordpress/element';

const INTERACTIVE_SELECTOR =
	'a[href], button, input[type="submit"], input[type="button"], input[type="reset"]';

/**
 * The disclosure-trigger contract shared by `sgs/nav-bar-menu` and
 * `sgs/nav-drawer-menu` (`includes/nav-menu-markup.php`). CSS in
 * `includes/nav-menu-submenu-css.php` keys the panel's `display` and the
 * chevron's `rotate` purely off this attribute — see the file docblock above.
 */
const DISCLOSURE_TRIGGER_SELECTOR = '[data-sgs-mega-trigger][aria-expanded]';

/**
 * `sgs/before-after`'s always-present range-input contract (that block's own
 * `render.php`/`view.js`) — the range's `value` is the single source of
 * truth for the comparison split, expressed purely as the CSS custom
 * property `--sgs-before-after-position` on the block root. See the wider
 * docblock above.
 */
const BEFORE_AFTER_RANGE_SELECTOR = '[data-sgs-before-after-range]';
const BEFORE_AFTER_ROOT_SELECTOR = '.wp-block-sgs-before-after';

/**
 * `sgs/trustpilot-reviews`'s carousel/mini-carousel contract (that block's
 * own `render.php`/`view.js`) — prev/next arrows and pagination dots live
 * alongside a single scrollable `.sgs-trustpilot-reviews__track` inside the
 * SAME preview root, so `event.currentTarget` (the guard's own wrapper) is
 * enough to scope the query without a page-wide selector. See the wider
 * docblock above.
 */
const TRUSTPILOT_ARROW_SELECTOR =
	'.sgs-trustpilot-reviews__arrow--prev, .sgs-trustpilot-reviews__arrow--next';
const TRUSTPILOT_DOT_SELECTOR = '.sgs-trustpilot-reviews__dot[data-index]';
const TRUSTPILOT_TRACK_SELECTOR = '.sgs-trustpilot-reviews__track';
const TRUSTPILOT_CARD_SELECTOR =
	'.sgs-trustpilot-reviews__card:not([data-sgs-loop-clone])';

export default function SsrPreviewGuard( { children, className } ) {
	const handleClickCapture = useCallback( ( event ) => {
		const target =
			typeof event.target.closest === 'function'
				? event.target.closest( INTERACTIVE_SELECTOR )
				: null;
		if ( target ) {
			event.preventDefault();
		}

		const trigger =
			typeof event.target.closest === 'function'
				? event.target.closest( DISCLOSURE_TRIGGER_SELECTOR )
				: null;
		if ( trigger ) {
			const willOpen = trigger.getAttribute( 'aria-expanded' ) !== 'true';
			// Single-open: close every OTHER open trigger in this preview first
			// (mirrors `state.openMegaId`, see file docblock).
			if (
				willOpen &&
				typeof event.currentTarget.querySelectorAll === 'function'
			) {
				event.currentTarget
					.querySelectorAll(
						DISCLOSURE_TRIGGER_SELECTOR + '[aria-expanded="true"]'
					)
					.forEach( ( other ) => {
						if ( other !== trigger ) {
							other.setAttribute( 'aria-expanded', 'false' );
						}
					} );
			}
			trigger.setAttribute( 'aria-expanded', willOpen ? 'true' : 'false' );
		}

		// `sgs/trustpilot-reviews` carousel arrows — scroll the track by one
		// card+gap, exactly matching that block's own `getStep()`/`scrollByCard()`
		// (autoplay/looping/drift are deliberately not reproduced — see docblock).
		const arrowBtn =
			typeof event.target.closest === 'function'
				? event.target.closest( TRUSTPILOT_ARROW_SELECTOR )
				: null;
		if ( arrowBtn && typeof event.currentTarget.querySelector === 'function' ) {
			const track = event.currentTarget.querySelector(
				TRUSTPILOT_TRACK_SELECTOR
			);
			const cards = track
				? track.querySelectorAll( TRUSTPILOT_CARD_SELECTOR )
				: [];
			if ( track && cards.length ) {
				const cardWidth = cards[ 0 ].getBoundingClientRect().width;
				const gap =
					parseFloat(
						getComputedStyle( track ).columnGap ||
							getComputedStyle( track ).gap
					) || 0;
				const step = cardWidth + gap;
				const dir = arrowBtn.classList.contains(
					'sgs-trustpilot-reviews__arrow--next'
				)
					? 1
					: -1;
				track.scrollBy( { left: step * dir, behavior: 'auto' } );
			}
		}

		// `sgs/trustpilot-reviews` pagination dots — scroll straight to the
		// matching card and sync the active-dot visual state (mirrors that
		// block's own dot click handler + `updateActiveDot()`).
		const dotBtn =
			typeof event.target.closest === 'function'
				? event.target.closest( TRUSTPILOT_DOT_SELECTOR )
				: null;
		if ( dotBtn && typeof event.currentTarget.querySelector === 'function' ) {
			const track = event.currentTarget.querySelector(
				TRUSTPILOT_TRACK_SELECTOR
			);
			const idx = dotBtn.getAttribute( 'data-index' );
			const targetCard = track
				? track.querySelector(
						TRUSTPILOT_CARD_SELECTOR + '[data-index="' + idx + '"]'
				  )
				: null;
			if ( track && targetCard ) {
				track.scrollTo( {
					left: targetCard.offsetLeft - track.offsetLeft,
					behavior: 'auto',
				} );
			}
			const dotsContainer = dotBtn.closest(
				'.sgs-trustpilot-reviews__dots'
			);
			if ( dotsContainer ) {
				dotsContainer
					.querySelectorAll( TRUSTPILOT_DOT_SELECTOR )
					.forEach( ( dot ) => {
						const isActive = dot === dotBtn;
						dot.classList.toggle( 'is-active', isActive );
						dot.setAttribute(
							'aria-selected',
							isActive ? 'true' : 'false'
						);
					} );
			}
		}
	}, [] );

	// `sgs/before-after`'s always-present native range layer — every `input`
	// event on the range writes the same CSS custom property the frontend's
	// own "layer 1" writes (see docblock above). No GSAP/Draggable
	// enhancement is reproduced here; the range alone already makes the
	// block fully operable by mouse, touch, and keyboard (browser-native).
	const handleInputCapture = useCallback( ( event ) => {
		const range =
			typeof event.target.closest === 'function'
				? event.target.closest( BEFORE_AFTER_RANGE_SELECTOR )
				: null;
		if ( ! range ) {
			return;
		}
		const root = range.closest( BEFORE_AFTER_ROOT_SELECTOR );
		if ( ! root ) {
			return;
		}
		const clamped = Math.max(
			0,
			Math.min( 100, Number.parseFloat( range.value ) )
		);
		root.style.setProperty( '--sgs-before-after-position', `${ clamped }%` );
	}, [] );

	const handleSubmitCapture = useCallback( ( event ) => {
		event.preventDefault();
	}, [] );

	return (
		<div
			className={
				className
					? `sgs-ssr-preview-guard ${ className }`
					: 'sgs-ssr-preview-guard'
			}
			onClickCapture={ handleClickCapture }
			onInputCapture={ handleInputCapture }
			onSubmitCapture={ handleSubmitCapture }
		>
			{ children }
		</div>
	);
}
