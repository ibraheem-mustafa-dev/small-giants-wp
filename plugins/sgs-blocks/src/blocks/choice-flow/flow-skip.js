/**
 * SGS Choice Flow — the footer's skip link (Spec 43 FR-43-24), e.g. "Frame
 * only? Skip the lenses".
 *
 * It takes exactly the route of the flow's own "no add-ons" option (an
 * option flagged `addToBagNow`, e.g. "No prescription"): records that
 * answer, clears any add-ons and goes to that option's ending. It shows on
 * the first question only, and only when such an option exists.
 *
 * @package SGS\Blocks
 */

import { FLOW_SELECTOR, NO_ADDONS_OPTION_SELECTOR, SKIP_SELECTOR, STEP_SELECTOR } from './flow-constants.js';
import { getSteps } from './flow-steps.js';
import { recordOptionAnswer, commitStepRouting } from './flow-routing.js';

/**
 * Show the skip link on the first question when the flow can honour it.
 *
 * @param {HTMLElement} flowRoot    Flow wrapper element.
 * @param {number}      targetIndex The step now shown.
 */
export function updateSkipVisibility( flowRoot, targetIndex ) {
	const skipEl = flowRoot.querySelector( SKIP_SELECTOR );
	if ( skipEl ) {
		skipEl.hidden = targetIndex !== 0 || ! flowRoot.querySelector( NO_ADDONS_OPTION_SELECTOR );
	}
}

/**
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow__skip-button`.
 */
export function handleSkipClick( buttonEl ) {
	const flowRoot = buttonEl.closest( FLOW_SELECTOR );
	const optionEl = flowRoot ? flowRoot.querySelector( NO_ADDONS_OPTION_SELECTOR ) : null;
	const stepEl = optionEl ? optionEl.closest( STEP_SELECTOR ) : null;
	if ( ! stepEl ) {
		return;
	}
	const stepIndex = getSteps( flowRoot ).indexOf( stepEl );
	recordOptionAnswer( flowRoot, optionEl, stepIndex );
	commitStepRouting( flowRoot, optionEl, stepIndex );
}
