/**
 * The form's sticky buttons row publishes its height as `--sgs-sticky-bar-h` while it is stuck to the bottom of the screen and the
 * form is on screen, so a floating widget (whatsapp-cta) rides above it instead of covering Continue / Submit.
 * The row is sticky only at the device tiers render.php switches on, so the computed position decides; the bar's
 * bottom edge against the viewport bottom says whether it is pinned now. A scroll listener keeps that current.
 *
 * @package
 */

import { setStickyBarHeight } from '../../utils/sticky-bar-height.js';

/** @param {Element} formRoot The `.sgs-form` wrapper. */
export function initStickyActions( formRoot ) {
	const bar = formRoot.querySelector( '.sgs-form__actions' );
	if ( ! bar || formRoot.dataset.sgsStickyActionsInit === '1' ) {
		return;
	}
	formRoot.dataset.sgsStickyActionsInit = '1';

	let formVisible = false;

	function apply() {
		const sticky = 'sticky' === window.getComputedStyle( bar ).position;
		// Pinned means the bar's bottom edge sits at the viewport bottom (within a pixel); in the flow it floats above it.
		const pinned =
			sticky &&
			Math.abs(
				bar.getBoundingClientRect().bottom - window.innerHeight
			) <= 1;
		const height =
			pinned && formVisible
				? Math.ceil( bar.getBoundingClientRect().height )
				: 0;
		setStickyBarHeight( bar, height );
	}

	if ( 'function' === typeof window.IntersectionObserver ) {
		new window.IntersectionObserver( ( entries ) => {
			formVisible = entries[ entries.length - 1 ].isIntersecting;
			apply();
		} ).observe( formRoot );
	}
	if ( 'function' === typeof window.ResizeObserver ) {
		new window.ResizeObserver( apply ).observe( bar );
	}
	window.addEventListener( 'resize', apply );
	window.addEventListener( 'scroll', apply, { passive: true } );
}
