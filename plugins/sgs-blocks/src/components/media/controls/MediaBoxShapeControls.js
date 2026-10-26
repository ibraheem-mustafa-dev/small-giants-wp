/**
 * MediaBoxShapeControls — shared bare-row control set for the `box-shape`
 * atom (sizing mode / ratio / named shape / border radius / height /
 * min-height / width / max-width / max-height).
 *
 * `maxWidthPercent` was DELETED (2026-09-07) — a percentage max-width IS a
 * max-width with a `%` unit, and `%` is already in `LENGTH_UNITS` below, so
 * the dedicated RangeControl row duplicated the "Max width" field for zero
 * capability loss. See `includes/media/atoms/box-shape.php` module docblock
 * for the full removal rationale.
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
 * ── Length fields ────────────────────────────────────────────────────────
 * Height/Width/MaxWidth/MaxHeight are each a per-device object of CSS length
 * strings (`{desktop,tablet,mobile}`, unit inside the string). Every field is
 * an `SgsLengthControl` inside `ResponsiveOverride`, writing its own string
 * straight into the device's slot.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../primitives';
import { RATIO_OPTIONS } from '../../MediaSizingPanel.js';
import SgsBorderControl from '../../SgsBorderControl.js';
import SgsLengthControl from '../../SgsLengthControl.js';
import ResponsiveOverride from '../../ResponsiveOverride';

const MODE_OPTIONS = [
	{ label: __( 'Auto', 'sgs-blocks' ), value: 'auto' },
	{ label: __( 'Fixed height', 'sgs-blocks' ), value: 'height' },
	{ label: __( 'Aspect ratio', 'sgs-blocks' ), value: 'ratio' },
	{ label: __( 'Fill space', 'sgs-blocks' ), value: 'fill' },
];

export const SHAPE_OPTIONS = [
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
 * One per-device length row for a box-shape length field.
 */
