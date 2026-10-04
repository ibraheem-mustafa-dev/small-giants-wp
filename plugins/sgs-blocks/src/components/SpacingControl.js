/**
 * Spacing control that reads theme.json spacing presets.
 *
 * Two modes:
 *  - Preset (default): presents a dropdown of the theme's spacing scale
 *    (XXS through XXXL) so blocks use consistent spacing tokens rather than
 *    arbitrary values. The stored value is the preset slug (e.g. "40").
 *
 *  - Free input (freeInput=true): renders a UnitControl so the operator can
 *    type ANY raw CSS length (e.g. "16px", "1.5rem", "16px 12px"). A bare
 *    number with no unit has "px" appended automatically so the stored value
 *    is always a valid CSS length string. Use this mode on controls that feed
 *    sgs_container_gap_value() which already handles raw lengths.
 *
 *  - Preset plus custom (custom=true): the dropdown gains a final "Custom"
 *    entry. Picking it (or loading a stored value that is not a preset slug)
 *    swaps the dropdown for the number-plus-unit box, with a "Use a preset"
 *    link back. Stored shape: a preset slug ("20") or a length with a unit
 *    ("11px"); the read side is sgs_css_length_value().
 *
 * The freeInput prop must be set explicitly — omitting it or passing false
 * preserves the existing preset-dropdown behaviour with zero behaviour change
 * for current callers.
 */
import { useSettings } from '@wordpress/block-editor';
import { useState } from '@wordpress/element';
import { Button, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { UnitControl } from './primitives';

/** Units available in the free-input UnitControl. */
const FREE_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
	{ value: 'vw', label: 'vw', default: 0 },
];

/**
 * Normalise a raw input string: append "px" when the value is a bare number
 * with no unit, so the stored value is always a valid CSS length or empty.
 *
 * @param {string} raw Raw string from UnitControl onChange.
 * @returns {string} Normalised CSS value or empty string.
 */
function normaliseFreeInput( raw ) {
	if ( ! raw && raw !== 0 ) {
		return '';
	}
	const trimmed = String( raw ).trim();
	if ( '' === trimmed ) {
		return '';
	}
	// Bare number → append px.
	if ( /^\d+(\.\d+)?$/.test( trimmed ) ) {
		return trimmed + 'px';
	}
	return trimmed;
}

const CUSTOM_KEY = '__custom';

export default function SpacingControl( { label, value, onChange, freeInput = false, custom = false } ) {
	const [ pickedCustom, setPickedCustom ] = useState( false );
	// Guard against null/undefined from useSettings (can occur before settings load).
	const [ spacingSizes ] = useSettings( 'spacing.spacingSizes' );
	const sizes = spacingSizes ?? [];

	// ── Free-input mode ────────────────────────────────────────────────────
	if ( freeInput ) {
		return (
			<UnitControl
				label={ label }
				value={ value || '' }
				units={ FREE_UNITS }
				onChange={ ( val ) => onChange( normaliseFreeInput( val ) ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		);
	}

	const isPreset = ( v ) => sizes.some( ( size ) => size.slug === String( v ) );
	const showCustom = custom && ( pickedCustom || ( !! value && ! isPreset( value ) ) );

	if ( showCustom ) {
		return (
			<div className="sgs-spacing-control__custom">
				<UnitControl
					label={ label }
					value={ value || '' }
					units={ FREE_UNITS }
					onChange={ ( val ) => onChange( normaliseFreeInput( val ) ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<Button
					variant="link"
					onClick={ () => {
						setPickedCustom( false );
						onChange( '' );
					} }
				>
					{ __( 'Use a preset', 'sgs-blocks' ) }
				</Button>
			</div>
		);
	}

	// ── Preset dropdown mode ───────────────────────────────────────────────
	const options = [
		{ label: __( 'None', 'sgs-blocks' ), value: '' },
		...sizes.map( ( size ) => ( {
			label: `${ size.name } (${ size.size })`,
			value: size.slug,
		} ) ),
		...( custom ? [ { label: __( 'Custom', 'sgs-blocks' ), value: CUSTOM_KEY } ] : [] ),
	];

	return (
		<SelectControl
			label={ label }
			value={ value || '' }
			options={ options }
			onChange={ ( val ) => {
				if ( CUSTOM_KEY === val ) {
					setPickedCustom( true );
					return;
				}
				onChange( val );
			} }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
}
