/**
 * SGS Choice Flow — which steps the shopper has reached (Spec 43 FR-43-19).
 *
 * A pre-selected default (`isDefault`) counts as an answer from the start,
 * so Continue is live and the purchase carries it, but the stage lists it
 * only once the shopper has reached its question: until then that line
 * reads as not chosen yet, as in the Eye Care draft. Going Back keeps a
 * step reached.
 *
 * @package SGS\Blocks
 */

/** @type {WeakMap<HTMLElement, Set<number>>} */
const reachedSteps = new WeakMap();

/**
 * @param {HTMLElement} flowRoot  Flow wrapper element.
 * @param {number}      stepIndex The step just shown.
 */
export function markStepReached( flowRoot, stepIndex ) {
	const reached = reachedSteps.get( flowRoot ) || new Set();
	reached.add( stepIndex );
	reachedSteps.set( flowRoot, reached );
}

/**
 * @param {HTMLElement} flowRoot  Flow wrapper element.
 * @param {number}      stepIndex A step index (-1 = unknown, treated as reached).
 * @return {boolean} Whether the shopper has seen that step.
 */
export function isStepReached( flowRoot, stepIndex ) {
	if ( typeof stepIndex !== 'number' || stepIndex < 0 ) {
		return true;
	}
	const reached = reachedSteps.get( flowRoot );
	return !! reached && reached.has( stepIndex );
}
