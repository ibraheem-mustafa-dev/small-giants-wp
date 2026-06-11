/**
 * SGS Collapsible Text — frontend interactivity (viewScriptModule, vanilla ES module).
 *
 * Progressive enhancement for the collapsible read-more toggle (FR-30-3(e)).
 *
 * Server output (no-JS state):
 *   - body has NO `is-collapsed` class → full text visible.
 *   - the toggle <button> carries `hidden` → no broken control.
 *
 * On init this module, for each `.sgs-collapsible-text--collapsible`:
 *   1. adds `is-collapsed` to the body (CSS applies the line-clamp);
 *   2. removes `hidden` from the button (it becomes operable);
 *   3. ensures aria-expanded="false".
 *
 * On button click: toggle `is-collapsed`, flip aria-expanded, swap the label
 * "Read more" ↔ "Read less".
 *
 * No jQuery. No dependencies.
 */

const READ_MORE = 'Read more';
const READ_LESS = 'Read less';

/**
 * Wire one collapsible-text instance.
 *
 * @param {HTMLElement} root The .sgs-collapsible-text--collapsible wrapper.
 */
function initInstance( root ) {
	const body = root.querySelector( '.sgs-collapsible-text__body' );
	const button = root.querySelector( '.sgs-collapsible-text__toggle' );

	if ( ! body || ! button ) {
		return;
	}

	// Avoid double-binding if init runs more than once.
	if ( root.dataset.sgsCollapsibleTextReady === '1' ) {
		return;
	}
	root.dataset.sgsCollapsibleTextReady = '1';

	// Per-instance labels — read from server-emitted data attributes (i18n),
	// falling back to the English module-level constants if absent.
	const readMore = button.dataset.readMore || READ_MORE;
	const readLess = button.dataset.readLess || READ_LESS;

	// Enhance: collapse the body and reveal the now-operable button.
	body.classList.add( 'is-collapsed' );
	button.hidden = false;
	button.setAttribute( 'aria-expanded', 'false' );
	button.textContent = readMore;

	button.addEventListener( 'click', () => {
		const collapsed = body.classList.toggle( 'is-collapsed' );
		// collapsed === true  → text is clamped  → expanded is false.
		// collapsed === false → text is full     → expanded is true.
		const expanded = ! collapsed;
		button.setAttribute( 'aria-expanded', expanded ? 'true' : 'false' );
		button.textContent = expanded ? readLess : readMore;
	} );
}

/**
 * Initialise all instances on the page.
 */
function init() {
	const roots = document.querySelectorAll( '.sgs-collapsible-text--collapsible' );
	roots.forEach( initInstance );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
