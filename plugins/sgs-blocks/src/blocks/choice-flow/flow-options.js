/**
 * SGS Choice Flow — option-click, Continue-click and Back-click handlers.
 *
 * Split out of `navigation.js` (which was growing past this codebase's
 * 250-line JS guideline) — this file owns the D1 continue-model's visual
 * selection state and the three public click handlers `view.js` wires up.
 * Answer recording and next-step resolution live in `flow-routing.js`; step
 * reveal and footer chrome live in `flow-steps.js`; persistence lives in
 * `flow-persistence.js`.
 *
 * @package SGS\Blocks
 */

import { forgetAnswersFrom } from './flow-fields.js';
import { clearVariationChoicesAfter } from './variation.js';
import { FLOW_SELECTOR, STEP_SELECTOR, OPTIONS_GROUP_SELECTOR, OPTION_BUTTON_SELECTOR, SELECTED_CLASS } from './flow-constants.js';
import { getSteps, showStepByIndex, updateContinueState, showContinueHint, hideContinueHint, advanceModeOf } from './flow-steps.js';
import { flowState, ensureNavigationState, persistFlowState } from './flow-persistence.js';
import { recordOptionAnswer, commitStepRouting } from './flow-routing.js';

/**
 * D1 — visually select an option and deselect its siblings in the same
 * options group (continue advanceMode only).
 *
 * @param {HTMLElement} buttonEl The clicked option.
 */
function selectOption( buttonEl ) {
	const scope = buttonEl.closest( OPTIONS_GROUP_SELECTOR ) || buttonEl.parentElement;
	if ( ! scope ) {
		return;
	}
	scope.querySelectorAll( OPTION_BUTTON_SELECTOR ).forEach( ( el ) => {
		const isThis = el === buttonEl;
		el.classList.toggle( SELECTED_CLASS, isThis );
		el.setAttribute( 'aria-pressed', isThis ? 'true' : 'false' );
	} );
}

/**
 * Handle a click on a choice-flow-question option button.
 *
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow-question__option-button`.
 */
export function handleOptionClick( buttonEl ) {
	const flowRoot = buttonEl.closest( FLOW_SELECTOR );
	if ( ! flowRoot ) {
		return;
	}

	const currentStepEl = buttonEl.closest( STEP_SELECTOR );
	if ( ! currentStepEl ) {
		return;
	}

	const steps = getSteps( flowRoot );
	const currentIndex = steps.indexOf( currentStepEl );
	if ( currentIndex === -1 ) {
		return;
	}

	ensureNavigationState( flowRoot );
	recordOptionAnswer( flowRoot, buttonEl, currentIndex );

	if ( 'tap' === advanceModeOf( flowRoot ) ) {
		commitStepRouting( flowRoot, buttonEl, currentIndex );
		return;
	}

	// D1 continue model: select + record, don't advance.
	selectOption( buttonEl );
	updateContinueState( flowRoot, currentStepEl );
	hideContinueHint( flowRoot );
}

/**
 * D1/D2 — handle a click on the footer's Continue button: commits the
 * current step's selected option's routing, or shows the "choose an option"
 * hint when nothing is selected yet.
 *
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow__continue`.
 */
export function handleContinueClick( buttonEl ) {
	const flowRoot = buttonEl.closest( FLOW_SELECTOR );
	if ( ! flowRoot ) {
		return;
	}

	const steps = getSteps( flowRoot );
	const currentStepEl = steps.find( ( stepEl ) => ! stepEl.hidden );
	if ( ! currentStepEl ) {
		return;
	}
	const currentIndex = steps.indexOf( currentStepEl );

	const selectedButtonEl = currentStepEl.querySelector( `.${ SELECTED_CLASS }` );
	if ( ! selectedButtonEl ) {
		showContinueHint( flowRoot );
		return;
	}

	hideContinueHint( flowRoot );
	commitStepRouting( flowRoot, selectedButtonEl, currentIndex );
}

/**
 * Handle a click on the flow's Back button. Pops the last-visited step index
 * off the history stack and reveals it.
 *
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow__nav-back`.
 */
export function handleBackClick( buttonEl ) {
	const flowRoot = buttonEl.closest( FLOW_SELECTOR );
	if ( ! flowRoot ) {
		return;
	}

	const instanceState = flowState.get( flowRoot );
	if ( ! instanceState || instanceState.history.length === 0 ) {
		return;
	}

	const previousIndex = instanceState.history.pop();
	forgetAnswersFrom( flowRoot, previousIndex );
	clearVariationChoicesAfter( flowRoot, previousIndex );
	showStepByIndex( flowRoot, previousIndex );
	persistFlowState( flowRoot, previousIndex, instanceState.tags, instanceState.history );
}
