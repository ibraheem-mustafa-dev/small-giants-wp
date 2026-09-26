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

import { STEPPER_SELECTOR, PROGRESS_SELECTOR, PROGRESS_BADGE_SELECTOR } from './flow-constants.js';

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
