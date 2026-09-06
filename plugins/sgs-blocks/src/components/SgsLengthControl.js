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
import { flattenPresetSetting } from '../utils/presetSettings';

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
 * @param {string}   [props.help]         Passthrough to UnitControl's `help`.
 * @param {string}   [props.placeholder]  Passthrough to UnitControl's `placeholder`
 *                                        (e.g. showing an inherited tier value).
 * @param {boolean}  [props.hideLabelFromVision] Passthrough — visually hide the
 *                                        label while keeping it for a11y, for a
 *                                        control already labelled by its wrapper
 *                                        (e.g. a `ResponsiveOverride`/`ResponsiveControl`
 *                                        render-prop child).
 * @param {Object}   [props.style]        Passthrough inline style (e.g. spacing
 *                                        adjustments a caller applies around the
 *                                        control).
 * @param {boolean}  [props.disabled]     Passthrough to the underlying
 *                                        UnitControl (both branches — the
 *                                        preset SelectControl and its nested
 *                                        Custom-value UnitControl). Added
 *                                        2026-09-01 for a caller whose field
 *                                        is inert under a disclosure rule
 *                                        (e.g. box-shape's Height row, hidden
 *                                        when the sizing mode is not
 *                                        'height') — a genuinely missing
 *                                        capability, not a passthrough spread.
 *
 * Added 2026-08-27 (Branch 2, Gate B adoption) — three concurrent adoption
 * passes independently found the same gap: this component had no rest-prop
 * spread, so `help`/`placeholder`/`hideLabelFromVision` silently vanished on
 * any mount that used them. `hideLabelFromVision` loss is not just lost hint
 * text — it is a visible regression (the inner label renders, duplicating the
 * wrapper's own label). Named params, not a `...rest` spread: SgsLengthControl
 * is deliberately a thin wrapper with a known, documented prop surface, not an
 * arbitrary passthrough — the presets=true branch has its own dedicated
 * SelectControl + Custom-value UnitControl and each needs an explicit decision
 * about which of these apply to which, not silent forwarding.
 */
export default function SgsLengthControl( {
	label,
	value,
	onChange,
	units,
	presets = false,
	help,
	placeholder,
	hideLabelFromVision,
	style,
	disabled,
} ) {
	// useSettings() may hand back an origin-keyed OBJECT rather than an array
	// (measured on the canary 2026-08-19 for typography.fontFamilies/fontSizes).
	// Here that failed QUIETLY rather than loudly: `( obj || [] ).length` is
	// undefined, so the guard below took the early return and the preset
	// dropdown simply never appeared — a false absence that looks like "the
	// theme has no spacing scale". Normalise once, then use unguarded.
	const [ spacingSizesRaw ] = useSettings( 'spacing.spacingSizes' );
	const spacingSizes = flattenPresetSetting( spacingSizesRaw );

	if ( ! presets || ! spacingSizes.length ) {
		return (
			<UnitControl
				label={ label }
				hideLabelFromVision={ hideLabelFromVision }
				help={ help }
				placeholder={ placeholder }
				style={ style }
				value={ value ?? '' }
				onChange={ ( raw ) => onChange( raw ?? '' ) }
				units={ units }
				disabled={ disabled }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		);
	}

	const isPresetValue = spacingSizes.some( ( s ) => s.slug === value );
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
				hideLabelFromVision={ hideLabelFromVision }
				help={ help }
				style={ style }
				value={ selectValue }
				options={ options }
				disabled={ disabled }
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
					disabled={ disabled }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</>
	);
}
