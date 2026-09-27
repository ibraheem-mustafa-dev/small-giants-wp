/**
 * SGS Choice Flow — a question whose chosen option opens its next step
 * underneath (`sgs/choice-flow-question` setting `showNextStepInline`,
 * rendered as `data-inline-next="1"` on the question).
 *
 * The question stays shown and the chosen option's `nextStepId` step is shown
 * under it (any step another option opened before is hidden again). The
 * footer then follows the opened step: an add-to-bag result there shows
 * "Add to bag" with the running total and hides Continue. Add to bag reads the
 * visible result (`getActiveResultEl()`), so it validates and sends the opened
 * step's own fields exactly as when that step is shown on its own.
 * 'continue' advanceMode only; 'tap' advances on the click as always.
 *
 * @package SGS\Blocks
 */

import { OPTION_BUTTON_SELECTOR, SELECTED_CLASS } from './flow-constants.js';
import { getSteps, updateFooterActions, advanceModeOf, showStepByIndex } from './flow-steps.js';

const INLINE_QUESTION_SELECTOR = '.sgs-choice-flow-question[data-inline-next="1"]';
export const INLINE_STEP_CLASS = 'sgs-choice-flow__step--inline';

/**
 * Show a step (`showStepByIndex()`), then open the step its inline question's
 * selected option leads to. Every step change goes through here.
 *
 * @param {HTMLElement} flowRoot    Flow wrapper element.
 * @param {number}      targetIndex Step index to reveal.
 */
export function showStep( flowRoot, targetIndex ) {
	showStepByIndex( flowRoot, targetIndex );
	openInlineStep( flowRoot, getSteps( flowRoot )[ targetIndex ] || null );
}

/**
 * Show the step the selected option of `stepEl`'s inline question leads to,
 * directly under the question, and point the footer at it. Does nothing for a
 * step without an inline question or a selected option.
 *
 * @param {HTMLElement}      flowRoot Flow wrapper element.
 * @param {HTMLElement|null} stepEl   The question's step (currently shown).
 */
export function openInlineStep( flowRoot, stepEl ) {
	if ( ! stepEl || 'continue' !== advanceModeOf( flowRoot ) ) {
		return;
	}
	const questionEl = stepEl.querySelector( INLINE_QUESTION_SELECTOR );
	if ( ! questionEl ) {
		return;
	}
	const selected = questionEl.querySelector( `${ OPTION_BUTTON_SELECTOR }.${ SELECTED_CLASS }` );
	const steps = getSteps( flowRoot );
	const targetIndex = selected ? parseInt( selected.getAttribute( 'data-next-step-id' ) || '', 10 ) : NaN;
	const targetEl = Number.isInteger( targetIndex ) && targetIndex >= 0 && targetIndex < steps.length && steps[ targetIndex ] !== stepEl
		? steps[ targetIndex ]
		: null;

	steps.forEach( ( el ) => {
		if ( el.classList.contains( INLINE_STEP_CLASS ) && el !== targetEl ) {
			el.classList.remove( INLINE_STEP_CLASS );
			el.hidden = true;
		}
	} );

	if ( ! targetEl ) {
		updateFooterActions( flowRoot, stepEl );
		return;
	}
	targetEl.classList.add( INLINE_STEP_CLASS );
	targetEl.hidden = false;
	updateFooterActions( flowRoot, targetEl );
}

