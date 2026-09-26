/**
 * SGS Choice Flow — answer recording and next-step routing.
 *
 * Split out of `navigation.js` (which was growing past this codebase's
 * 250-line JS guideline) — this file owns recording an option's answer
 * (priced add-on, plain, or variation choice), resolving the D3 terminal
 * sentinel to a concrete result step, and committing a step's routing
 * (tags, the FR-43-20 "no add-ons" exit, and the actual step change). Also
 * owns applying a default-preselected option's answer on flow init.
 *
 * @package SGS\Blocks
 */

import { recordAddonAnswer, resetAddonAnswers } from './pricing.js';
import { recordPlainAnswer } from './flow-fields.js';
import { handleProductOptionClick } from './variation.js';
import { STEP_SELECTOR, RESULT_SELECTOR, OPTIONS_GROUP_SELECTOR, DEFAULT_OPTION_SELECTOR, TERMINAL_SENTINEL } from './flow-constants.js';
import { getSteps, showStepByIndex, advanceModeOf } from './flow-steps.js';
import { ensureNavigationState, persistFlowState } from './flow-persistence.js';

/**
 * Read a step's accumulated `sgs/choice-flow-result` match tags, if the
 * step contains one.
 *
 * @param {HTMLElement} stepEl A `.sgs-form-step` element.
 * @return {{resultEl: HTMLElement, tags: string[]}|null} Result info, or null.
 */
function getStepResultInfo( stepEl ) {
	const resultEl = stepEl.querySelector( RESULT_SELECTOR );
	if ( ! resultEl ) {
		return null;
	}
	const raw = resultEl.getAttribute( 'data-match-tags' ) || '';
	const tags = raw
		.split( ',' )
		.map( ( tag ) => tag.trim() )
		.filter( Boolean );
	return { resultEl, tags };
}

/**
 * Resolve the terminal `"__terminal__"` sentinel to a concrete step index —
 * whichever `sgs/choice-flow-result` step's tags overlap most with the
 * path's accumulated tags wins; a tie falls back to flow order.
 *
 * @param {HTMLElement} flowRoot        Flow wrapper element.
 * @param {Set<string>} accumulatedTags Tags collected along the path so far.
 * @return {number} Winning result step index, or -1 if the flow has none.
 */
function resolveTerminalStepIndex( flowRoot, accumulatedTags ) {
	const steps = getSteps( flowRoot );
	let bestIndex = -1;
	let bestScore = -1;

	steps.forEach( ( stepEl, index ) => {
		const info = getStepResultInfo( stepEl );
		if ( ! info ) {
			return;
		}
		const score = info.tags.filter( ( tag ) => accumulatedTags.has( tag ) ).length;
		if ( score > bestScore ) {
			bestScore = score;
			bestIndex = index;
		}
	} );

	return bestIndex;
}

/**
 * Record an option's answer (priced add-on, plain, or variation choice) —
 * the D1 "select" half of a click, shared by both advanceModes and by
 * `applyDefaultAnswers()` for a default-preselected option.
 *
 * @param {HTMLElement} flowRoot  Flow wrapper element.
 * @param {HTMLElement} buttonEl  The option button.
 * @param {number}      stepIndex The option's step index.
 */
export function recordOptionAnswer( flowRoot, buttonEl, stepIndex ) {
	handleProductOptionClick( flowRoot, buttonEl, stepIndex );

	const priceGroup = buttonEl.getAttribute( 'data-price-group' ) || '';
	if ( priceGroup ) {
		const optionsEl = buttonEl.closest( OPTIONS_GROUP_SELECTOR );
		const groupLabel = optionsEl ? optionsEl.getAttribute( 'data-price-group-label' ) || '' : '';
		recordAddonAnswer(
			flowRoot,
			priceGroup,
			groupLabel,
			buttonEl.getAttribute( 'data-value' ) || '',
			buttonEl.getAttribute( 'data-price-label' ) || '',
			buttonEl.getAttribute( 'data-price' ) || '0',
			{
				stepIndex,
				effect: buttonEl.getAttribute( 'data-stage-effect' ) || '',
				summaryText: buttonEl.getAttribute( 'data-summary-text' ) || '',
				startingPrice: 'from' === buttonEl.closest( '.sgs-choice-flow-question' )?.getAttribute( 'data-price-prefix' ),
			}
		);
	} else if ( 'variation' !== buttonEl.getAttribute( 'data-attribute-mode' ) ) {
		const stepEl = buttonEl.closest( STEP_SELECTOR );
		if ( stepEl ) {
			recordPlainAnswer( flowRoot, stepIndex, stepEl, buttonEl );
		}
	}
}

