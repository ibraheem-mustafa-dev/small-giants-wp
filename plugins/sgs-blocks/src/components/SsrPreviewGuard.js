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
			onSubmitCapture={ handleSubmitCapture }
		>
			{ children }
		</div>
	);
}
