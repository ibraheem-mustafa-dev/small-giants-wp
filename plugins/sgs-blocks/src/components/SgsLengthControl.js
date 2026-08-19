/**
 * SgsLengthControl — thin SGS wrapper for a length/unit value (Bean-directed
 * new build, 2026-08-19; same construction pattern Session B used building an
 * SGS wrapper for its own gap type, modelled on LinkPopoverControl's
 * self-contained-trigger-plus-real-capability shape).
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 * `length-unit`'s survey (2026-08-19) found no SGS wrapper anywhere in this
 * tree — every one of the 77 measured mounts (24 blocks) uses WP core's
 * `UnitControl` directly via the `primitives` barrel, with no theme-token
 * integration. Every OTHER measurement-shaped control in this session
 * (TypographyControls' `fontSizePresets`, DesignTokenPicker's palette) offers
 * a token-scale preset alongside the free-input control. Length/unit was the
 * one family with no equivalent — this component closes that gap using the
 * exact same pattern: `useSettings( 'spacing.spacingSizes' )` (theme.json's
 * named spacing scale, the direct analogue of `typography.fontSizes`) feeds
 * a preset dropdown; picking "Custom" (or typing a value once a preset is
 * already active) drops to the raw `UnitControl`.
 *
 * ── OPT-IN, not a UnitControl replacement ──────────────────────────────
 * A caller that just wants the raw control keeps importing `UnitControl`
 * from `./primitives` directly — nothing here forces a migration. This is a
 * new capability for callers that want a theme-scale preset, following the
 * fontSizePresets precedent's own opt-in shape (a boolean prop, default off).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useSettings } from '@wordpress/block-editor';
import { SelectControl } from '@wordpress/components';
import { UnitControl } from './primitives';

const CUSTOM_VALUE = '__custom__';

/**
 * @param {Object}   props
 * @param {string}   props.label          Field label.
 * @param {string}   [props.value]        Stored CSS length string (e.g. "20px")
 *                                        or a theme spacing-size slug (e.g. "50").
 * @param {Function} props.onChange       Receives the next raw length string or slug.
 * @param {Array}    [props.units]        UnitControl unit list.
 * @param {boolean}  [props.presets=false] Offer the theme.json spacing-scale
 *                                        dropdown. OPT-IN: only pass true when
 *                                        the block's attr is typed to accept a
 *                                        slug string alongside a length — same
 *                                        undeclared-attr silent-discard guard
 *                                        (D338) fontSizePresets already carries.
 */
export default function SgsLengthControl( { label, value, onChange, units, presets = false } ) {
	const [ spacingSizes ] = useSettings( 'spacing.spacingSizes' );

	if ( ! presets || ! ( spacingSizes || [] ).length ) {
		return (
			<UnitControl
				label={ label }
				value={ value ?? '' }
				onChange={ ( raw ) => onChange( raw ?? '' ) }
				units={ units }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		);
	}

	const isPresetValue = ( spacingSizes || [] ).some( ( s ) => s.slug === value );
	const selectValue = ! value ? '' : isPresetValue ? value : CUSTOM_VALUE;

	const options = [
		{ label: __( '— none —', 'sgs-blocks' ), value: '' },
		...spacingSizes.map( ( s ) => ( { label: `${ s.name || s.slug } (${ s.size })`, value: s.slug } ) ),
		{ label: __( 'Custom…', 'sgs-blocks' ), value: CUSTOM_VALUE },
	];

	return (
		<>
			<SelectControl
				label={ label }
				value={ selectValue }
				options={ options }
				onChange={ ( next ) => {
					if ( next === CUSTOM_VALUE ) {
						onChange( isPresetValue ? '' : value );
						return;
					}
					onChange( next );
				} }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ selectValue === CUSTOM_VALUE && (
				<UnitControl
					label={ label }
					hideLabelFromVision
					value={ isPresetValue ? '' : value ?? '' }
					onChange={ ( raw ) => onChange( raw ?? '' ) }
					units={ units }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</>
	);
}