/**
 * D1/D3 — commit an option's routing: accumulate its tags, apply the
 * FR-43-20 "no add-ons" exit, resolve the next step (advance / terminal /
 * specific index) and show it. Called immediately after recording the
 * answer in 'tap' advanceMode, or from `handleContinueClick()` in 'continue'
 * advanceMode (reading whichever option the step's Continue button commits).
 *
 * @param {HTMLElement} flowRoot    Flow wrapper element.
 * @param {HTMLElement} buttonEl    The option whose routing applies.
 * @param {number}      currentIndex The step's index.
 */
export function commitStepRouting( flowRoot, buttonEl, currentIndex ) {
	const steps = getSteps( flowRoot );
	const instanceState = ensureNavigationState( flowRoot );

	const rawTags = buttonEl.getAttribute( 'data-tags' ) || '';
	rawTags
		.split( ',' )
		.map( ( tag ) => tag.trim() )
		.filter( Boolean )
		.forEach( ( tag ) => instanceState.tags.add( tag ) );

	if ( buttonEl.hasAttribute( 'data-add-to-bag-now' ) ) {
		resetAddonAnswers( flowRoot );
	}

	const nextStepId = buttonEl.getAttribute( 'data-next-step-id' ) || '';

	let targetIndex;
	if ( '' === nextStepId ) {
		targetIndex = currentIndex + 1;
	} else if ( TERMINAL_SENTINEL === nextStepId ) {
		targetIndex = resolveTerminalStepIndex( flowRoot, instanceState.tags );
	} else {
		const parsedIndex = parseInt( nextStepId, 10 );
		targetIndex =
			Number.isInteger( parsedIndex ) && parsedIndex >= 0 && parsedIndex < steps.length
				? parsedIndex
				: currentIndex + 1; // Defensive fallback — malformed/legacy data, never fatal.
	}

	if ( targetIndex < 0 || targetIndex >= steps.length ) {
		return;
	}

	instanceState.history.push( currentIndex );
	showStepByIndex( flowRoot, targetIndex );
	persistFlowState( flowRoot, targetIndex, instanceState.tags, instanceState.history );

	flowRoot.scrollIntoView( { behavior: 'smooth', block: 'start' } );
}

/**
 * D1/D2 — a default-preselected option (`data-default="1"`,
 * `defaults.js`'s own selector) already carries the visual selected state;
 * this also records its answer, in 'continue' advanceMode only, so the
 * Continue button is active immediately rather than muted for an answer the
 * shopper never had to actively choose. A no-op in 'tap' advanceMode — a
 * default there stays exactly as it always has (visual only).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
export function applyDefaultAnswers( flowRoot ) {
	if ( 'continue' !== advanceModeOf( flowRoot ) ) {
		return;
	}
	const steps = getSteps( flowRoot );
	flowRoot.querySelectorAll( DEFAULT_OPTION_SELECTOR ).forEach( ( buttonEl ) => {
		buttonEl.setAttribute( 'aria-pressed', 'true' );
		const stepEl = buttonEl.closest( STEP_SELECTOR );
		const stepIndex = stepEl ? steps.indexOf( stepEl ) : -1;
		if ( stepIndex !== -1 ) {
			recordOptionAnswer( flowRoot, buttonEl, stepIndex );
		}
	} );
}
