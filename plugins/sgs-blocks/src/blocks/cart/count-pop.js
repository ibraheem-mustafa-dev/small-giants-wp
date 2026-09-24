/**
 * SGS Cart — "count pop" animation trigger (Wave B, U-1).
 *
 * A short scale animation on the live item count when it INCREASES (an item
 * was added), never on initial hydration and never under reduced motion or
 * the per-instance "Animate count on change" toggle. Split out of view.js to
 * keep it under the project's 250-line JS budget.
 *
 * @package
 */

/**
 * Whether the visitor's OS/browser has requested reduced motion. Read fresh
 * on every call rather than cached — a rare but real mid-session change
 * (some OSes flip this live via an accessibility toggle).
 *
 * @return {boolean} True when `prefers-reduced-motion: reduce` matches.
 */
function prefersReducedMotion() {
	return (
		'function' === typeof window.matchMedia &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	);
}

/**
 * Play the pop animation on `badge` when `count` has increased since the
 * last call for this element, and update its stored previous count either
 * way. A no-op on the very first call (no previous count to compare against
 * yet — SSR hydration is not an "add").
 *
 * @param {HTMLElement} badge   The `[data-sgs-cart-count]` element.
 * @param {number}      count   The new, current item count.
 * @param {boolean}     enabled Whether the operator has the animation switched on.
 */
export function maybeAnimateCountPop( badge, count, enabled ) {
	const previousCount = Number( badge.dataset.sgsPrevCount );

	if (
		enabled &&
		Number.isFinite( previousCount ) &&
		count > previousCount &&
		! prefersReducedMotion()
	) {
		badge.classList.remove( 'sgs-cart__badge--pop' );
		// Force reflow so re-adding the class restarts the animation on
		// consecutive adds.
		// eslint-disable-next-line no-unused-expressions
		badge.offsetWidth;
		badge.classList.add( 'sgs-cart__badge--pop' );
	}

	badge.dataset.sgsPrevCount = String( count );
}
