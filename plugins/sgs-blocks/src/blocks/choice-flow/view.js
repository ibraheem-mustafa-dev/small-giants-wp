/**
 * SGS Choice Flow — Interactivity API Store
 *
 * Spec 43 FR-43-9: `sgs/choice-flow` gets its OWN, small step-navigation
 * engine. It does NOT extend or import `sgs/form/view.js`'s 878-line engine
 * (that engine is fused to `sgs/form`'s progress bar / validation / submit
 * flow and is not exported for reuse) — this file only borrows that file's
 * STRUCTURAL CONVENTIONS (module-level `store()` call, DOMContentLoaded-
 * gated bootstrap, sessionStorage try/catch persistence pattern).
 *
 * Step markup this file depends on (read from the sibling blocks' own
 * render.php, not guessed):
 *   - `sgs/form-step`            → `.sgs-form-step` wrapper (reused inert
 *     step marker; carries no stable ID of its own — confirmed by reading
 *     its block.json, no `id`/`stepId` attribute exists there).
 *   - `sgs/choice-flow-question` → `.sgs-choice-flow-question__option-button`
 *     buttons, each carrying `data-value` / `data-next-step-id` /
 *     `data-tags` (plain data-* attributes, no `data-wp-on--click` — see
 *     that block's render.php docblock, which explicitly defers directive
 *     wiring to this file).
 *   - `sgs/choice-flow-result`   → `.sgs-choice-flow-result` wrapper
 *     carrying `data-match-tags` (comma-joined).
 *
 * CLICK-WIRING DECISION (task-mandated either/or — option (a) chosen):
 * a single delegated `click` listener on `document`, resolving the target
 * option button via `closest()`, rather than adding `data-wp-on--click`
 * directives to `choice-flow-question/render.php`. Reasons: (1) `sgs/choice-
 * flow`'s own render.php does not exist yet (a later step) so there is no
 * guarantee its wrapper will carry a `data-wp-init`/`data-wp-watch` hook for
 * a callback-based bootstrap to attach to — a plain DOMContentLoaded-gated
 * bootstrap (mirroring `sgs/form/view.js`'s own `initForms()` pattern,
 * lines ~845-854 of that file) has no such dependency and works the moment
 * the future render.php emits `data-wp-interactive="sgs/choice-flow"` on
 * the wrapper; (2) it keeps `choice-flow-question/render.php` completely
 * untouched, which is the smaller diff given a second, unrelated gap
 * (below) already required touching two other files.
 *
 * STEP-IDENTIFICATION GAP FOUND + FIXED (not in this file — see report):
 * `choice-flow-question/edit.js`'s step picker was storing the target
 * step's React-internal `clientId` string into `nextStepId`. `clientId` is
 * an editor-only concept — WordPress's `parse_blocks()` never includes it
 * in the parsed block tree render.php receives, so there was no way for
 * ANY render-time or runtime code to resolve it back to a step position.
 * Fixed at the source (`choice-flow-question/edit.js`): the picker now
 * stores the target step's 0-based DOM-order position amongst its flow's
 * `sgs/form-step` children instead. `choice-flow-question/render.php`
 * needed NO change — it already echoes `nextStepId` verbatim as
 * `data-next-step-id`, so a stringified index flows through it unchanged.
 * This file treats a non-empty, non-`"__terminal__"` `data-next-step-id`
 * as that 0-based index into `flowRoot.querySelectorAll('.sgs-form-step')`
 * — the exact DOM-order lookup `sgs/form/view.js` itself already uses for
 * its own `.sgs-form-step` indexing (`formRoot.querySelectorAll(
 * '.sgs-form-step' )[ ctx.currentStep ]`), so this is an established
 * codebase convention, not a new one invented for this file.
 *
 * SHOW/HIDE MECHANISM: uses the native `hidden` IDL property rather than
 * `sgs/form/view.js`'s `sgs-form-step--hidden` CSS class. That class is
 * defined only in `sgs/form`'s own `style.css`, which WordPress will not
 * enqueue on a page that uses `sgs/choice-flow` without also using
 * `sgs/form` — depending on it would silently break step-hiding on any
 * pure-quiz page. `hidden` needs zero CSS of any kind (browser UA
 * stylesheet), so it works unconditionally and keeps this engine genuinely
 * independent per FR-43-9.
 *
 * @package SGS\Blocks
 */

