/**
 * Frontend behaviour for sgs/button's `top` and `add-to-basket` link sources.
 *
 * `add-to-basket` (see the second half of this file): render.php outputs a plain link to the product's page carrying the
 * request body for the SGS cart proxy; this module turns a tap into the add, with a busy state, a spoken and visible
 * message on failure, and the same cart events the buy box dispatches. A failed add leaves the link as it was, and the
 * next tap follows it.
 *
 * `top` (U-12 §F):
 *
 * render.php already outputs a plain `<a href="#top" data-sgs-link-source="top">`
 * — the browser's native in-page anchor jump means a `top` button works with
 * zero JavaScript. This module only upgrades that jump: a smooth scroll
 * (instant under reduced motion) plus moving keyboard/screen-reader focus to
 * a sensible landing target, so activating the button also relocates focus
 * the way a real skip-link does.
 *
 * COST CONTRACT: each boot function bails immediately when no element of its
 * link source exists on the page, so an ordinary button (the overwhelming
 * majority) pays for one `querySelectorAll` call per source and nothing else —
 * no listeners attached, no further work.
 *
 * @package
 */

import { addViaProxy } from '../../shared/cart-live/add-via-proxy';

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
 * and move focus without letting the focus move the scroll position. Reduced motion gets an instant jump instead of a smooth
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
	// preventScroll: a plain focus() scrolls the target into view itself, which cancels the
	// smooth scroll in flight and leaves the page stopped partway up.
	focusTarget.focus( { preventScroll: true } );
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

const GENERIC_ADD_ERROR = 'Could not add that to your basket. Please try again.';

/**
 * The message region that follows an add-to-basket button: created once, empty, so a screen reader hears the text the
 * moment it is set.
 *
 * @param {HTMLElement} button The add-to-basket link.
 * @return {HTMLElement} The live region.
 */
function ensureMessageRegion( button ) {
	let region = button.nextElementSibling;
	if ( ! region || ! region.classList.contains( 'sgs-button__message' ) ) {
		region = document.createElement( 'span' );
		region.className = 'sgs-button__message';
		region.setAttribute( 'role', 'status' );
		region.setAttribute( 'aria-live', 'polite' );
		button.insertAdjacentElement( 'afterend', region );
	}
	return region;
}

/**
 * Handle a tap on an add-to-basket button: add the product through the cart proxy, then tell the page's basket widgets.
 * A modified or non-primary click, a button already working and a button whose last add failed all keep the link's own
 * behaviour, so the product page is always reachable.
 *
 * @param {MouseEvent} event The click event.
 */
async function handleAddClick( event ) {
	const button = event.currentTarget;
	if ( event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ) {
		return;
	}
	if ( 'true' === button.dataset.sgsAddFailed ) {
		return;
	}
	event.preventDefault();
	if ( 'true' === button.getAttribute( 'aria-busy' ) ) {
		return;
	}

	const region = ensureMessageRegion( button );
	region.textContent = '';
	button.setAttribute( 'aria-busy', 'true' );
	try {
		await addViaProxy( button.dataset.sgsAddUrl, button.dataset.sgsAddNonce, JSON.parse( button.dataset.sgsAddBody ) );
	} catch ( error ) {
		// A network failure reaches here as a TypeError with the browser's own wording; the shopper gets the plain sentence.
		const message = error && 'TypeError' !== error.name && error.message ? error.message : GENERIC_ADD_ERROR;
		button.dataset.sgsAddFailed = 'true';
		button.removeAttribute( 'aria-busy' );
		region.textContent = message + ' Select the button again to see the product instead.';
		return;
	}

	// The same signals the buy box and the product card send, so the header count and the mini-cart update.
	document.dispatchEvent( new window.CustomEvent( 'wc-blocks_added_to_cart' ) );
	window.dispatchEvent( new window.CustomEvent( 'sgs-cart-updated' ) );

	if ( button.dataset.sgsAddReload ) {
		// The basket and checkout pages draw their contents once: reload to show the filled basket.
		window.location.reload();
		return;
	}
	if ( 'basket' === button.dataset.sgsAddAfter && button.dataset.sgsAddBasketUrl ) {
		window.location.assign( button.dataset.sgsAddBasketUrl );
		return;
	}
	button.removeAttribute( 'aria-busy' );
	region.textContent = 'Added to your basket.';
}

/**
 * Boot the add-to-basket buttons. Cost-gated like the top buttons.
 */
function bootAddToBasketButtons() {
	const buttons = document.querySelectorAll( '[data-sgs-link-source="add-to-basket"][data-sgs-add-body]' );
	buttons.forEach( ( button ) => {
		ensureMessageRegion( button );
		button.addEventListener( 'click', handleAddClick );
	} );
}

bootTopButtons();
bootAddToBasketButtons();
