/**
 * SGS Choice Flow — step-change accessibility: the live-region announcement
 * ("Step 2 of 4: <question>") and keeping keyboard focus inside the step
 * that has just appeared.
 *
 * @package SGS\Blocks
 */

import { RESULT_SELECTOR, ANNOUNCER_SELECTOR } from './flow-constants.js';

const HEADING_SELECTOR = '.sgs-choice-flow-question__title, .sgs-choice-flow-result__heading';
const DEFAULT_TEMPLATE = 'Step %1$s of %2$s: %3$s';

/**
 * A step's question text: its heading, else its step label.
 *
 * @param {HTMLElement} stepEl A `.sgs-form-step`.
 * @return {string} The text, trimmed (empty when the step has neither).
 */
function stepQuestionText( stepEl ) {
	const headingEl = stepEl.querySelector( HEADING_SELECTOR );
	return ( ( headingEl ? headingEl.textContent : '' ) || stepEl.getAttribute( 'data-step-label' ) || '' ).trim();
}

/**
 * Write "Step N of M: <question>" to the flow's live region. Questions are
 * counted as flow-progress.js counts them; a result step is the one extra
 * closing step after them.
 *
 * @param {HTMLElement}   flowRoot    Flow wrapper element.
 * @param {HTMLElement[]} steps       Every step, in DOM order.
 * @param {number}        targetIndex The step now shown.
 */
export function announceStep( flowRoot, steps, targetIndex ) {
	const announcerEl = flowRoot.querySelector( ANNOUNCER_SELECTOR );
	const targetStepEl = steps[ targetIndex ];
	if ( ! announcerEl || ! targetStepEl ) {
		return;
	}

	const questionSteps = steps.filter( ( stepEl ) => ! stepEl.querySelector( RESULT_SELECTOR ) );
	const questionIndex = questionSteps.indexOf( targetStepEl );
	let position = targetIndex + 1;
	let total = steps.length;
	if ( questionSteps.length ) {
		total = questionSteps.length + ( questionIndex === -1 ? 1 : 0 );
		position = questionIndex === -1 ? total : questionIndex + 1;
	}

	const template = flowRoot.dataset.stepAnnounceTemplate || DEFAULT_TEMPLATE;
	announcerEl.textContent = template
		.replace( '%1$s', () => String( position ) )
		.replace( '%2$s', () => String( total ) )
		.replace( '%3$s', () => stepQuestionText( targetStepEl ) );
}

/**
 * Move focus to the new step's heading when the control that had focus has
 * gone (a picked option in a step that just hid, the Back button once there
 * is nothing to go back to). Focus on a control that is still shown, such as
 * Continue, stays where it is.
 *
 * @param {HTMLElement} targetStepEl The step now shown.
 */
export function moveFocusToStep( targetStepEl ) {
	const active = document.activeElement;
	const lost =
		! active ||
		active === document.body ||
		active === document.documentElement ||
		! active.isConnected ||
		!! active.closest( '[hidden]' );
	if ( ! lost ) {
		return;
	}
	const target = targetStepEl.querySelector( HEADING_SELECTOR ) || targetStepEl;
	if ( ! target.hasAttribute( 'tabindex' ) ) {
		target.setAttribute( 'tabindex', '-1' );
	}
	target.focus( { preventScroll: true } );
}
