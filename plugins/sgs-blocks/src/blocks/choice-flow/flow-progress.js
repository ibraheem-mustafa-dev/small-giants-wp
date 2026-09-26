/**
 * SGS Choice Flow — progress bar / stepper / badge chrome.
 *
 * Split out of `navigation.js` (which was growing past this codebase's
 * 250-line JS guideline) — this file owns the 'circles' stepper markup/state
 * and the 'badge' progress-pill, both driven by `flow-steps.js`'s
 * `showStepByIndex()`.
 *
 * @package SGS\Blocks
 */

import {
	STEPPER_SELECTOR,
	PROGRESS_SELECTOR,
	PROGRESS_BADGE_SELECTOR,
	RESULT_SELECTOR,
	STEP_COUNT_SELECTOR,
	STEP_LABEL_SELECTOR,
	QUESTION_SELECTOR,
} from './flow-constants.js';

/** @type {WeakSet<HTMLElement>} Per-instance: has the 'circles' stepper been built? */
const stepperBuilt = new WeakSet();

/**
 * Build the 'circles' progress variant's N circle+connector items once per
 * flow instance (AthleanX reference pattern — see style.css's own comment).
 *
 * @param {HTMLElement}   flowRoot Flow wrapper element.
 * @param {HTMLElement[]} steps    This flow's question steps.
 */
export function buildStepperMarkup( flowRoot, steps ) {
	const stepperEl = flowRoot.querySelector( STEPPER_SELECTOR );
	if ( ! stepperEl || stepperBuilt.has( flowRoot ) ) {
		return;
	}

	stepperEl.innerHTML = '';
	steps.forEach( ( stepEl, index ) => {
		const itemEl = document.createElement( 'div' );
		itemEl.className = 'sgs-choice-flow__stepper-item';

		const circleEl = document.createElement( 'span' );
		circleEl.className = 'sgs-choice-flow__stepper-circle';
		circleEl.textContent = String( index + 1 );

		const labelEl = document.createElement( 'span' );
		labelEl.className = 'sgs-choice-flow__stepper-label';
		labelEl.textContent = stepEl.getAttribute( 'data-step-label' ) || '';

		itemEl.appendChild( circleEl );
		itemEl.appendChild( labelEl );
		stepperEl.appendChild( itemEl );

		if ( index < steps.length - 1 ) {
			const connectorEl = document.createElement( 'span' );
			connectorEl.className = 'sgs-choice-flow__stepper-connector';
			stepperEl.appendChild( connectorEl );
		}
	} );

	stepperBuilt.add( flowRoot );
}

/**
 * Update the 'circles' variant's per-item complete/current/upcoming state.
 *
 * @param {HTMLElement} flowRoot    Flow wrapper element.
 * @param {number}      targetIndex Currently-shown step index.
 */
export function updateStepperState( flowRoot, targetIndex ) {
	const stepperEl = flowRoot.querySelector( STEPPER_SELECTOR );
	if ( ! stepperEl ) {
		return;
	}
	const items = stepperEl.querySelectorAll( '.sgs-choice-flow__stepper-item' );
	items.forEach( ( itemEl, index ) => {
		itemEl.classList.toggle( 'is-current', index === targetIndex );
		itemEl.classList.toggle( 'is-complete', index < targetIndex );
	} );
}

/**
 * Update the 'badge' variant's step-count pill position + text.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {number}      current  1-based current step number.
 * @param {number}      total    Total step count.
 * @param {number}      progress 0–1 progress fraction (matches the fill).
 */
export function updateProgressBadge( flowRoot, current, total, progress ) {
	if ( flowRoot.dataset.progressStyle !== 'badge' ) {
		return;
	}
	const progressEl = flowRoot.querySelector( PROGRESS_SELECTOR );
	if ( ! progressEl ) {
		return;
	}
	let badgeEl = progressEl.querySelector( PROGRESS_BADGE_SELECTOR );
	if ( ! badgeEl ) {
		badgeEl = document.createElement( 'span' );
		badgeEl.className = 'sgs-choice-flow__progress-badge';
		progressEl.appendChild( badgeEl );
	}
	badgeEl.textContent = `${ current }/${ total }`;
	badgeEl.style.left = `calc(${ progress } * 100%)`;
}

