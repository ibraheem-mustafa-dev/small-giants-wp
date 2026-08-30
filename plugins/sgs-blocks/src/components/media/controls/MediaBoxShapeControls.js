/**
 * MediaBoxShapeControls — shared bare-row control set for the `box-shape`
 * atom (sizing mode / ratio / named shape / height / min-height / width /
 * max-width / max-height / max-width-percent).
 *
 * Reuses `MediaSizingPanel`'s `RATIO_OPTIONS` verbatim rather than retyping
 * the six-value spaced ratio list — that list is already the framework's one
 * server-side ratio allowlist precedent (`image-sequence/render.php`), and a
 * second hand-typed copy is exactly the drift this atom exists to remove.
 *
 * Bare rows only — mounts no `InspectorControls`/`PanelBody`. The caller (the
 * atom's own `control()`) decides which panel these rows land in, matching
 * every other media-atom control (`ObjectFitField`, `FocalPositionField`).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl, ToggleGroupControl, ToggleGroupControlOption } from '@wordpress/components';
import { RATIO_OPTIONS } from '../../MediaSizingPanel.js';

const MODE_OPTIONS = [
	{ label: __( 'Auto', 'sgs-blocks' ), value: 'auto' },
	{ label: __( 'Fixed height', 'sgs-blocks' ), value: 'height' },
	{ label: __( 'Aspect ratio', 'sgs-blocks' ), value: 'ratio' },
];

const SHAPE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Rounded', 'sgs-blocks' ), value: 'rounded' },
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
];

const LENGTH_UNITS = [
	{ label: 'px', value: 'px' },
	{ label: '%', value: '%' },
	{ label: 'vh', value: 'vh' },
	{ label: 'vw', value: 'vw' },
	{ label: 'rem', value: 'rem' },
];

/**
 * One tier-value + unit row (used for Height — the numeric-plus-separate-
 * unit shape, matching `sgs/media`'s stored shape exactly).
 */
function TierLengthRow( {
	label,
	value,
	unit,
	onChangeValue,
	onChangeUnit,
	disabled,
	hiddenReason,
} ) {
	return (
		<div className="sgs-media-box-shape__row" aria-disabled={ disabled }>
			<TextControl
				label={ label }
				type="number"
				value={ value ?? '' }
				disabled={ disabled }
				help={ disabled ? hiddenReason : undefined }
				onChange={ ( v ) => onChangeValue( '' === v ? undefined : Number( v ) ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Unit', 'sgs-blocks' ) }
				value={ unit || 'px' }
				disabled={ disabled }
				options={ LENGTH_UNITS }
				onChange={ onChangeUnit }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</div>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.sizing           Current 'auto' | 'height' | 'ratio'.
 * @param {Function} props.onSizingChange
 * @param {string}   props.ratio            Ratio string (either format — the
 *                                          caller normalises on write).
 * @param {Function} props.onRatioChange
 * @param {string}   props.shape            'none' | 'rounded' | 'circle' | 'square'.
 * @param {Function} props.onShapeChange
 * @param {Object}   props.heightValue      `{desktop,tablet,mobile}` numbers.
 * @param {Function} props.onHeightChange
 * @param {string}   props.heightUnit
 * @param {Function} props.onHeightUnitChange
 * @param {string}   props.minHeightValue   Desktop-tier CSS length string
 *                                          (unit-embedded, e.g. "40vh").
 * @param {Function} props.onMinHeightChange
 * @param {boolean}  [props.heightDisabled] Whether the sizing mode makes
 *                                          Height/Ratio rows inert.
 * @param {string}   [props.heightHiddenReason]
 * @param {string}   [props.ratioHiddenReason]
 */
export default function MediaBoxShapeControls( {
	sizing,
	onSizingChange,
	ratio,
	onRatioChange,
	shape,
	onShapeChange,
	heightValue,
	onHeightChange,
	heightUnit,
	onHeightUnitChange,
	minHeightValue,
	onMinHeightChange,
	heightDisabled = false,
	ratioDisabled = false,
	heightHiddenReason = '',
	ratioHiddenReason = '',
} ) {
	const resolvedSizing = sizing || 'auto';
	const heightObj = heightValue && 'object' === typeof heightValue ? heightValue : {};

	return (
		<>
			<ToggleGroupControl
				label={ __( 'Box shape', 'sgs-blocks' ) }
				help={ __( 'Auto follows the picture. Fixed height and Aspect ratio each set the box, then the picture fills it.', 'sgs-blocks' ) }
				value={ resolvedSizing }
				onChange={ ( v ) => onSizingChange( v || 'auto' ) }
				isBlock
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			>
				{ MODE_OPTIONS.map( ( opt ) => (
					<ToggleGroupControlOption key={ opt.value } value={ opt.value } label={ opt.label } />
				) ) }
			</ToggleGroupControl>

			<TierLengthRow
				label={ __( 'Height', 'sgs-blocks' ) }
				value={ heightObj.desktop }
				unit={ heightUnit }
				disabled={ heightDisabled }
				hiddenReason={ heightHiddenReason }
				onChangeValue={ ( v ) => onHeightChange( { ...heightObj, desktop: v } ) }
				onChangeUnit={ onHeightUnitChange }
			/>

			<div aria-disabled={ ratioDisabled }>
				<SelectControl
					label={ __( 'Ratio', 'sgs-blocks' ) }
					help={ ratioDisabled ? ratioHiddenReason : __( 'The box always keeps this shape, at every width.', 'sgs-blocks' ) }
					value={ ratio || '' }
					disabled={ ratioDisabled }
					options={ [ { label: __( '— Select —', 'sgs-blocks' ), value: '' }, ...RATIO_OPTIONS ] }
					onChange={ onRatioChange }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</div>

			<SelectControl
				label={ __( 'Shape', 'sgs-blocks' ) }
				help={ __( 'Clips the media to a decorative shape — never changes the block border.', 'sgs-blocks' ) }
				value={ shape || 'none' }
				options={ SHAPE_OPTIONS }
				onChange={ onShapeChange }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			<TextControl
				label={ __( 'Minimum height (any unit, e.g. 40vh)', 'sgs-blocks' ) }
				value={ minHeightValue || '' }
				onChange={ onMinHeightChange }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</>
	);
}
