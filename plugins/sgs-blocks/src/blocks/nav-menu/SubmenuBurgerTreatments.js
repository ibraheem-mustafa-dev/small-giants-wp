/**
 * SGS Nav Menu (sgs/nav-menu) — the per-row `after` nodes for the Submenu and
 * Menu-button families in the Colour panel (Spec 41 §9.6).
 *
 * Split out of `ColourRowExtras.js` (file-size maintenance pass, 2026-09-14)
 * — that file had grown to 320 lines against the project's 250-line JS
 * budget. Same rationale as the sibling file's own docblock: nothing here is
 * a row or a `states` array (owner ruling 3 only protects those, and they
 * stay in `edit.js`) — these are presentational `after` nodes handed to
 * `SgsColourPanel`, which `scripts/inspector-scan/rules/31-golden-colour-
 * control.js` never reads.
 *
 * ⛔ BLOCK-PRIVATE, DELIBERATELY — not a new `src/components/` export, same
 * reasoning as `ColourRowExtras.js`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { TreatmentSelect } from './ColourTreatment';
import { sweepableOptions, TREATMENT_NONE, TREATMENT_SWAP } from './ColourRowExtras';

/**
 * @param {Object}   root0                Props.
 * @param {string}   root0.value         The stored treatment value.
 * @param {Function} root0.onChange      Receives the next treatment value.
 * @param {Object}   [root0.attributes]  Block attributes — read ONLY by the declared
 *                                       Sweep-eligibility predicate, never written.
 * @return {Object} The node.
 */
export function SubmenuTextTreatment( { value, onChange, attributes } ) {
	return (
		<TreatmentSelect
			label={ __( 'Link text on hover', 'sgs-blocks' ) }
			value={ value }
			onChange={ onChange }
			options={ sweepableOptions( attributes, 'submenuColourHoverTreatment' ) }
		/>
	);
}

/**
 * ⛔ Two options only, and that is a real boundary (FR-41-23): the sliding pill is an
 * ITEM-row mechanism needing siblings to slide between, and a per-link sweep-band on a
 * strictly vertical list has no referent. The third segment is dropped outright rather
 * than rendered disabled.
 *
 * @param {Object}   root0                Props.
 * @param {string}   root0.value         The stored treatment value.
 * @param {Function} root0.onChange      Receives the next treatment value.
 * @param {Object}   [root0.attributes]  Block attributes — read ONLY by the declared
 *                                       Sweep-eligibility predicate, never written.
 * @return {Object} The node.
 */
export function SubmenuLinkBgTreatment( { value, onChange } ) {
	return (
		<TreatmentSelect
			label={ __( 'Link background on hover', 'sgs-blocks' ) }
			value={ value }
			onChange={ onChange }
			options={ [ TREATMENT_NONE, TREATMENT_SWAP ] }
		/>
	);
}

/**
 * ⚠ Writes `burgerColourHoverTreatment` — the ICON/TEXT colour's treatment. Its
 * eligibility reads `burgerBg` / `burgerBgGradient` / `burgerHoverColour` (the
 * button's BACKGROUND in both states), never `burgerColourHover`. §8.1 exists to keep
 * those two anagram-close names apart.
 *
 * @param {Object}   root0                Props.
 * @param {string}   root0.value         The stored treatment value.
 * @param {Function} root0.onChange      Receives the next treatment value.
 * @param {Object}   [root0.attributes]  Block attributes — read ONLY by the declared
 *                                       Sweep-eligibility predicate, never written.
 * @return {Object} The node.
 */
export function BurgerIconTreatment( { value, onChange, attributes } ) {
	return (
		<TreatmentSelect
			label={ __( 'Icon on hover', 'sgs-blocks' ) }
			value={ value }
			onChange={ onChange }
			options={ sweepableOptions( attributes, 'burgerColourHoverTreatment' ) }
		/>
	);
}

/**
 * @param {Object}   root0                Props.
 * @param {string}   root0.value         The stored treatment value.
 * @param {Function} root0.onChange      Receives the next treatment value.
 * @param {Object}   [root0.attributes]  Block attributes — read ONLY by the declared
 *                                       Sweep-eligibility predicate, never written.
 * @return {Object} The node.
 */
export function BurgerBgTreatment( { value, onChange } ) {
	return (
		<TreatmentSelect
			label={ __( 'Button background on hover', 'sgs-blocks' ) }
			value={ value }
			onChange={ onChange }
			options={ [ TREATMENT_NONE, TREATMENT_SWAP ] }
		/>
	);
}
