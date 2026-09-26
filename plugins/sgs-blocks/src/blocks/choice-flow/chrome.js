/**
 * sgs/choice-flow — root chrome frontend interactivity (Spec 43 Phase 3/4
 * §5): the optional header's "Step N of M" eyebrow and Close button.
 *
 * Deliberately does NOT touch view.js's own step-tracking state. The flow's
 * one source of truth for step position is the existing
 * `.sgs-choice-flow__step-count` element view.js's showStepByIndex() already
 * writes "Step {n} of {total}" into on every step change (choice-flow/view.js).
 * This module mirrors that text into the header's own eyebrow element via a
 * MutationObserver, so view.js needs no change beyond one init call.
 *
 * Close reuses the enclosing sgs/modal's OWN close mechanism (its
 * `.sgs-modal__close` button, wired by modal/view.js) rather than
 * reimplementing dialog.close() — clicking it runs the exact same
 * scroll-restore/aria-expanded cleanup a normal modal close does — and hides
 * the modal's round button so the dialog shows one Close.
 *
 * @package SGS\Blocks
 */

const EYEBROW_SELECTOR         = '.sgs-choice-flow__chrome-eyebrow';
const HEADER_SELECTOR          = '.sgs-choice-flow__chrome-header';
const SOURCE_STEP_COUNT_SELECTOR = '.sgs-choice-flow__step-count';
const SOURCE_STEP_LABEL_SELECTOR = '.sgs-choice-flow__step-label';
const CLOSE_SELECTOR           = '.sgs-choice-flow__chrome-close';
const MODAL_DIALOG_SELECTOR    = 'dialog.sgs-modal__dialog';
const MODAL_CLOSE_SELECTOR     = '.sgs-modal__close';
const SHOWCASE_CLASS           = 'sgs-choice-flow--layout-showcase';

/**
 * `showcase`'s eyebrow: the step name on the first question, then
 * "<Brand> <Product> — <Step name>" once the shopper has moved on (the Eye
 * Care draft's `lensStepLabel`). The product name is the header's own
 * `data-product-name`, the brand is the stage's brand line, and the step
 * name is `.sgs-choice-flow__step-label` (`flow-progress.js` fills it, and
 * sets the root's `data-question-index`).
 *
 * @param {HTMLElement} flowEl The flow's wrapper element.
 * @return {string} The composed eyebrow text.
 */
function composeShowcaseEyebrow( flowEl ) {
	const headerEl = flowEl.querySelector( HEADER_SELECTOR );
	const brandEl = flowEl.querySelector( '.sgs-choice-flow__summary-brand' );
	const product = [ brandEl ? brandEl.textContent.trim() : '', headerEl ? headerEl.getAttribute( 'data-product-name' ) || '' : '' ]
		.filter( Boolean )
		.join( ' ' );
	const stepLabelEl = flowEl.querySelector( SOURCE_STEP_LABEL_SELECTOR );
	const stepLabel = stepLabelEl ? stepLabelEl.textContent.trim() : '';
	const onFirstQuestion = '0' === flowEl.dataset.questionIndex;

	if ( product && stepLabel && ! onFirstQuestion ) {
		return `${ product } — ${ stepLabel }`;
	}
	return stepLabel || product;
}

/**
 * Keep the header's eyebrow text in sync with the current step: "Step N of
 * M" in `compact` (mirroring view.js's own step-count element, unchanged),
 * or "<Product name> — <Step name>" in `showcase` (FIXES item 2). A no-op
 * when either element is absent (showHeader:false renders no eyebrow at
 * all).
 *
 * @param {HTMLElement} flowEl The flow's wrapper element (`.sgs-choice-flow`).
 */
function mirrorStepEyebrow( flowEl ) {
	const eyebrowEl = flowEl.querySelector( EYEBROW_SELECTOR );
	const sourceEl = flowEl.querySelector( SOURCE_STEP_COUNT_SELECTOR );
	if ( ! eyebrowEl || ! sourceEl ) {
		return;
	}

	const showcase = flowEl.classList.contains( SHOWCASE_CLASS );

	const sync = () => {
		eyebrowEl.textContent = showcase ? composeShowcaseEyebrow( flowEl ) : sourceEl.textContent;
	};

	// Pick up whatever showStepByIndex() has already written by the time
	// this runs (the main thread wires initChrome() after view.js's own
	// initFlow(), so the current step is already reflected on first sync).
	sync();

	const observer = new MutationObserver( sync );
	observer.observe( sourceEl, { childList: true, characterData: true, subtree: true } );

	if ( showcase ) {
		const stepLabelEl = flowEl.querySelector( SOURCE_STEP_LABEL_SELECTOR );
		if ( stepLabelEl ) {
			observer.observe( stepLabelEl, { childList: true, characterData: true, subtree: true } );
		}
	}
}

/**
 * Wire the header's Close button to the enclosing sgs/modal's own close
 * button. Hides Close entirely when this flow instance isn't inside a
 * modal — render.php has no reliable way to know that at render time (see
 * choice-flow-chrome.php::sgs_choice_flow_chrome_header_html()'s own
 * docblock), so the button always ships in the markup and this is where the
 * "only inside a modal" rule is actually enforced.
 *
 * @param {HTMLElement} flowEl The flow's wrapper element.
 */
function wireClose( flowEl ) {
	const closeButton = flowEl.querySelector( CLOSE_SELECTOR );
	if ( ! closeButton ) {
		return;
	}

	const dialog = flowEl.closest( MODAL_DIALOG_SELECTOR );
	if ( ! dialog ) {
		closeButton.hidden = true;
		return;
	}

	const modalCloseButton = dialog.querySelector( MODAL_CLOSE_SELECTOR );
	if ( ! modalCloseButton ) {
		// Belt and braces — every sgs/modal dialog renders its own close
		// button unconditionally, so this should be unreachable.
		closeButton.hidden = true;
		return;
	}

	closeButton.addEventListener( 'click', () => {
		modalCloseButton.click();
	} );

	// On open the browser focuses the dialog's first control, this Close,
	// which then wears a focus ring before the shopper has done anything.
	// Focus the flow itself instead (its aria-label names the dialog); Tab
	// still reaches Close first.
	flowEl.setAttribute( 'tabindex', '-1' );
	new MutationObserver( () => {
		if ( dialog.open ) {
			flowEl.focus( { preventScroll: true } );
		}
	} ).observe( dialog, { attributes: true, attributeFilter: [ 'open' ] } );

	// The header's Close replaces the modal's own round one, so the dialog
	// shows a single Close. The modal's button stays in the DOM because the
	// header's click is forwarded to it.
	modalCloseButton.hidden = true;
}

/**
 * Initialise one flow instance's optional chrome. Safe to call
 * unconditionally — every selector lookup above simply finds nothing when
 * render.php emitted no header markup (showHeader:false).
 *
 * @param {HTMLElement} flowEl The flow's wrapper element (`.sgs-choice-flow`).
 */
export function initChrome( flowEl ) {
	if ( ! flowEl ) {
		return;
	}
	mirrorStepEyebrow( flowEl );
	wireClose( flowEl );
}
