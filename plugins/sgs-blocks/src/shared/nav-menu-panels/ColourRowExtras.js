/**
 * SGS Nav Bar/Drawer Menu (shared, sgs/nav-bar-menu + sgs/nav-drawer-menu) —
 * the per-row `after` nodes for the Colour panel (Spec 41 §9.6) that are
 * BOTH-classified: `ItemTextTreatment`, `ItemBgTreatment`, `ItemBorderTreatment`,
 * `SubmenuTextTreatment`, `SubmenuLinkBgTreatment`.
 *
 * Consolidated from nav-menu/ColourRowExtras.js + nav-menu/SubmenuBurgerTreatments.js
 * (D1059 split, 2026-09-14 reconciliation) — the BAR-only pair
 * (`ItemSeparatorTreatment`, `BurgerIconTreatment`/`BurgerBgTreatment`) is
 * NOT here; it lives in `src/blocks/nav-bar-menu/BarColourRowExtras.js`,
 * which imports `sweepableOptions` / `TREATMENT_NONE` / `TREATMENT_SWAP` /
 * `SweepAngleControl` from this file rather than duplicating them.
 *
 * ⚠ `sweepableOptions()` used to read `supports.sgs.sweepEligibility` via a
 * static `import metadata from './block.json'` INSIDE this file. That only
 * ever worked while there was one block; moved here it would statically bind
 * to whichever block happens to sit beside it. FR-41-26's "ONE DECLARED
 * SOURCE" is each block's OWN manifest, so `sweepEligibility` is now an
 * explicit parameter — every caller (both blocks' `edit.js`, and the bar's
 * own `BarColourRowExtras.js`) reads its OWN `./block.json` and passes the
 * table down, rather than this shared file importing either block's file.
 *
 * ⛔ NOTHING HERE IS A ROW OR A `states` ARRAY (owner ruling 3) — `colourRows`,
 * every `states` array and every `fillRow()`/`textRow()` call stay in each
 * block's OWN `edit.js`, where
 * `scripts/inspector-scan/rules/31-golden-colour-control.js` can resolve them.
 * These are the presentational nodes each row hands to `SgsColourPanel`'s
 * `after` slot, which that detector never reads.
 *
 * ⛔ BLOCK-PRIVATE-STYLE SHARING, DELIBERATELY — not a new `src/components/`
 * export. FR-41-24 found no THIRD adopter of this pairing outside the two nav
 * blocks, so this stays a `src/shared/nav-menu-panels/` module (shared
 * between exactly those two), not a generic component.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, AnglePickerControl } from '@wordpress/components';
import { sweepEligible, TreatmentSelect, CrossRefNote } from './ColourTreatment';

/** Shared option fragments — translated once, reused by every selector below. */
export const TREATMENT_NONE = { value: 'none', label: __( 'None', 'sgs-blocks' ) };
export const TREATMENT_SWAP = { value: 'swap', label: __( 'Swap', 'sgs-blocks' ) };
const TREATMENT_SWEEP = { value: 'sweep', label: __( 'Sweep', 'sgs-blocks' ) };
const TREATMENT_HIGHLIGHT = {
	value: 'highlight',
	label: __( 'Highlight', 'sgs-blocks' ),
};

/**
 * The two/three options a Sweep-eligible row offers, with `Sweep` OMITTED
 * (never disabled) when the declared predicate says the element cannot carry it.
 *
 * @param {Object} attributes      Block attributes.
 * @param {string} treatment       The treatment attribute keying this row's entry.
 * @param {Object} sweepEligibility The CALLER's OWN `supports.sgs.sweepEligibility`
 *                                  map (each block declares its own — see file docblock).
 * @return {Array} Option objects for `TreatmentSelect`.
 */
export function sweepableOptions( attributes, treatment, sweepEligibility ) {
	return [
		TREATMENT_NONE,
		TREATMENT_SWAP,
		...( sweepEligible( sweepEligibility, treatment, attributes ) ? [ TREATMENT_SWEEP ] : [] ),
	];
}

const SMART_CONTRAST_NOTE = __(
	'Automatic readable-text checking for these colours is switched on under General → Accessibility.',
	'sgs-blocks'
);

/**
 * Directional sweep angle control (FR-41-37 follow-up) — one preset
 * SelectControl (UI sugar) plus core's own AnglePickerControl, both writing
 * into the SAME `angle` attribute (CSS gradient-angle convention: 0=to top,
 * 90=to right, 180=to bottom, 270=to left). Exported so the bar-only rows in
 * `BarColourRowExtras.js` (Item separator, Burger icon/bg) can reuse it
 * rather than duplicating this control.
 *
 * @param {Object}   root0               Props.
 * @param {number}   root0.angle         The stored angle, degrees.
 * @param {Function} root0.onAngleChange Receives the next angle, degrees.
 * @return {Object} The node.
 */
