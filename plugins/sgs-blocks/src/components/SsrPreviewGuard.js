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
 * @package SGS\Blocks
 */
import { useCallback } from '@wordpress/element';

const INTERACTIVE_SELECTOR =
	'a[href], button, input[type="submit"], input[type="button"], input[type="reset"]';

export default function SsrPreviewGuard( { children, className } ) {
	const handleClickCapture = useCallback( ( event ) => {
		const target =
			typeof event.target.closest === 'function'
				? event.target.closest( INTERACTIVE_SELECTOR )
				: null;
		if ( target ) {
			event.preventDefault();
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
