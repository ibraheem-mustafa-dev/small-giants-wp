/**
 * SGS Choice Flow — step visibility, footer chrome and Back-button chrome.
 *
 * Split out of `navigation.js` (which was growing past this codebase's
 * 250-line JS guideline) — this file owns showing/hiding `.sgs-form-step`
 * elements and everything that depends on which step is currently shown:
 * the progress bar/stepper/badge (delegated to `flow-progress.js`), the
 * Back button's visibility, and the footer's Continue/Add to basket/Buy now
 * actions (D2/D3 — kept here rather than in `flow-options.js` because
 * `showStepByIndex()` must call `updateFooterActions()` on every reveal, and
 * splitting them apart would create a circular import with
 * `flow-routing.js`'s `commitStepRouting()`, which calls back into
 * `showStepByIndex()`).
 *
 * @package SGS\Blocks
 */

import {
	STEP_SELECTOR,
	RESULT_SELECTOR,
	BACK_BUTTON_SELECTOR,
	CONTINUE_BUTTON_SELECTOR,
	ADD_TO_BASKET_BUTTON_SELECTOR,
	BUY_NOW_BUTTON_SELECTOR,
	SELECTED_CLASS,
	STEP_COUNT_SELECTOR,
	STEP_LABEL_SELECTOR,
	CONTINUE_HINT_SELECTOR,
} from './flow-constants.js';
import { buildStepperMarkup, updateStepperState, updateProgressBadge } from './flow-progress.js';
import { flowState } from './flow-persistence.js';

/**
 * Get this flow's `.sgs-form-step` children in DOM order.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {HTMLElement[]} Ordered step elements.
 */
export function getSteps( flowRoot ) {
	return Array.from( flowRoot.querySelectorAll( STEP_SELECTOR ) );
}

/**
 * This flow's advanceMode — 'continue' (default) or 'tap' —
 * (`choice-flow/render.php`'s `data-advance-mode`).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {'continue'|'tap'} The flow's advance mode.
 */
export function advanceModeOf( flowRoot ) {
	return 'tap' === flowRoot.getAttribute( 'data-advance-mode' ) ? 'tap' : 'continue';
}

/**
 * The currently-shown `.sgs-choice-flow-result`, if any.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {HTMLElement|null} The visible result element, or null.
 */
export function getActiveResultEl( flowRoot ) {
	return flowRoot.querySelector( `${ STEP_SELECTOR }:not([hidden]) ${ RESULT_SELECTOR }` );
}

/**
 * D3 — decide which footer action(s) show for the step just revealed:
 * Continue (a question step, 'continue' advanceMode only), Add to basket/
 * Buy now (an `add-to-bag` result step, per its own data-* attributes), or
 * nothing (a recommendation/email result, or any step in 'tap' advanceMode).
 *
 * @param {HTMLElement}      flowRoot    Flow wrapper element.
 * @param {HTMLElement|null} targetStepEl The step now shown.
 */
export function updateFooterActions( flowRoot, targetStepEl ) {
	const continueBtn = flowRoot.querySelector( CONTINUE_BUTTON_SELECTOR );
	const addToBasketBtn = flowRoot.querySelector( ADD_TO_BASKET_BUTTON_SELECTOR );
	const buyNowBtn = flowRoot.querySelector( BUY_NOW_BUTTON_SELECTOR );

	hideContinueHint( flowRoot );

	const resultEl = targetStepEl ? targetStepEl.querySelector( RESULT_SELECTOR ) : null;

	if ( ! resultEl ) {
		// A question step. Continue only exists in 'continue' advanceMode —
		// 'tap' already advanced the moment the option was clicked.
		if ( addToBasketBtn ) {
			addToBasketBtn.hidden = true;
		}
		if ( buyNowBtn ) {
			buyNowBtn.hidden = true;
		}
		if ( continueBtn ) {
			continueBtn.hidden = 'tap' === advanceModeOf( flowRoot );
			if ( ! continueBtn.hidden && targetStepEl ) {
				updateContinueState( flowRoot, targetStepEl );
			}
		}
		return;
	}

	// A terminal step: Continue never shows here.
	if ( continueBtn ) {
		continueBtn.hidden = true;
	}

	const isAddToBag = 'add-to-bag' === resultEl.getAttribute( 'data-action' );
	if ( addToBasketBtn ) {
		const show = isAddToBag && '1' === resultEl.getAttribute( 'data-show-add-to-basket' );
		addToBasketBtn.hidden = ! show;
		if ( show ) {
			addToBasketBtn.textContent = resultEl.getAttribute( 'data-add-to-basket-label' ) || addToBasketBtn.textContent;
		}
	}
	if ( buyNowBtn ) {
		const show = isAddToBag && '1' === resultEl.getAttribute( 'data-show-buy-now' );
		buyNowBtn.hidden = ! show;
		if ( show ) {
			buyNowBtn.textContent = resultEl.getAttribute( 'data-buy-now-label' ) || buyNowBtn.textContent;
		}
	}
}

