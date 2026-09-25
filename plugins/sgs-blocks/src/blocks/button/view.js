/**
 * Frontend behaviour for sgs/button's `top` link source (U-12 §F).
 *
 * render.php already outputs a plain `<a href="#top" data-sgs-link-source="top">`
 * — the browser's native in-page anchor jump means a `top` button works with
 * zero JavaScript. This module only upgrades that jump: a smooth scroll
 * (instant under reduced motion) plus moving keyboard/screen-reader focus to
 * a sensible landing target, so activating the button also relocates focus
 * the way a real skip-link does.
 *
 * COST CONTRACT: `boot()` bails immediately when no
 * `[data-sgs-link-source="top"]` element exists on the page, so an ordinary
 * button (the overwhelming majority) pays for one `querySelectorAll` call
 * and nothing else — no listeners attached, no further work.
 *
 * @package
 */

/**
 * Resolve the element to move focus to after the scroll lands: the page's
 * skip-link target first (the framework's own landmark), then `<main>`,
 * then the first `<h1>`. Adds `tabindex="-1"` when the target is not
 * natively focusable, so `.focus()` actually lands there rather than
 * silently no-op'ing.
 *
 * @return {HTMLElement|null} The element to focus, or null if none exist.
 */
function resolveFocusTarget() {
	const candidates = [
		document.getElementById( 'wp--skip-link--target' ),
		document.querySelector( 'main' ),
		document.querySelector( 'h1' ),
	];

	for ( const candidate of candidates ) {
		if ( candidate ) {
			return candidate;
		}
	}

	return null;
}

/**
 * Handle a click on a `top`-sourced button: scroll to the top of the page
 * and move focus. Reduced motion gets an instant jump instead of a smooth
 * scroll; the native `#top` href still lands the visitor at the right place
 * even if this handler never runs (script blocked, error, etc.).
 *
 * @param {MouseEvent} event The click event.
 */
function handleTopButtonClick( event ) {
	event.preventDefault();

	const prefersReducedMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	window.scrollTo( {
		top: 0,
		left: 0,
		behavior: prefersReducedMotion ? 'auto' : 'smooth',
	} );

	const focusTarget = resolveFocusTarget();
	if ( ! focusTarget ) {
		return;
	}

	if ( ! focusTarget.hasAttribute( 'tabindex' ) ) {
		focusTarget.setAttribute( 'tabindex', '-1' );
	}
	focusTarget.focus();
}

/**
 * Boot the top-button enhancement. Cost-gated: does nothing at all unless
 * at least one `[data-sgs-link-source="top"]` element is present.
 */
function bootTopButtons() {
	const topButtons = document.querySelectorAll( '[data-sgs-link-source="top"]' );

	if ( 0 === topButtons.length ) {
		return;
	}

	topButtons.forEach( ( button ) => {
		button.addEventListener( 'click', handleTopButtonClick );
	} );
}

bootTopButtons();
