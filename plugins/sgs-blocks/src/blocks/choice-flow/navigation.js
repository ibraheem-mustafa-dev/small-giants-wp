/**
 * SGS Choice Flow — navigation engine.
 *
 * Split out of `view.js` (which was growing past this codebase's 250-line JS
 * guideline) — this file owns step visibility, the progress bar/stepper/
 * badge, Back, session persistence, and the D1/D2/D3 Continue model (Bean's
 * review, 2026-09-26, plan `2026-09-26-choice-flow-ux-and-guided-buybox.md`).
 * `view.js` keeps only the module bootstrap (click delegation, store()
 * registration) and calls into this file's exports.
 *
 * This file is itself now split across sibling modules — `flow-constants.js`
 * (shared selectors/classes), `flow-persistence.js` (sessionStorage + this
 * flow's tags/history state), `flow-progress.js` (stepper/badge chrome),
 * `flow-steps.js` (step reveal + footer chrome), `flow-routing.js` (answer
 * recording + next-step resolution) and `flow-options.js` (the click
 * handlers) — because it had itself grown past the 250-line guideline. This
 * file stays the one public entry point: every name below re-exports from
 * whichever sibling module now owns it, so nothing outside this folder had
 * to change its imports.
 *
 * D1 — advanceMode:
 *   - 'tap' (legacy): clicking an option records its answer AND immediately
 *     advances — the exact behaviour this file had before this change.
 *   - 'continue' (default): clicking an option records its answer and marks
 *     it selected (`.sgs-choice-flow-question__option-button--selected` +
 *     `aria-pressed="true"`, siblings in the same `.sgs-choice-flow-
 *     question__options` group deselected) but does NOT advance. Tags,
 *     `addToBagNow` and the actual step change are deferred to the footer's
 *     Continue button, which reads whichever option is currently selected
 *     in the step it's shown on (`commitStepRouting()`).
 *
 * D2 — the Continue button is never truly `disabled` (it stays reachable by
 * keyboard/AT — `aria-disabled` only), so a press always reaches
 * `handleContinueClick()`; with no selection it shows the inline hint and
 * does not advance, instead of silently doing nothing.
 *
 * D3 — the footer also carries "Add to basket"/"Buy now" while the current
 * step is an `sgs/choice-flow-result` in `add-to-bag` mode, built from that
 * result's own `data-*` attributes (`choice-flow-result/render.php`) since
 * different result steps can switch these on/off and relabel them
 * independently. `updateFooterActions()` (now in `flow-steps.js`) is the one
 * place that decides which of Continue / Add to basket / Buy now / nothing
 * shows for the step just revealed.
 *
 * @package SGS\Blocks
 */

import { initPricePanel } from './pricing.js';
import { initVariation } from './variation.js';
import { applyDefaultSelections } from './defaults.js';
import { applyDefaultAnswers } from './flow-routing.js';
import { ensureNavigationState, restoreFlowState, flowState, getFlowTags } from './flow-persistence.js';
import { getSteps, advanceModeOf, getActiveResultEl, showStepByIndex } from './flow-steps.js';
import { handleOptionClick, handleContinueClick, handleBackClick } from './flow-options.js';

export {
	FLOW_SELECTOR,
	STEP_SELECTOR,
	OPTION_BUTTON_SELECTOR,
	RESULT_SELECTOR,
	BACK_BUTTON_SELECTOR,
	CONTINUE_BUTTON_SELECTOR,
	ADD_TO_BASKET_BUTTON_SELECTOR,
	BUY_NOW_BUTTON_SELECTOR,
	SELECTED_CLASS,
} from './flow-constants.js';

export { getSteps, advanceModeOf, getActiveResultEl, showStepByIndex };
export { getFlowTags };
export { handleOptionClick, handleContinueClick, handleBackClick };

/**
 * Initialise a single flow instance on page load: resume a persisted step if
 * one exists, otherwise show the first step.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
export function initFlow( flowRoot ) {
	const steps = getSteps( flowRoot );
	if ( steps.length === 0 ) {
		return;
	}

	initPricePanel( flowRoot );
	initVariation( flowRoot );
	applyDefaultSelections( flowRoot );
	applyDefaultAnswers( flowRoot );

	// A flow ending in add to bag or email sends answers that are not
	// persisted, so it always starts from step 1 rather than resuming
	// without them.
	const restored = flowRoot.querySelector( '[data-action="add-to-bag"], [data-action="email"]' ) ? null : restoreFlowState( flowRoot );

	if ( restored && restored.stepIndex >= 0 && restored.stepIndex < steps.length ) {
		flowState.set( flowRoot, {
			tags: new Set( restored.tags ),
			history: restored.history,
		} );
		showStepByIndex( flowRoot, restored.stepIndex );
		return;
	}

	ensureNavigationState( flowRoot );
	showStepByIndex( flowRoot, 0 );
}
