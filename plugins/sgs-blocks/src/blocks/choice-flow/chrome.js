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
 * scroll-restore/aria-expanded cleanup a normal modal close does.
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
 * FIXES item 2: `showcase`'s eyebrow reads "<Product name> — <Step name>"
 * (the header's own `data-product-name` — render.php resolves it — plus
 * `.sgs-choice-flow__step-label`, which `flow-steps.js`'s showStepByIndex()
 * fills from the step's `data-step-label` or, failing that, the active
 * question's own title) instead of mirroring "Step N of M".
 *
 * @param {HTMLElement} flowEl The flow's wrapper element.
 * @return {string} The composed eyebrow text.
 */
function composeShowcaseEyebrow( flowEl ) {
	const headerEl = flowEl.querySelector( HEADER_SELECTOR );
	const productName = headerEl ? headerEl.getAttribute( 'data-product-name' ) || '' : '';
	const stepLabelEl = flowEl.querySelector( SOURCE_STEP_LABEL_SELECTOR );
	const stepLabel = stepLabelEl ? stepLabelEl.textContent.trim() : '';

	if ( productName && stepLabel ) {
		return `${ productName } — ${ stepLabel }`;
	}
	return productName || stepLabel;
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