function LengthFieldRow( { label, value, onChange, disabled, hiddenReason } ) {
	return (
		<ResponsiveOverride label={ label } value={ value } onChange={ onChange }>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<SgsLengthControl
					presets={ false }
					label={ label }
					hideLabelFromVision
					help={ disabled ? hiddenReason : undefined }
					value={ ownValue || '' }
					placeholder={ inherited ? effectiveValue || '' : '' }
					units={ LENGTH_UNITS }
					disabled={ disabled }
					onChange={ ( v ) => setOwnValue( v || '' ) }
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.sizing           Current 'auto' | 'height' | 'ratio' | 'fill'.
 * @param {Function} props.onSizingChange
 * @param {string}   props.ratio            Ratio string (either format — the
 *                                          caller normalises on write).
 * @param {Function} props.onRatioChange
 * @param {string}   props.shape            'none' | 'rounded' | 'circle' | 'square'.
 * @param {Function} props.onShapeChange
 * @param {Object}   props.heightValue      `{desktop,tablet,mobile}` length strings.
 * @param {Function} props.onHeightChange
 * @param {string}   props.minHeightValue   Desktop-tier CSS length string
 *                                          (unit-embedded, e.g. "40vh").
 * @param {Function} props.onMinHeightChange
 * @param {Object}   [props.widthValue]     `{desktop,tablet,mobile}` length strings.
 * @param {Function} [props.onWidthChange]
 * @param {Object}   [props.maxWidthValue]  `{desktop,tablet,mobile}` length strings.
 * @param {Function} [props.onMaxWidthChange]
 * @param {Object}   [props.maxHeightValue] `{desktop,tablet,mobile}` length strings.
 * @param {Function} [props.onMaxHeightChange]
 * @param {Object}   [props.borderWidthValue]     `{top,right,bottom,left}` —
 *                                          `SgsBorderControl`'s own `widthValues`
 *                                          shape. Untiered — per-device border
 *                                          width is cancelled, not deferred.
 * @param {Function} [props.onBorderWidthChange]
 * @param {string}   [props.borderStyleValue]
 * @param {Function} [props.onBorderStyleChange]
 * @param {string}   [props.borderColourValue]
 * @param {Function} [props.onBorderColourChange]
 * @param {string}   [props.borderColourGradientValue]
 * @param {Function} [props.onBorderColourGradientChange]
 * @param {string}   [props.borderColourHoverValue]      Hover pair (2026-09-07),
 *                                          colour-only — no hover variant for
 *                                          width/style/radius, matching
 *                                          sgs/button's/sgs/container's own
 *                                          states.hover.attrMap convention.
 * @param {Function} [props.onBorderColourHoverChange]
 * @param {string}   [props.borderColourHoverGradientValue]
 * @param {Function} [props.onBorderColourHoverGradientChange]
 * @param {Object}   [props.borderRadiusValues]   `{base,tablet,mobile}` 4-corner
 *                                          objects — `SgsBorderControl`'s own
 *                                          `radiusValues` shape. Shown UNGATED,
 *                                          for every `shape` value (2026-09-02) —
 *                                          the border's own paint is independent
 *                                          of the decorative clip.
 * @param {Function} [props.onBorderRadiusChange] `(tier, nextCorners) => void`.
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
	minHeightValue,
	onMinHeightChange,
	widthValue,
	onWidthChange,
	maxWidthValue,
	onMaxWidthChange,
	maxHeightValue,
	onMaxHeightChange,
	borderWidthValue,
	onBorderWidthChange,
	borderStyleValue,
	onBorderStyleChange,
	borderColourValue,
	onBorderColourChange,
	borderColourGradientValue,
	onBorderColourGradientChange,
	borderColourHoverValue,
	onBorderColourHoverChange,
	borderColourHoverGradientValue,
	onBorderColourHoverGradientChange,
	borderRadiusValues,
	onBorderRadiusChange,
	heightDisabled = false,
	ratioDisabled = false,
	heightHiddenReason = '',
	ratioHiddenReason = '',
} ) {
	const resolvedSizing = sizing || 'auto';
	const heightObj = heightValue && 'object' === typeof heightValue ? heightValue : {};
	const widthObj = widthValue && 'object' === typeof widthValue ? widthValue : {};
	const maxWidthObj = maxWidthValue && 'object' === typeof maxWidthValue ? maxWidthValue : {};
	const maxHeightObj = maxHeightValue && 'object' === typeof maxHeightValue ? maxHeightValue : {};

	return (
		<>
			<ToggleGroupControl
				label={ __( 'Box shape', 'sgs-blocks' ) }
				help={ __( 'Auto follows the picture. Fixed height and Aspect ratio each set the box, then the picture fills it. Fill space takes the space the layout gives it (such as its half of a two-column row, at least the Minimum height) and the picture covers it.', 'sgs-blocks' ) }
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

			<LengthFieldRow
				label={ __( 'Height', 'sgs-blocks' ) }
				value={ heightObj }
				disabled={ heightDisabled }
				hiddenReason={ heightHiddenReason }
				onChange={ onHeightChange }
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

			{ /* Ungated by shape (2026-09-02, Bean's ruling): the border's own
			     paint shows the same way for every shape value — no
			     conditional mount. SgsBorderControl fed this atom's own
			     attribute names with zero custom logic, same as every other
			     block that mounts it (e.g. sgs/before-after's "Border" panel). */ }
			{ onBorderWidthChange && (
				<SgsBorderControl
					label={ __( 'Border', 'sgs-blocks' ) }
					widthValues={ borderWidthValue || {} }
					onWidthChange={ onBorderWidthChange }
					styleValue={ borderStyleValue }
					onStyleChange={ onBorderStyleChange }
					colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
					colourStates={ [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: borderColourValue,
							onChange: onBorderColourChange,
							gradientValue: borderColourGradientValue,
							onGradientChange: onBorderColourGradientChange,
						},
						{
							key: 'hover',
							label: __( 'Hover', 'sgs-blocks' ),
							value: borderColourHoverValue,
							onChange: onBorderColourHoverChange,
							gradientValue: borderColourHoverGradientValue,
							onGradientChange: onBorderColourHoverGradientChange,
						},
					] }
					radiusLabel={ __( 'Corner radius', 'sgs-blocks' ) }
					radiusValues={ borderRadiusValues || {} }
					onRadiusChange={ onBorderRadiusChange }
				/>
			) }

			{ onWidthChange && (
				<LengthFieldRow
					label={ __( 'Width', 'sgs-blocks' ) }
					value={ widthObj }
					onChange={ onWidthChange }
				/>
			) }

			{ onMaxWidthChange && (
				<LengthFieldRow
					label={ __( 'Max width', 'sgs-blocks' ) }
					value={ maxWidthObj }
					onChange={ onMaxWidthChange }
				/>
			) }

			{ onMaxHeightChange && (
				<LengthFieldRow
					label={ __( 'Max height', 'sgs-blocks' ) }
					value={ maxHeightObj }
					onChange={ onMaxHeightChange }
				/>
			) }

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
