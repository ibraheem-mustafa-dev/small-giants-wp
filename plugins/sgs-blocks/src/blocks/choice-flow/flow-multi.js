/**
 * SGS Choice Flow — a question that takes more than one answer (Spec 43 FR-43-27).
 *
 * A plain question whose `answersMax` is above 1 renders its options as toggles
 * (`role="checkbox"`) and carries `data-answers-min` / `data-answers-max` on its
 * wrapper. This module owns the count rules (pure, no DOM) and the DOM helpers
 * the click, Continue and answer-recording code share.
 *
 * @package SGS\Blocks
 */

import { QUESTION_SELECTOR, OPTION_BUTTON_SELECTOR, SELECTED_CLASS } from './flow-constants.js';

const LIVE_REGION_SELECTOR = '.sgs-choice-flow-question__limit-message';

/**
 * Read a question's answer limits.
 *
 * @param {string|null} rawMin `data-answers-min`.
 * @param {string|null} rawMax `data-answers-max`.
 * @return {{min: number, max: number}} min >= 1, max >= min; 1 and 1 for anything unreadable.
 */
export function parseLimits( rawMin, rawMax ) {
	const max = parseInt( rawMax, 10 );
	if ( ! Number.isInteger( max ) || max < 2 ) {
		return { min: 1, max: 1 };
	}
	const min = parseInt( rawMin, 10 );
	return { min: Number.isInteger( min ) && min >= 1 ? Math.min( min, max ) : 1, max };
}

/**
 * Whether a pick may be added.
 *
 * @param {number} chosen Answers chosen now.
 * @param {number} max    The most allowed.
 * @return {boolean} True while below the limit.
 */
export function canAddAnswer( chosen, max ) {
	return chosen < max;
}

/**
 * Whether Continue may be enabled.
 *
 * @param {number} chosen Answers chosen now.
 * @param {number} min    The least allowed.
 * @return {boolean} True once the least is reached.
 */
export function meetsLeast( chosen, min ) {
	return chosen >= min;
}

/**
 * The cart-line value for a multi-answer question: the chosen labels in the order shown.
 *
 * @param {string[]} labels Chosen labels, in option order.
 * @return {string} Labels joined with ", ".
 */
export function joinAnswerLabels( labels ) {
	return labels.map( ( label ) => String( label ).trim() ).filter( Boolean ).join( ', ' );
}

/**
 * @param {HTMLElement|null} questionEl A `.sgs-choice-flow-question`.
 * @return {{min: number, max: number}} Its limits (1 and 1 on a default question).
 */
export function questionLimits( questionEl ) {
	return parseLimits(
		questionEl ? questionEl.getAttribute( 'data-answers-min' ) : null,
		questionEl ? questionEl.getAttribute( 'data-answers-max' ) : null
	);
}

/**
 * @param {HTMLElement|null} questionEl A `.sgs-choice-flow-question`.
 * @return {boolean} True when it takes more than one answer.
 */
export function isMultiQuestion( questionEl ) {
	return questionLimits( questionEl ).max > 1;
}

/**
 * Every chosen option of the multi-answer question holding `buttonEl`, in the order shown;
 * just `[ buttonEl ]` on a default question.
 *
 * @param {HTMLElement} buttonEl An option button.
 * @return {HTMLElement[]} The chosen option buttons.
 */
export function chosenButtons( buttonEl ) {
	const questionEl = buttonEl.closest( QUESTION_SELECTOR );
	if ( ! isMultiQuestion( questionEl ) ) {
		return [ buttonEl ];
	}
	return Array.from( questionEl.querySelectorAll( OPTION_BUTTON_SELECTOR ) ).filter( ( el ) => el.classList.contains( SELECTED_CLASS ) );
}

/**
 * The option whose route a multi-answer question follows: the first chosen option that has one
 * (a next step or the terminal sentinel), else the first chosen.
 *
 * @param {HTMLElement[]} chosen Chosen buttons, in option order.
 * @return {HTMLElement} The routing button.
 */
export function routingButton( chosen ) {
	return chosen.find( ( el ) => '' !== ( el.getAttribute( 'data-next-step-id' ) || '' ) ) || chosen[ 0 ];
}

/**
 * Toggle a multi-answer option, refusing a pick past the limit with a polite announcement.
 *
 * @param {HTMLElement} buttonEl The clicked option.
 * @return {boolean} True when the selection changed.
 */
export function toggleMultiOption( buttonEl ) {
	const questionEl = buttonEl.closest( QUESTION_SELECTOR );
	const { max } = questionLimits( questionEl );
	const on = buttonEl.classList.contains( SELECTED_CLASS );
	const region = questionEl ? questionEl.querySelector( LIVE_REGION_SELECTOR ) : null;
	if ( ! on && ! canAddAnswer( chosenButtons( buttonEl ).length, max ) ) {
		if ( region ) {
			// Cleared first so an identical repeat message is announced again.
			region.textContent = '';
			window.requestAnimationFrame( () => {
				region.textContent = region.getAttribute( 'data-message' ) || '';
			} );
		}
		return false;
	}
	buttonEl.classList.toggle( SELECTED_CLASS, ! on );
	buttonEl.setAttribute( 'aria-checked', on ? 'false' : 'true' );
	if ( region ) {
		region.textContent = '';
	}
	return true;
}