/**
 * D2 — mute/activate the Continue button for the step now showing, based on
 * whether that step holds a selected option.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {HTMLElement} stepEl   The current step.
 */
export function updateContinueState( flowRoot, stepEl ) {
	const continueBtn = flowRoot.querySelector( CONTINUE_BUTTON_SELECTOR );
	if ( ! continueBtn ) {
		return;
	}
	const hasSelection = !! stepEl.querySelector( `.${ SELECTED_CLASS }` );
	continueBtn.classList.toggle( 'is-muted', ! hasSelection );
	continueBtn.setAttribute( 'aria-disabled', hasSelection ? 'false' : 'true' );
}

/**
 * D2 — show/hide the "Choose an option to continue" inline hint.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
export function showContinueHint( flowRoot ) {
	const hintEl = flowRoot.querySelector( CONTINUE_HINT_SELECTOR );
	if ( hintEl ) {
		hintEl.textContent = hintEl.getAttribute( 'data-message' ) || 'Choose an option to continue';
	}
}

/**
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
export function hideContinueHint( flowRoot ) {
	const hintEl = flowRoot.querySelector( CONTINUE_HINT_SELECTOR );
	if ( hintEl ) {
		hintEl.textContent = '';
	}
}

/**
 * Show exactly one step (by index), hide all others, and update every piece
 * of chrome that depends on the current step (progress, step text, Back
 * visibility, footer actions).
 *
 * @param {HTMLElement} flowRoot    Flow wrapper element.
 * @param {number}      targetIndex Step index to reveal.
 */
export function showStepByIndex( flowRoot, targetIndex ) {
	const steps = getSteps( flowRoot );
	const targetStepEl = steps[ targetIndex ];

	// Snap the target step to its pre-transition state BEFORE un-hiding it,
	// so the CSS opacity+translate transition plays on reveal (removed one
	// rAF later, which is what actually triggers it).
	if ( targetStepEl ) {
		targetStepEl.classList.add( 'is-entering' );
	}

	steps.forEach( ( stepEl, index ) => {
		stepEl.hidden = index !== targetIndex;
	} );

	if ( targetStepEl ) {
		requestAnimationFrame( () => {
			targetStepEl.classList.remove( 'is-entering' );
		} );
	}

	if ( steps.length > 0 ) {
		// D8 — progress counts FINISHED question steps: empty on step 1, full
		// on a result step. A branching flow can end in several result steps
		// (one per path), so counting those as questions would misreport the
		// total.
		const questionSteps = steps.filter( ( stepEl ) => ! stepEl.querySelector( RESULT_SELECTOR ) );
		const total = questionSteps.length || steps.length;
		const questionIndex = questionSteps.indexOf( targetStepEl );
		// "Step N of M" (the eyebrow) still names the CURRENT question's
		// position; the fill (below) is D8's separate finished-count formula.
		const position = questionIndex === -1 ? total : questionIndex + 1;
		const isResultStep = questionIndex === -1;
		const finishedCount = isResultStep ? total : questionIndex;
		const progress = total > 0 ? finishedCount / total : 0;
		flowRoot.style.setProperty( '--sgs-choice-flow-progress', String( progress ) );

		const stepCountEl = flowRoot.querySelector( STEP_COUNT_SELECTOR );
		if ( stepCountEl ) {
			stepCountEl.textContent = `Step ${ position } of ${ total }`;
		}

		const stepLabelEl = flowRoot.querySelector( STEP_LABEL_SELECTOR );
		if ( stepLabelEl && targetStepEl ) {
			stepLabelEl.textContent = targetStepEl.getAttribute( 'data-step-label' ) || '';
		}

		buildStepperMarkup( flowRoot, questionSteps.length ? questionSteps : steps );
		updateStepperState( flowRoot, isResultStep ? total : questionIndex );
		updateProgressBadge( flowRoot, position, total, progress );
	}

	updateBackButtonVisibility( flowRoot );
	updateFooterActions( flowRoot, targetStepEl || null );
}

/**
 * Show/hide the flow's Back button based on whether there is a previous
 * step to return to.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
export function updateBackButtonVisibility( flowRoot ) {
	const backButtonEl = flowRoot.querySelector( BACK_BUTTON_SELECTOR );
	if ( ! backButtonEl ) {
		return;
	}
	const instanceState = flowState.get( flowRoot );
	backButtonEl.hidden = ! instanceState || instanceState.history.length === 0;
}
