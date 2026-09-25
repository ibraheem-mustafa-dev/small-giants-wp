/**
 * Default-selection polish — Spec 43 §5 (Option polish), `isDefault`.
 *
 * `choice-flow-question/render.php` marks at most one option per step
 * `data-default="1"` (first `isDefault`-flagged option wins — see that
 * file's own comment). This module gives that flag a VISUAL treatment: the
 * option reads as "already picked" (border + shadow, matching the class
 * `.sgs-choice-flow-question__option-button--selected` in this block's own
 * style.css) without recording an answer or advancing the flow — the
 * shopper still has to click to move on, exactly like any other option.
 *
 * No selected-state class or aria pattern existed anywhere else in this
 * codebase to reuse (`sgs/choice-flow`'s option buttons carry no toggle-
 * button semantics today), so this introduces the ONE new class above,
 * scoped to this block's own BEM root — not a new cross-block convention.
 *
 * @package SGS\Blocks
 */

const SELECTED_CLASS = 'sgs-choice-flow-question__option-button--selected';
const DEFAULT_OPTION_SELECTOR = '[data-default="1"]';

/**
 * Mark every step's default-flagged option button as visually selected.
 * Runs once per flow instance at init — every step's markup is already in
 * the DOM (steps are hidden via the native `hidden` attribute, not removed),
 * so this covers steps the shopper hasn't reached yet too.
 *
 * @param {HTMLElement} flowEl The flow's root wrapper element.
 */
export function applyDefaultSelections( flowEl ) {
	if ( ! flowEl ) {
		return;
	}

	flowEl.querySelectorAll( DEFAULT_OPTION_SELECTOR ).forEach( ( buttonEl ) => {
		buttonEl.classList.add( SELECTED_CLASS );
	} );
}

/**
 * Whether a given option button is the step's default-preselected option.
 *
 * @param {HTMLElement} buttonEl An `.sgs-choice-flow-question__option-button`.
 * @return {boolean} True when render.php flagged this button `data-default="1"`.
 */
export function isDefaultPreselected( buttonEl ) {
	return !! buttonEl && '1' === buttonEl.getAttribute( 'data-default' );
}
