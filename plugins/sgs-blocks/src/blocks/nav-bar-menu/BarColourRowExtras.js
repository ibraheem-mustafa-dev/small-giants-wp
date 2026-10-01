/**
 * SGS Nav Bar Menu (sgs/nav-bar-menu) — the per-row `after` nodes for the
 * Colour panel (Spec 41 §9.6) that are BAR-only: `BurgerIconTreatment` /
 * `BurgerBgTreatment` (the whole burger family is bar-only — only this block
 * ever renders a burger).
 *
 * The treatments shared with the drawer list (`ItemTextTreatment`,
 * `ItemBgTreatment`, `ItemBorderTreatment`, `SubmenuTextTreatment`,
 * `SubmenuLinkBgTreatment`) live in `src/shared/nav-menu-panels/ColourRowExtras.js`;
 * this file imports `sweepableOptions` / `TREATMENT_NONE` / `TREATMENT_SWAP`
 * from there rather than duplicating them.
 *
 * ⛔ NOTHING HERE IS A ROW OR A `states` ARRAY — `colourRows` stays in this
 * block's own `edit.js`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { TreatmentSelect } from '../../shared/nav-menu-panels/ColourTreatment';
import {
	sweepableOptions,
	TREATMENT_NONE,
	TREATMENT_SWAP,
} from '../../shared/nav-menu-panels/ColourRowExtras';

/**
 * ⚠ Writes `burgerColourHoverTreatment` — the ICON/TEXT colour's treatment. Its
 * eligibility reads `burgerBg` / `burgerBgGradient` / `burgerHoverColour` (the
 * button's BACKGROUND in both states), never `burgerColourHover`. §8.1 exists to keep
 * those two anagram-close names apart.
 *
 * @param {Object}   root0                    Props.
 * @param {string}   root0.value              The stored treatment value.
 * @param {Function} root0.onChange           Receives the next treatment value.
 * @param {Object}   [root0.attributes]       Block attributes — read ONLY by the declared
 *                                            Sweep-eligibility predicate, never written.
 * @param {Object}   [root0.sweepEligibility] This block's own declared eligibility map.
 * @return {Object} The node.
 */
export function BurgerIconTreatment( { value, onChange, attributes, sweepEligibility } ) {
	return (
		<TreatmentSelect
			label={ __( 'Icon on hover', 'sgs-blocks' ) }
			value={ value }
			onChange={ onChange }
			options={ sweepableOptions( attributes, 'burgerColourHoverTreatment', sweepEligibility ) }
		/>
	);
}

/**
 * @param {Object}   root0          Props.
 * @param {string}   root0.value    The stored treatment value.
 * @param {Function} root0.onChange Receives the next treatment value.
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