import { store } from '@wordpress/interactivity';
import { INFO_TOGGLE_SELECTOR, handleInfoToggleClick } from '../../shared/info-toggle.js';
import { initPricePanel, recordAddonAnswer, resetAddonAnswers } from './pricing.js';
import { handleAddToBagClick } from './add-to-bag.js';
import { recordPlainAnswer, forgetAnswersFrom, uploadFlowFile } from './flow-fields.js';
import { initVariation, clearVariationChoicesAfter, handleProductOptionClick } from './variation.js';
import { initChrome } from './chrome.js';
import { initEmailResults } from './email.js';
import { applyDefaultSelections } from './defaults.js';

const TERMINAL_SENTINEL = '__terminal__';

const FLOW_SELECTOR = '[data-wp-interactive="sgs/choice-flow"]';
const STEP_SELECTOR = '.sgs-form-step';
const OPTION_BUTTON_SELECTOR = '.sgs-choice-flow-question__option-button';
const RESULT_SELECTOR = '.sgs-choice-flow-result';
const BACK_BUTTON_SELECTOR = '.sgs-choice-flow__nav-back';
const STEP_COUNT_SELECTOR = '.sgs-choice-flow__step-count';
const STEP_LABEL_SELECTOR = '.sgs-choice-flow__step-label';
const STEPPER_SELECTOR = '.sgs-choice-flow__stepper';
const PROGRESS_SELECTOR = '.sgs-choice-flow__progress';
const PROGRESS_BADGE_SELECTOR = '.sgs-choice-flow__progress-badge';
const ADD_TO_BAG_BUTTON_SELECTOR = '.sgs-choice-flow-result__add-to-bag';

/**
 * Per-instance flag: has this flow's `.sgs-choice-flow__stepper` container
 * (present only for `progressStyle: "circles"`) already been populated with
 * its N circle+connector items? Built lazily on the FIRST `showStepByIndex()`
 * call rather than at `initFlow()` time, so it always has the flow's real
 * step count + labels available (both already resolved by that point).
 *
 * @type {WeakSet<HTMLElement>}
 */
const stepperBuilt = new WeakSet();

/**
 * Build the 'circles' progress variant's N circle+connector items once per
 * flow instance (AthleanX reference pattern — see style.css's own comment).
 * Idempotent per instance via `stepperBuilt`; a no-op when the flow's
 * `progressStyle` isn't 'circles' (the container simply won't exist, since
 * render.php only emits it for that variant).
 *
 * @param {HTMLElement}   flowRoot Flow wrapper element.
 * @param {HTMLElement[]} steps    This flow's `.sgs-form-step` children.
 */
function buildStepperMarkup( flowRoot, steps ) {
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
 * A no-op when the stepper container doesn't exist (any other
 * `progressStyle`).
 *
 * @param {HTMLElement} flowRoot    Flow wrapper element.
 * @param {number}      targetIndex Currently-shown step index.
 */