/**
 * A question step's own eyebrow (`sgs/choice-flow-question`'s `eyebrow`,
 * render.php's `data-eyebrow`), '' when it has none.
 *
 * @param {HTMLElement} stepEl A `.sgs-form-step`.
 * @return {string} The eyebrow text.
 */
function stepEyebrow( stepEl ) {
	const questionEl = stepEl ? stepEl.querySelector( QUESTION_SELECTOR ) : null;
	return questionEl ? ( questionEl.getAttribute( 'data-eyebrow' ) || '' ).trim() : '';
}

/**
 * Update everything that names the current step's position: the progress
 * fill, the "Question N of M" line, the step label, the stepper and badge.
 *
 * - Progress (`data-progress-counts`): 'finished' (D8) counts questions
 *   already answered, empty on question 1; 'current' counts the question
 *   being shown, so question 1 of 4 fills a quarter. Full on a result step
 *   either way. A result step is never counted as a question: a branching
 *   flow can end in several.
 * - The position line reads "<data-step-count-label> N of M" over the
 *   questions without their own eyebrow; a question with one shows it
 *   instead ("Last bit, and it can wait").
 *
 * @param {HTMLElement}   flowRoot    Flow wrapper element.
 * @param {HTMLElement[]} steps       This flow's steps in DOM order.
 * @param {number}        targetIndex The step now shown.
 */
export function updateStepPosition( flowRoot, steps, targetIndex ) {
	const targetStepEl = steps[ targetIndex ];
	const questionSteps = steps.filter( ( stepEl ) => ! stepEl.querySelector( RESULT_SELECTOR ) );
	const total = questionSteps.length || steps.length;
	const questionIndex = questionSteps.indexOf( targetStepEl );
	const isResultStep = questionIndex === -1;
	const counted = isResultStep ? total : questionIndex + ( 'current' === flowRoot.dataset.progressCounts ? 1 : 0 );
	const progress = total > 0 ? counted / total : 0;
	flowRoot.style.setProperty( '--sgs-choice-flow-progress', String( progress ) );
	flowRoot.dataset.questionIndex = String( questionIndex );

	const numbered = questionSteps.filter( ( stepEl ) => ! stepEyebrow( stepEl ) );
	const numberedIndex = numbered.indexOf( targetStepEl );
	const position = numberedIndex === -1 ? numbered.length : numberedIndex + 1;
	const stepCountEl = flowRoot.querySelector( STEP_COUNT_SELECTOR );
	if ( stepCountEl ) {
		const label = flowRoot.dataset.stepCountLabel || 'Step';
		stepCountEl.textContent = stepEyebrow( targetStepEl ) || `${ label } ${ position } of ${ numbered.length || total }`;
	}

	const stepLabelEl = flowRoot.querySelector( STEP_LABEL_SELECTOR );
	if ( stepLabelEl && targetStepEl ) {
		// Falls back to the question's own title when the step has no label, so
		// chrome.js's showcase eyebrow always has a step name to show.
		const questionTitleEl = targetStepEl.querySelector( '.sgs-choice-flow-question__title' );
		stepLabelEl.textContent =
			targetStepEl.getAttribute( 'data-step-label' ) || ( questionTitleEl ? questionTitleEl.textContent : '' );
	}

	buildStepperMarkup( flowRoot, questionSteps.length ? questionSteps : steps );
	updateStepperState( flowRoot, isResultStep ? total : questionIndex );
	updateProgressBadge( flowRoot, isResultStep ? total : questionIndex + 1, total, progress );
}
