/**
 * SGS Cart — "count pop" state publisher.
 *
 * The count pop is the Entrance layer on the badge part (Spec 38A FR-38A-53); render.php derives `mode` from the layer's
 * state and prints it as `data-count-pop`: 'off' (the layer plays by another trigger, or the badge has no layer), 'change'
 * (the `count-changed` state: an item was added) or 'load-and-change' (the `count-loaded` state: also once at load, at any
 * count including 0). This file pulses that state on the badge through `@sgs/motion-state`, so two adds replay the layer
 * twice, and stores the previous count on the badge to tell an increase from the first render. Split out of view.js to
 * keep it under the project's 250-line JS budget.
 *
 * @package
 */

import {
	preloadMotionState,
	pulseState,
} from '../../shared/motion-state-publish';

const STATE_BADGE = '[data-sgs-me~="state"]';

/**
 * Pulse the count state on `badge` according to `mode`, and update its stored previous count either way. The first call
 * for an element has no previous count: it pulses only in 'load-and-change' mode. Later calls pulse only when the count
 * has increased since the last call. A badge with no state layer only records the count.
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
	}

	badge.dataset.sgsPrevCount = String( count );
}
