/**
 * SGS Nav Menu (sgs/nav-menu) — the per-row `after` nodes for the Colour panel
 * (Spec 41 §9.6): each stateful row's hover-treatment selector, its sweep-direction
 * sub-control, and the two verbatim ⓘ cross-reference notes.
 *
 * ⛔ NOTHING HERE IS A ROW OR A `states` ARRAY, and that is what keeps owner ruling 3
 * intact. `colourRows`, every `states` array and every `fillRow()`/`textRow()` call
 * stay in `edit.js`, where
 * `scripts/inspector-scan/rules/31-golden-colour-control.js` can resolve them. These
 * are the presentational nodes each row hands to `SgsColourPanel`'s `after` slot,
 * which that detector never reads. They live here rather than inline for one reason:
 * the project's 250-line-per-file budget (Spec 41 step 14 / PD-6).
 *
 * ⛔ BLOCK-PRIVATE, DELIBERATELY — not a new `src/components/` export. FR-41-24
 * searched the whole plugin tree and found no second adopter of this pairing, so a
 * shared `<HoverTreatmentControl>` would be an abstraction drawn from a sample size
 * of one. Promote it the day a SECOND block wants it.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl } from '@wordpress/components';
import { sweepEligible, TreatmentSelect, CrossRefNote } from './ColourTreatment';
// Read-only static import of this block's own manifest — the ONE declared source for
// the Sweep-eligibility predicate (FR-41-26), the same thing `index.js` already does.
import metadata from './block.json';

const SWEEP_ELIGIBILITY = metadata?.supports?.sgs?.sweepEligibility;

/** Shared option fragments — translated once, reused by every selector below. */
const TREATMENT_NONE = { value: 'none', label: __( 'None', 'sgs-blocks' ) };
const TREATMENT_SWAP = { value: 'swap', label: __( 'Swap', 'sgs-blocks' ) };
const TREATMENT_SWEEP = { value: 'sweep', label: __( 'Sweep', 'sgs-blocks' ) };
const TREATMENT_HIGHLIGHT = {
	value: 'highlight',
	label: __( 'Highlight', 'sgs-blocks' ),
};

/**
 * The two/three options a Sweep-eligible row offers, with `Sweep` OMITTED (never
 * disabled) when the declared predicate says the element cannot carry it.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} treatment  The treatment attribute keying this row's entry.
 * @return {Array} Option objects for `TreatmentSelect`.
 */
function sweepableOptions( attributes, treatment ) {
	const eligibility = SWEEP_ELIGIBILITY;
	return [
		TREATMENT_NONE,
		TREATMENT_SWAP,
		...( sweepEligible( eligibility, treatment, attributes ) ? [ TREATMENT_SWEEP ] : [] ),
	];
}

const SMART_CONTRAST_NOTE = __(
	'Automatic readable-text checking for these colours is switched on under General → Accessibility.',
	'sgs-blocks'
);

/**
 * Each row's own `after` node (Spec 41 §9.6). These live here rather than inline in
 * `edit.js` for ONE reason: the 250-line-per-file budget. ⛔ Nothing here is a row or
 * a `states` array — `colourRows`, every `states` array and every `fillRow`/`textRow`
 * call stay in `edit.js` where rule 31 can resolve them (owner ruling 3). These are
 * the presentational nodes each row hands to `SgsColourPanel`'s `after` slot, which
 * the detector never reads.
 *
 * @param {Object}   root0                Props.
 * @param {string}   root0.value         The stored treatment value.
 * @param {Function} root0.onChange      Receives the next treatment value.
 * @param {Object}   [root0.attributes]  Block attributes — read ONLY by the declared
 *                                       Sweep-eligibility predicate, never written.
 * @return {Object} The node.
 */
export function ItemTextTreatment( { value, onChange, attributes } ) {
	return (
		<>
			<TreatmentSelect
				label={ __( 'Text on hover', 'sgs-blocks' ) }
				value={ value }
				onChange={ onChange }
				options={ sweepableOptions( attributes, 'itemColourHoverTreatment' ) }
				help={ __(
					'Sweep travels the Hover colour across the word instead of switching to it instantly.',
					'sgs-blocks'
				) }
			/>
			<CrossRefNote>{ SMART_CONTRAST_NOTE }</CrossRefNote>
		</>
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
export function ItemBgTreatment( { value, onChange } ) {
	return (
		<>
			<TreatmentSelect
				label={ __( 'Background on hover', 'sgs-blocks' ) }
				value={ value }
				onChange={ onChange }
				options={ [ TREATMENT_NONE, TREATMENT_SWAP, TREATMENT_HIGHLIGHT ] }
				help={ __(
					'Highlight paints one shape that slides between items, using the Hover colour you picked above. It replaces each item’s own current-page background, so that swatch is hidden while it’s selected.',
					'sgs-blocks'
				) }
			/>
			<CrossRefNote>{ SMART_CONTRAST_NOTE }</CrossRefNote>
		</>
	);
}

/**
 * ⛔ The ⓘ note here is the TWIN of the one in the Typography panel (§9.10), and
 * neither ships without the other — a one-way pointer leaves the pointed-at control
 * reading as the authoritative one.
 *
 * @param {Object}   root0                Props.
 * @param {string}   root0.value         The stored treatment value.
 * @param {Function} root0.onChange      Receives the next treatment value.
 * @param {Object}   [root0.attributes]  Block attributes — read ONLY by the declared
 *                                       Sweep-eligibility predicate, never written.
 * @return {Object} The node.
 */
export function ItemBorderTreatment( { value, onChange, direction, onDirectionChange } ) {
	return (
		<>
			<TreatmentSelect
				label={ __( 'Border on hover', 'sgs-blocks' ) }
				value={ value }
				onChange={ onChange }
				options={ [ TREATMENT_NONE, TREATMENT_SWAP, TREATMENT_SWEEP ] }
			/>
			{ 'sweep' === value && (
				<SelectControl
					label={ __( 'Sweep direction', 'sgs-blocks' ) }
					value={ direction || 'left-to-right' }
					options={ [
						{ label: __( 'Left to right', 'sgs-blocks' ), value: 'left-to-right' },
						{ label: __( 'Right to left', 'sgs-blocks' ), value: 'right-to-left' },
					] }
					onChange={ onDirectionChange }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			<CrossRefNote>
				{ __(
					'This changes the line around the item. To underline the menu word itself instead, use Decoration (hover) under Typography — they’re separate settings and don’t do the same thing.',
					'sgs-blocks'
				) }
			</CrossRefNote>
		</>
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