function updateStepperState( flowRoot, targetIndex ) {
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
 * Update the 'badge' variant's step-count pill position + text — a no-op
 * when the flow's `progressStyle` isn't 'badge' (render.php never emits
 * `.sgs-choice-flow__progress` with `data-progress-style="badge"` on the
 * wrapper otherwise, so the CSS positioning context this relies on isn't
 * present, but reading/creating the badge element itself is still safe
 * either way — this function only ever runs when the wrapper's own
 * `dataset.progressStyle` says to).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @param {number}      current  1-based current step number.
 * @param {number}      total    Total step count.
 * @param {number}      progress 0–1 progress fraction (matches the fill).
 */
function updateProgressBadge( flowRoot, current, total, progress ) {
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
 * Per-instance navigation state, keyed by the flow's root DOM element.
 *
 * Kept outside the Interactivity API's reactive `state`/`context` layer
 * deliberately: v1 has no server-injected `data-wp-context` (no render.php
 * yet) and no reactive `data-wp-bind`/`data-wp-text` bindings anywhere in
 * the question/result markup (unlike `sgs/form`'s progress bar), so there
 * is nothing for context-based reactivity to drive. Plain DOM-scoped state
 * mirrors `sgs/form/view.js`'s own `updateStepVisibility()` — which itself
 * manipulates `classList` directly rather than routing through `ctx` — for
 * everything except its progress-bar-specific reactive getters.
 *
 * @type {WeakMap<HTMLElement, {tags: Set<string>, history: number[]}>}
 */
const flowState = new WeakMap();

/**
 * In-memory fallback store, used only when `sessionStorage` throws (FR-43
 * build task point 6 — private browsing etc.). Scoped to this module so it
 * survives for the lifetime of the page view, same guarantee sessionStorage
 * would have given.
 *
 * @type {Map<string, string>}
 */
const memoryFallback = new Map();

/**
 * Safe sessionStorage wrapper — falls back to an in-memory Map on throw.
 * No console logging on failure: a private-browsing user is not a bug to
 * report, just a degraded-but-working state (task point 6).
 */
const safeStorage = {
	getItem( key ) {
		try {
			return sessionStorage.getItem( key );
		} catch ( _e ) {
			return memoryFallback.has( key ) ? memoryFallback.get( key ) : null;
		}
	},
	setItem( key, value ) {
		try {
			sessionStorage.setItem( key, value );
		} catch ( _e ) {
			memoryFallback.set( key, value );
		}
	},
	removeItem( key ) {
		try {
			sessionStorage.removeItem( key );
		} catch ( _e ) {
			memoryFallback.delete( key );
		}
	},
};

/**
 * Build a sessionStorage key unique to this flow instance, namespaced so it
 * can never collide with `sgs/form`'s own `sgs-form-step-${formId}` keys
 * (different prefix entirely) or with a sibling `sgs/choice-flow` instance
 * on the same page.
 *
 * Uses render.php's `data-flow-id` (page ID + the flow's attribute hash):
 * sessionStorage lasts for the whole tab, so a key must never repeat across
 * pages. Falls back to the instance's position on the page.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {string} Storage key.
 */
function getFlowStorageKey( flowRoot ) {
	const explicitId = flowRoot.getAttribute( 'data-flow-id' ) || flowRoot.id;
	if ( explicitId ) {
		return `sgs-choice-flow-${ explicitId }`;
	}
	const allFlows = Array.from( document.querySelectorAll( FLOW_SELECTOR ) );
	const index = allFlows.indexOf( flowRoot );
	return `sgs-choice-flow-instance-${ index >= 0 ? index : 0 }`;
}

/**
 * Get this flow's `.sgs-form-step` children in DOM order.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {HTMLElement[]} Ordered step elements.
 */
function getSteps( flowRoot ) {
	return Array.from( flowRoot.querySelectorAll( STEP_SELECTOR ) );
}

/**
 * Read a step's accumulated `sgs/choice-flow-result` match tags, if the
 * step contains one.
 *
 * @param {HTMLElement} stepEl A `.sgs-form-step` element.
 * @return {{resultEl: HTMLElement, tags: string[]}|null} Result info, or
 *         null if this step has no result block.
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
 * FR-43-12: whichever `sgs/choice-flow-result` step's tags overlap most
 * with the path's accumulated tags wins. A tie, or every result scoring 0
 * (including the common single-untagged-result case), falls back to flow
 * order — first-declared wins, matching `choice-flow-result/render.php`'s
 * own documented content model ("if a flow has exactly one ... result step
 * and it carries no tags, it is the flow's only/default result and always
 * shows").
 *
 * @param {HTMLElement} flowRoot        Flow wrapper element.
 * @param {Set<string>} accumulatedTags Tags collected along the path so far.
 * @return {number} Index (within `getSteps()`) of the winning result step,
 *                   or -1 if the flow has no result steps at all.
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
 * Show exactly one step (by index), hide all others. Uses the native
 * `hidden` IDL property — see file-level docblock for why this is used
 * instead of `sgs/form`'s CSS class. `hidden` is the real accessibility/
 * layout mechanism and is UNCHANGED by the additions below.
 *
 * Visual-QA pass (2026-09-15, design-reviewer gaps #2/#3) additionally:
 *   - toggles `.is-entering` on the newly-revealed step so style.css's
 *     CSS-only opacity+translate transition plays on step change (a pure
 *     visual layer on top of `hidden`, never a replacement for it).
 *     `.is-entering` is style.css's PRE-transition state (opacity:0,
 *     translated, `transition:none`) — it is added BEFORE the step is
 *     un-hidden (so the very first paint already shows that start state,
 *     never the animated-to state) and removed one `requestAnimationFrame`
 *     later, which is what actually triggers the transition — style.css's
 *     un-classed resting rule (opacity:1, no translate, a real
 *     transition-duration) becomes active again the moment the class is
 *     gone, so removing it IS the animation trigger, not a cleanup step;
 *   - sets `--sgs-choice-flow-progress` (0–1) on the flow root so
 *     style.css's progress-bar fill (`width:calc(var(...) * 100%)`) tracks
 *     the current step, per the formula `(targetIndex + 1) / stepCount`.
 *
 * User-reported gap (2026-09-15, after the first live check): the progress
 * bar had no numbered/named stage text and there was no Back control at all,
 * despite all three reference quizzes (AthleanX, Invisalign, the real lens
 * flow) having both. This function now ALSO:
 *   - writes "Step {n} of {total}" into `.sgs-choice-flow__step-count` and
 *     the target step's own `data-step-label` (an attribute `sgs/form-step`
 *     already emits for `sgs/form`'s progress bar — read here, not
 *     reinvented) into `.sgs-choice-flow__step-label`;
 *   - shows/hides `.sgs-choice-flow__nav-back` via its own `hidden` IDL
 *     property, based on whether there is anywhere to go back TO — this is
 *     read directly off `flowState`'s history stack (see
 *     `updateBackButtonVisibility()` below) rather than duplicated here,
 *     since Back-button visibility must also update after a Back click,
 *     which never calls this function with new history.
 *
 * @param {HTMLElement} flowRoot    Flow wrapper element.
 * @param {number}      targetIndex Step index to reveal.
 */
function showStepByIndex( flowRoot, targetIndex ) {
	const steps = getSteps( flowRoot );
	const targetStepEl = steps[ targetIndex ];

	// Snap the target step to its pre-transition state BEFORE un-hiding it —
	// see docblock above for why this ordering (add-then-unhide-then-remove)
	// is what makes the transition actually play instead of being coalesced
	// away by the browser.
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
		// Progress counts the questions only. A branching flow can end in
		// several result steps (one per path), so counting those would read
		// "Step 1 of 8" for a three-question flow; a result step is "complete".
		const questionSteps = steps.filter( ( stepEl ) => ! stepEl.querySelector( '.sgs-choice-flow-result' ) );
		const total = questionSteps.length || steps.length;
		const questionIndex = questionSteps.indexOf( targetStepEl );
		const position = questionIndex === -1 ? total : questionIndex + 1;
		const progress = questionIndex === -1 ? 1 : position / total;
		flowRoot.style.setProperty( '--sgs-choice-flow-progress', String( progress ) );

		const stepCountEl = flowRoot.querySelector( STEP_COUNT_SELECTOR );
		if ( stepCountEl ) {
			stepCountEl.textContent = `Step ${ position } of ${ total }`;
		}

		const stepLabelEl = flowRoot.querySelector( STEP_LABEL_SELECTOR );
		if ( stepLabelEl && targetStepEl ) {
			stepLabelEl.textContent = targetStepEl.getAttribute( 'data-step-label' ) || '';
		}

		// progressStyle variants (user-directed, 2026-09-15) — both are no-ops
		// when the flow's own progressStyle doesn't match (buildStepperMarkup/
		// updateStepperState bail on a missing .stepper container;
		// updateProgressBadge bails on flowRoot.dataset.progressStyle itself).
		buildStepperMarkup( flowRoot, questionSteps.length ? questionSteps : steps );
		updateStepperState( flowRoot, questionIndex === -1 ? total : questionIndex );
		updateProgressBadge( flowRoot, position, total, progress );
	}

	updateBackButtonVisibility( flowRoot );
}

/**
 * Show/hide the flow's Back button based on whether there is a previous
 * step to return to. Kept separate from `showStepByIndex()` because
 * `handleBackClick()` mutates `flowState`'s history stack itself and must
 * re-check visibility AFTER that mutation, not just after a step change.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
function updateBackButtonVisibility( flowRoot ) {
	const backButtonEl = flowRoot.querySelector( BACK_BUTTON_SELECTOR );
	if ( ! backButtonEl ) {
		return;
	}
	const instanceState = flowState.get( flowRoot );
	backButtonEl.hidden = ! instanceState || instanceState.history.length === 0;
}

/**
 * Persist current navigation state for this flow instance.
 *
 * @param {HTMLElement} flowRoot   Flow wrapper element.
 * @param {number}      stepIndex  Current step index.
 * @param {Set<string>} tags       Accumulated tags.
 * @param {number[]}    history    Visited step-index history.
 */
function persistFlowState( flowRoot, stepIndex, tags, history ) {
	const key = getFlowStorageKey( flowRoot );
	safeStorage.setItem(
		key,
		JSON.stringify( {
			stepIndex,
			tags: Array.from( tags ),
			history,
		} )
	);
}

/**
 * Restore a previously-persisted navigation state for this flow instance.
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 * @return {{stepIndex: number, tags: string[], history: number[]}|null}
 *         Restored state, or null if none / unparseable.
 */
function restoreFlowState( flowRoot ) {
	const key = getFlowStorageKey( flowRoot );
	const raw = safeStorage.getItem( key );
	if ( ! raw ) {
		return null;
	}
	try {
		const parsed = JSON.parse( raw );
		if (
			parsed &&
			typeof parsed === 'object' &&
			Number.isInteger( parsed.stepIndex ) &&
			Array.isArray( parsed.tags ) &&
			Array.isArray( parsed.history )
		) {
			return parsed;
		}
	} catch ( _e ) {
		// Corrupt/unparseable persisted state — treat as absent.
	}
	return null;
}

/**
 * Handle a click on a choice-flow-question option button. Reads its
 * routing data, accumulates tags, resolves the target step (advance /
 * terminal / specific index), shows it, and persists the new state.
 *
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow-question__option-button`.
 */
function handleOptionClick( buttonEl ) {
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

	if ( ! flowState.has( flowRoot ) ) {
		flowState.set( flowRoot, { tags: new Set(), history: [] } );
	}
	const instanceState = flowState.get( flowRoot );
	handleProductOptionClick( flowRoot, buttonEl, currentIndex );

	const rawTags = buttonEl.getAttribute( 'data-tags' ) || '';
	rawTags
		.split( ',' )
		.map( ( tag ) => tag.trim() )
		.filter( Boolean )
		.forEach( ( tag ) => instanceState.tags.add( tag ) );

	// FR-43-17/19: a priced add-on step's option carries data-price-group +
	// data-price (choice-flow-question/render.php) — record it for the
	// live price panel + the eventual add-to-bag payload.
	const priceGroup = buttonEl.getAttribute( 'data-price-group' ) || '';
	if ( priceGroup ) {
		const optionsEl = buttonEl.closest( '.sgs-choice-flow-question__options' );
		const groupLabel = optionsEl ? optionsEl.getAttribute( 'data-price-group-label' ) || '' : '';
		recordAddonAnswer(
			flowRoot,
			priceGroup,
			groupLabel,
			buttonEl.getAttribute( 'data-value' ) || '',
			buttonEl.getAttribute( 'data-price-label' ) || '',
			buttonEl.getAttribute( 'data-price' ) || '0'
		);
	} else if ( 'variation' !== buttonEl.getAttribute( 'data-attribute-mode' ) ) {
		// FR-43-21: an unpriced answer travels with the purchase as a field.
		recordPlainAnswer( flowRoot, currentIndex, currentStepEl, buttonEl );
	}

	// FR-43-20: "no add-ons" exit — clears any add-ons already chosen on this
	// path before the operator's own nextStepId routes onward (usually to the
	// add-to-bag terminal).
	if ( buttonEl.hasAttribute( 'data-add-to-bag-now' ) ) {
		resetAddonAnswers( flowRoot );
	}

	const nextStepId = buttonEl.getAttribute( 'data-next-step-id' ) || '';

	let targetIndex;
	if ( '' === nextStepId ) {
		// FR-43-2 default: advance to the next step in flow order. A
		// zero-branching flow (every option's nextStepId is "") therefore
		// behaves identically to a plain linear wizard (task point 5).
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
		// No valid target (e.g. terminal requested but the flow has no
		// result step, or "advance" clicked on the last step) — stay put.
		return;
	}

	instanceState.history.push( currentIndex );
	showStepByIndex( flowRoot, targetIndex );
	persistFlowState( flowRoot, targetIndex, instanceState.tags, instanceState.history );

	flowRoot.scrollIntoView( { behavior: 'smooth', block: 'start' } );
}

/**
 * Handle a click on the flow's Back button (Visual-QA gap #1, 2026-09-15).
 * Pops the last-visited step index off `instanceState.history` — a stack
 * that `handleOptionClick()` has always pushed to, but which nothing
 * previously consumed — and reveals it. Does NOT push the CURRENT step back
 * onto history: history is a plain undo stack, and re-pushing on Back would
 * make a second Back press bounce right back to where the user started.
 *
 * @param {HTMLElement} buttonEl The clicked `.sgs-choice-flow__nav-back`.
 */
function handleBackClick( buttonEl ) {
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

/**
 * Initialise a single flow instance on page load: resume a persisted step
 * if one exists for this instance, otherwise show the first step (task
 * point 7).
 *
 * @param {HTMLElement} flowRoot Flow wrapper element.
 */
function initFlow( flowRoot ) {
	const steps = getSteps( flowRoot );
	if ( steps.length === 0 ) {
		return;
	}

	// FR-43-19: seed/refresh this instance's price panel from its own
	// render.php data attributes, and bind the page-wide variation-change
	// listener once. Independent of step restoration below.
	initPricePanel( flowRoot );
	initVariation( flowRoot );
	applyDefaultSelections( flowRoot );

	// A flow ending in add to bag or email sends answers that are not persisted,
	// so it always starts from step 1 rather than resuming without them.
	const restored = flowRoot.querySelector( '[data-action="add-to-bag"], [data-action="email"]' ) ? null : restoreFlowState( flowRoot );

	if ( restored && restored.stepIndex >= 0 && restored.stepIndex < steps.length ) {
		flowState.set( flowRoot, {
			tags: new Set( restored.tags ),
			history: restored.history,
		} );
		showStepByIndex( flowRoot, restored.stepIndex );
		return;
	}

	flowState.set( flowRoot, { tags: new Set(), history: [] } );
	showStepByIndex( flowRoot, 0 );
}

/**
 * Bootstrap every `sgs/choice-flow` instance present on the page.
 */
function initAllFlows() {
	document.querySelectorAll( FLOW_SELECTOR ).forEach( ( flowRoot ) => {
		initFlow( flowRoot );
		initChrome( flowRoot );
		initEmailResults( flowRoot, () => Array.from( flowState.get( flowRoot )?.tags || [] ) );
	} );
}

// Single delegated click listener — resolves the actual option button via
// closest() rather than requiring a data-wp-on--click directive on every
// button (see file-level docblock, click-wiring decision). FR-43-16's
// help-toggle handling is added here as its OWN independent branch (checked
// via a second, unrelated closest()) rather than folded into
// handleOptionClick() — the two selectors can never both match the same
// clicked element, so the branches cannot conflict, and the option-click
// routing logic above is untouched.
document.addEventListener( 'click', ( event ) => {
	const buttonEl = event.target.closest( OPTION_BUTTON_SELECTOR );
	if ( buttonEl ) {
		handleOptionClick( buttonEl );
		return;
	}

	const backButtonEl = event.target.closest( BACK_BUTTON_SELECTOR );
	if ( backButtonEl ) {
		handleBackClick( backButtonEl );
		return;
	}

	// FR-43-20: the 'add-to-bag' terminal's own button — handled entirely in
	// pricing.js (it owns the add-on state this needs).
	const addToBagButtonEl = event.target.closest( ADD_TO_BAG_BUTTON_SELECTOR );
	if ( addToBagButtonEl ) {
		handleAddToBagClick( addToBagButtonEl );
		return;
	}

	// FR-43-16's '?' help-toggle now lives in the shared
	// src/shared/info-toggle.js module (see the top-of-file import) — this
	// block is one of potentially several adopters, all using the same
	// selector + handler.
	const infoToggleEl = event.target.closest( INFO_TOGGLE_SELECTOR );
	if ( infoToggleEl ) {
		handleInfoToggleClick( infoToggleEl );
	}
} );

// Run initialisation when DOM is ready — mirrors sgs/form/view.js's own
// bootstrap gate (its initForms()/initConditionalLogic() pair).
if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initAllFlows );
} else {
	initAllFlows();
}

// Namespace registration (codebase convention — matches sgs/form/view.js's
// own store('sgs/form', ...) call). Navigation needs no reactive state (see
// the file-level docblock on the click-wiring decision and the WeakMap-based
// private state above); the one action is the file upload below.
store( 'sgs/choice-flow', {
	actions: {
		// FR-43-21: a file field in a purchase step (its own
		// data-wp-on--change="actions.uploadFile" resolves to this store).
		*uploadFile( event ) {
			yield uploadFlowFile( event );
		},
	},
} );