export function SweepAngleControl( { angle, onAngleChange } ) {
	const current = Number.isFinite( angle ) ? angle : 90;
	const presets = [
		{ label: __( 'Horizontal (left to right)', 'sgs-blocks' ), value: 90 },
		{ label: __( 'Horizontal (right to left)', 'sgs-blocks' ), value: 270 },
		{ label: __( 'Vertical (top to bottom)', 'sgs-blocks' ), value: 180 },
		{ label: __( 'Vertical (bottom to top)', 'sgs-blocks' ), value: 0 },
	];
	const presetMatch = presets.find( ( p ) => p.value === current );
	return (
		<>
			<SelectControl
				label={ __( 'Sweep direction', 'sgs-blocks' ) }
				value={ presetMatch ? String( current ) : 'custom' }
				options={ [
					...presets.map( ( p ) => ( {
						label: p.label,
						value: String( p.value ),
					} ) ),
					{ label: __( 'Custom angle…', 'sgs-blocks' ), value: 'custom' },
				] }
				onChange={ ( val ) => {
					if ( 'custom' !== val ) {
						onAngleChange( Number( val ) );
					}
				} }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<AnglePickerControl
				label={ __( 'Angle', 'sgs-blocks' ) }
				value={ current }
				onChange={ ( val ) => onAngleChange( Number( val ) ) }
			/>
		</>
	);
}

/**
 * @param {Object}   root0                    Props.
 * @param {string}   root0.value              The stored treatment value.
 * @param {Function} root0.onChange           Receives the next treatment value.
 * @param {Object}   [root0.attributes]       Block attributes — read ONLY by the declared
 *                                            Sweep-eligibility predicate, never written.
 * @param {Object}   [root0.sweepEligibility] The caller's own declared eligibility map.
 * @return {Object} The node.
 */
export function ItemTextTreatment( { value, onChange, attributes, sweepEligibility } ) {
	return (
		<>
			<TreatmentSelect
				label={ __( 'Text on hover', 'sgs-blocks' ) }
				value={ value }
				onChange={ onChange }
				options={ sweepableOptions( attributes, 'itemColourHoverTreatment', sweepEligibility ) }
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
 * @param {Object}   root0          Props.
 * @param {string}   root0.value    The stored treatment value.
 * @param {Function} root0.onChange Receives the next treatment value.
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
 * ⛔ The ⓘ note here is the TWIN of the one in the Typography panel (§9.10),
 * and neither ships without the other.
 *
 * @param {Object}   root0                Props.
 * @param {string}   root0.value         The stored treatment value.
 * @param {Function} root0.onChange      Receives the next treatment value.
 * @param {number}   root0.angle         The stored sweep angle, degrees.
 * @param {Function} root0.onAngleChange Receives the next angle, degrees.
 * @return {Object} The node.
 */
export function ItemBorderTreatment( { value, onChange, angle, onAngleChange } ) {
	return (
		<>
			<TreatmentSelect
				label={ __( 'Border on hover', 'sgs-blocks' ) }
				value={ value }
				onChange={ onChange }
				options={ [ TREATMENT_NONE, TREATMENT_SWAP, TREATMENT_SWEEP ] }
			/>
			{ 'sweep' === value && (
				<SweepAngleControl angle={ angle } onAngleChange={ onAngleChange } />
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
 * @param {Object}   root0                    Props.
 * @param {string}   root0.value              The stored treatment value.
 * @param {Function} root0.onChange           Receives the next treatment value.
 * @param {Object}   [root0.attributes]       Block attributes — read ONLY by the declared
 *                                            Sweep-eligibility predicate, never written.
 * @param {Object}   [root0.sweepEligibility] The caller's own declared eligibility map.
 * @return {Object} The node.
 */
export function SubmenuTextTreatment( { value, onChange, attributes, sweepEligibility } ) {
	return (
		<TreatmentSelect
			label={ __( 'Link text on hover', 'sgs-blocks' ) }
			value={ value }
			onChange={ onChange }
			options={ sweepableOptions( attributes, 'submenuColourHoverTreatment', sweepEligibility ) }
		/>
	);
}

/**
 * ⛔ Two options only (FR-41-23): the sliding pill is an ITEM-row mechanism
 * needing siblings to slide between, and a per-link sweep-band on a strictly
 * vertical list has no referent. The third segment is dropped outright.
 *
 * @param {Object}   root0          Props.
 * @param {string}   root0.value    The stored treatment value.
 * @param {Function} root0.onChange Receives the next treatment value.
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
