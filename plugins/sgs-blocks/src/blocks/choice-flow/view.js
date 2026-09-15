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

const TERMINAL_SENTINEL = '__terminal__';

const FLOW_SELECTOR = '[data-wp-interactive="sgs/choice-flow"]';
const STEP_SELECTOR = '.sgs-form-step';
const OPTION_BUTTON_SELECTOR = '.sgs-choice-flow-question__option-button';
const RESULT_SELECTOR = '.sgs-choice-flow-result';

// FR-43-16 (v1.3.0, Phase 2b) — per-option help-text toggle. A SIBLING
// control of OPTION_BUTTON_SELECTOR (see choice-flow-question/render.php's
// own comment: the '?' button is deliberately outside the option <button>,
// not nested inside it, so it has its own independent click target), so it
// gets its own selector here rather than being folded into
// handleOptionClick() above.
const HELP_TOGGLE_SELECTOR = '.sgs-choice-flow-question__help-toggle';

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
 * Prefers an explicit `data-flow-id`/`id` on the wrapper if a later
 * render.php ever adds one (forward-compatible); falls back to this
 * instance's 0-based position amongst all `sgs/choice-flow` roots on the
 * page, which is stable for the lifetime of a single page view — the only
 * lifetime sessionStorage needs.
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
		const progress = ( targetIndex + 1 ) / steps.length;
		flowRoot.style.setProperty( '--sgs-choice-flow-progress', String( progress ) );
	}
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

	const rawTags = buttonEl.getAttribute( 'data-tags' ) || '';
	rawTags
		.split( ',' )
		.map( ( tag ) => tag.trim() )
		.filter( Boolean )
		.forEach( ( tag ) => instanceState.tags.add( tag ) );

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
 * Handle a click on a per-option help-text toggle (FR-43-16). Reveals/hides
 * the adjacent `.sgs-choice-flow-question__help-panel` (a sibling element —
 * see render.php's own comment on why the panel is not nested inside the
 * toggle button) and keeps `aria-expanded` in sync for assistive tech.
 *
 * Independent of `handleOptionClick()` above: it never touches the option
 * button's own routing/tags/step-navigation state, and neither function's
 * selector can ever match the other's element.
 *
 * @param {HTMLElement} toggleEl The clicked `.sgs-choice-flow-question__help-toggle`.
 */
function handleHelpToggleClick( toggleEl ) {
	const panelId = toggleEl.getAttribute( 'aria-controls' );
	const panelEl = panelId ? document.getElementById( panelId ) : null;
	if ( ! panelEl ) {
		return;
	}

	const isCurrentlyHidden = panelEl.hidden;
	panelEl.hidden = ! isCurrentlyHidden;
	toggleEl.setAttribute( 'aria-expanded', isCurrentlyHidden ? 'true' : 'false' );
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

	const restored = restoreFlowState( flowRoot );

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
	document.querySelectorAll( FLOW_SELECTOR ).forEach( initFlow );
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

	const helpToggleEl = event.target.closest( HELP_TOGGLE_SELECTOR );
	if ( helpToggleEl ) {
		handleHelpToggleClick( helpToggleEl );
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
// own store('sgs/form', ...) call). No reactive state/actions are needed by
// this engine in v1 (see file-level docblock on the click-wiring decision
// and the WeakMap-based private state above), so this registers the
// namespace only, keeping the door open for a future directive-driven
// addition (e.g. a "back" button) without a breaking change to this file's
// shape.
store( 'sgs/choice-flow', {} );
