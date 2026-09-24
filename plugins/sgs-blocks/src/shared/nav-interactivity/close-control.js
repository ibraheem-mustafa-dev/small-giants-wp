/**
 * SGS Navigation — pure close-control logic (Wave 3C U-9/U-11).
 *
 * Kept apart from `store.js` — which imports `@wordpress/interactivity` and
 * cannot be loaded under plain node — so this is unit-testable with plain stub
 * objects, the same split `freeze-background.js` already uses for the same
 * reason.
 *
 * Two independent concerns live here:
 *
 *  1. OPENER LIVENESS (§4.2, the revised FR-36-6 predicate) — is the trigger
 *     that opened the drawer still genuinely visible and hit-testable? A
 *     burger painted UNDER the drawer, `visibility:hidden`, `opacity:0`, or
 *     off-screen must all read as NOT live, because the whole point of the
 *     `trigger` close-style is "the visible, live opener IS the close
 *     control" — if it isn't actually reachable, the × must come back.
 *
 *  2. CLOSE-ON-SCROLL INTENT (§4.6, DEC-02's carve-out) — a scroll event only
 *     counts toward the close distance when it followed genuine pointer
 *     scrolling (wheel, or a touchmove/pointer drag) within a short window;
 *     keyboard scrolling, scroll anchoring and a programmatic `scrollTo()`
 *     must never trigger it.
 *
 * @package SGS\Blocks
 */

/** The window (ms) within which a wheel/touchmove/pointer-drag event counts as
 * "this scroll was pointer-driven", per §4.6. */
export const SCROLL_INTENT_WINDOW_MS = 150;

/**
 * Whether TRIGGER currently sits on top of the paint stack at its own centre
 * point — the liveness half of the FR-36-6 revised predicate (§4.2).
 *
 * Fails (returns false) whenever:
 *  - there is no trigger, or it carries no client rects at all (display:none,
 *    detached, or never painted);
 *  - its bounding box has zero width or height;
 *  - `elementsFromPoint` is unavailable (no capability to test — the ×
 *    stays on, which is the fail-safe direction, per §4.2's own note);
 *  - the top-most element at its centre point is neither the trigger nor one
 *    of its descendants (covered by the drawer, or by an ancestor with
 *    `visibility:hidden`/`opacity:0`/off-screen positioning, or genuinely
 *    behind another stacking context).
 *
 * @param {Element|null} trigger The candidate opener element.
 * @param {Object}       [deps]  { elementsFromPoint(x,y): Array<Element> }.
 * @return {boolean} Whether the opener is live.
 */
export function isOpenerLive( trigger, deps = {} ) {
	if ( ! trigger || typeof trigger.getBoundingClientRect !== 'function' ) {
		return false;
	}

	const rects =
		typeof trigger.getClientRects === 'function'
			? trigger.getClientRects()
			: [ 1 ];
	if ( ! rects || 0 === rects.length ) {
		return false;
	}

	const rect = trigger.getBoundingClientRect();
	if ( ! rect || rect.width <= 0 || rect.height <= 0 ) {
		return false;
	}

	const elementsFromPoint = deps.elementsFromPoint;
	if ( typeof elementsFromPoint !== 'function' ) {
		// No JS capability to test this — fail-safe direction is "not live",
		// so the × keeps showing rather than silently vanishing.
		return false;
	}

	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	const stack = elementsFromPoint( cx, cy ) || [];
	const top = stack[ 0 ];
	if ( ! top ) {
		return false;
	}
	if ( top === trigger ) {
		return true;
	}
	return typeof trigger.contains === 'function' && trigger.contains( top );
}

/**
 * Whether a scroll event happening NOW should count as user-intended pointer
 * scrolling, given the timestamp of the last wheel/touchmove/pointer-drag
 * event (§4.6). Keyboard scrolling, scroll anchoring, and a programmatic
 * `scrollTo()` never set that timestamp, so they always read as false here.
 *
 * @param {number}      now          Current timestamp (ms, e.g. `Date.now()`).
 * @param {number|null} lastIntentAt Timestamp of the last pointer-scroll
 *                                    signal, or null/undefined if none yet.
 * @return {boolean}
 */
export function isIntentionalScroll( now, lastIntentAt ) {
	if ( 'number' !== typeof lastIntentAt ) {
		return false;
	}
	return now - lastIntentAt <= SCROLL_INTENT_WINDOW_MS;
}

/**
 * Whether accumulated scroll distance (clamped at 0 for iOS overscroll,
 * measured from the position when the drawer opened) has crossed the
 * configured close-on-scroll threshold (§4.6). A threshold of 0 (or less)
 * means "off" — never crosses, regardless of distance.
 *
 * @param {number} distanceScrolled Absolute px scrolled since open (>=0).
 * @param {number} threshold        closeOnScrollDistance, px.
 * @return {boolean}
 */
export function crossedScrollDistance( distanceScrolled, threshold ) {
	return threshold > 0 && distanceScrolled >= threshold;
}
