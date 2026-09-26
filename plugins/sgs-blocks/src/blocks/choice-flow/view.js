/**
 * SGS Choice Flow — Interactivity API Store
 *
 * Spec 43 FR-43-9: `sgs/choice-flow` gets its OWN, small step-navigation
 * engine. It does NOT extend or import `sgs/form/view.js`'s 878-line engine
 * (that engine is fused to `sgs/form`'s progress bar / validation / submit
 * flow and is not exported for reuse) — this file only borrows that file's
 * STRUCTURAL CONVENTIONS (module-level `store()` call, DOMContentLoaded-
 * gated bootstrap, sessionStorage try/catch persistence pattern — the
 * persistence itself lives in `navigation.js` now).
 *
 * This file is deliberately thin: it owns only the module bootstrap (a
 * single delegated `click` listener, the DOMContentLoaded gate, and the
 * `store()` registration for the one Interactivity API action this block
 * needs). Every navigation/routing/session concern lives in `navigation.js`
 * (D1/D2/D3's Continue model, Back, the progress bar/stepper/badge,
 * sessionStorage persistence); the price panel lives in `pricing.js`; the
 * cart/checkout requests live in `add-to-bag.js`.
 *
 * Step markup this file depends on (read from the sibling blocks' own
 * render.php, not guessed):
 *   - `sgs/form-step`            → `.sgs-form-step` wrapper.
 *   - `sgs/choice-flow-question` → `.sgs-choice-flow-question__option-button`
 *     buttons, each carrying `data-value` / `data-next-step-id` /
 *     `data-tags` (plain data-* attributes, no `data-wp-on--click` — see
 *     that block's render.php docblock, which explicitly defers directive
 *     wiring to this file).
 *   - `sgs/choice-flow-result`   → `.sgs-choice-flow-result` wrapper
 *     carrying `data-match-tags` (comma-joined) and, for `add-to-bag`, the
 *     footer-button data-* `navigation.js`'s `updateFooterActions()` reads.
 *
 * CLICK-WIRING DECISION (task-mandated either/or — option (a) chosen):
 * a single delegated `click` listener on `document`, resolving the target
 * button via `closest()`, rather than adding `data-wp-on--click` directives
 * to the sibling blocks' own render.php files.
 *
 * @package SGS\Blocks
 */

import { store } from '@wordpress/interactivity';
import { INFO_TOGGLE_SELECTOR, handleInfoToggleClick } from '../../shared/info-toggle.js';
import { handleAddToBasketClick, handleBuyNowClick } from './add-to-bag.js';
import { uploadFlowFile } from './flow-fields.js';
import { initChrome } from './chrome.js';
import { initEmailResults } from './email.js';
import {
	FLOW_SELECTOR,
	OPTION_BUTTON_SELECTOR,
	BACK_BUTTON_SELECTOR,
	CONTINUE_BUTTON_SELECTOR,
	ADD_TO_BASKET_BUTTON_SELECTOR,
	BUY_NOW_BUTTON_SELECTOR,
	initFlow,
	getFlowTags,
	handleOptionClick,
	handleBackClick,
	handleContinueClick,
} from './navigation.js';

/**
 * Bootstrap every `sgs/choice-flow` instance present on the page.
 */
function initAllFlows() {
	document.querySelectorAll( FLOW_SELECTOR ).forEach( ( flowRoot ) => {
		initFlow( flowRoot );
		initChrome( flowRoot );
		initEmailResults( flowRoot, () => getFlowTags( flowRoot ) );
	} );
}

// Single delegated click listener — resolves the actual clicked control via
// closest() rather than requiring a data-wp-on--click directive on every
// button (see file-level docblock, click-wiring decision).
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

	// D1/D2 — the footer's Continue button (advanceMode: 'continue').
	const continueButtonEl = event.target.closest( CONTINUE_BUTTON_SELECTOR );
	if ( continueButtonEl ) {
		handleContinueClick( continueButtonEl );
		return;
	}

	// D3 — the footer's terminal actions on an 'add-to-bag' result step.
	// Both live in add-to-bag.js (it alone knows the path's add-ons/variation).
	const addToBasketButtonEl = event.target.closest( ADD_TO_BASKET_BUTTON_SELECTOR );
	if ( addToBasketButtonEl ) {
		handleAddToBasketClick( addToBasketButtonEl );
		return;
	}

	const buyNowButtonEl = event.target.closest( BUY_NOW_BUTTON_SELECTOR );
	if ( buyNowButtonEl ) {
		handleBuyNowClick( buyNowButtonEl );
		return;
	}

	// FR-43-16's '?' help-toggle lives in the shared src/shared/info-toggle.js
	// module (see the top-of-file import) — this block is one of potentially
	// several adopters, all using the same selector + handler.
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
// the file-level docblock on the click-wiring decision); the one action is
// the file upload below.
store( 'sgs/choice-flow', {
	actions: {
		// FR-43-21: a file field in a purchase step (its own
		// data-wp-on--change="actions.uploadFile" resolves to this store).
		*uploadFile( event ) {
			yield uploadFlowFile( event );
		},
	},
} );
