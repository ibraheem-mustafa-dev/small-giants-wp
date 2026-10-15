/**
 * SGS Cart — "count pop" animation trigger (Wave B, U-1).
 *
 * A short grow-and-fade pop on the live item count. The per-instance mode
 * (`countPopAnimation`) is 'off', 'change' (only when the count increases,
 * never on the first render) or 'load-and-change' (also once on the first
 * render, at any count including 0). Never plays under reduced motion. Split
 * out of view.js to keep it under the project's 250-line JS budget.
 *
 * A cart whose badge holds a `state` Entrance layer (Spec 38A FR-38A-53) plays
 * the pop from that layer instead: the same decision (`mode` is derived from the
 * layer's state by render.php) pulses `count-changed` (an item was added) or
 * `count-loaded` (also once at load) on the badge through `@sgs/motion-state`,
 * so two adds replay it twice. A cart with no layer keeps the class below.
 *
 * @package
 */

import {
	preloadMotionState,
	pulseState,
} from '../../shared/motion-state-publish';

const STATE_BADGE = '[data-sgs-me~="state"]';

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
 * Play the pop animation on `badge` according to `mode`, and update its
 * stored previous count either way. The first call for an element has no
 * previous count: it pops only in 'load-and-change' mode. Later calls pop
 * only when the count has increased since the last call.
 *
 * @param {HTMLElement} badge The `[data-sgs-cart-count]` element.
 * @param {number}      count The new, current item count.
 * @param {string}      mode  'off', 'change' or 'load-and-change'.
 */
export function maybeAnimateCountPop( badge, count, mode ) {
	const previousCount = Number( badge.dataset.sgsPrevCount );
	const isFirstCall = ! Number.isFinite( previousCount );
	const shouldPop = isFirstCall
		? 'load-and-change' === mode
		: 'off' !== mode && count > previousCount;
	const onModel = badge.matches( STATE_BADGE );

	if ( isFirstCall && onModel ) {
		preloadMotionState( badge );
	}

	if ( shouldPop && onModel ) {
		pulseState(
			badge,
			'load-and-change' === mode ? 'count-loaded' : 'count-changed'
		);
	} else if ( shouldPop && ! prefersReducedMotion() ) {
		badge.classList.remove( 'sgs-cart__badge--pop' );
		// Force reflow so re-adding the class restarts the animation on
		// consecutive adds.
		// eslint-disable-next-line no-unused-expressions
		badge.offsetWidth;
		badge.classList.add( 'sgs-cart__badge--pop' );
	}

	badge.dataset.sgsPrevCount = String( count );
}
