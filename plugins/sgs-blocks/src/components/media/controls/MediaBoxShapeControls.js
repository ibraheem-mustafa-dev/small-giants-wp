/**
 * MediaBoxShapeControls — shared bare-row control set for the `box-shape`
 * atom (sizing mode / ratio / named shape / border radius / height /
 * min-height / width / max-width / max-height / max-width-percent).
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
 * ── Length fields are ONE LINE (2026-09-01) ─────────────────────────────
 * Height/Width/MaxWidth/MaxHeight are stored as a tier object of plain
 * NUMBERS paired with a SEPARATE flat unit attribute (box-shape.js's own
 * documented storage shape) — NOT `SgsLengthControl`'s single combined CSS
 * length STRING contract. `combineLength()`/`splitLength()` below bridge the
 * two on display/write, so every field still renders as one integrated
 * number+unit input instead of a `TextControl` beside a `SelectControl`.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { RangeControl, SelectControl, TextControl } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../primitives';
import { RATIO_OPTIONS } from '../../MediaSizingPanel.js';
import SgsBorderControl from '../../SgsBorderControl.js';
import SgsLengthControl from '../../SgsLengthControl.js';

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
 * Combine a tier NUMBER + a shared UNIT string into the one CSS-length string
 * `SgsLengthControl` displays (e.g. 20 + 'px' -> "20px").
 *
 * @param {number|string|undefined} value Tier value.
 * @param {string}                  unit  Shared unit attribute value.
 * @return {string} Combined length, or '' when unset.
 */
function combineLength( value, unit ) {
	if ( undefined === value || null === value || '' === value ) {
		return '';
	}
	return `${ value }${ unit || 'px' }`;
}

/**
 * Split a CSS-length string back into a `{ value, unit }` pair for the tier
 * attribute + shared unit attribute. An empty/unparseable input clears the
 * tier value and leaves the unit untouched (the caller only writes the unit
 * attribute when a new one is actually present).
 *
 * @param {string} raw Combined length string from `SgsLengthControl`.
 * @return {{value: (number|undefined), unit: (string|undefined)}}
 */
function splitLength( raw ) {
	if ( ! raw ) {
		return { value: undefined, unit: undefined };
	}
	const m = String( raw ).trim().match( /^(-?\d*\.?\d+)([a-z%]*)$/i );
	if ( ! m ) {
		return { value: undefined, unit: undefined };
	}
	return {
		value: '' === m[ 1 ] ? undefined : Number( m[ 1 ] ),
		unit: m[ 2 ] || undefined,
	};
}

/**
 * One integrated number+unit row for a box-shape length field.
 */
function LengthFieldRow( {
	label,
	value,
	unit,
	onChangeValue,
	onChangeUnit,
	disabled,
	hiddenReason,
} ) {
	return (
		<SgsLengthControl
			label={ label }
			help={ disabled ? hiddenReason : undefined }
			value={ combineLength( value, unit ) }
			units={ LENGTH_UNITS }
			disabled={ disabled }
			onChange={ ( raw ) => {
				const next = splitLength( raw );
				onChangeValue( next.value );
				if ( next.unit && next.unit !== unit ) {
					onChangeUnit( next.unit );
				}
			} }
		/>
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
 * @param {Object}   [props.widthValue]     `{desktop,tablet,mobile}` numbers.
 * @param {Function} [props.onWidthChange]
 * @param {string}   [props.widthUnit]
 * @param {Function} [props.onWidthUnitChange]
 * @param {Object}   [props.maxWidthValue]  `{desktop}` — not tiered (box-shape's
 *                                          `css()` only ever reads `.desktop`).
 * @param {Function} [props.onMaxWidthChange]
 * @param {string}   [props.maxWidthUnit]
 * @param {Function} [props.onMaxWidthUnitChange]
 * @param {Object}   [props.maxHeightValue] `{desktop}` — not tiered, same as MaxWidth.
 * @param {Function} [props.onMaxHeightChange]
 * @param {string}   [props.maxHeightUnit]
 * @param {Function} [props.onMaxHeightUnitChange]
 * @param {number}   [props.maxWidthPercentValue] Bare percentage number.
 * @param {Function} [props.onMaxWidthPercentChange]
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
	heightUnit,
	onHeightUnitChange,
	minHeightValue,
	onMinHeightChange,
	widthValue,
	onWidthChange,
	widthUnit,
	onWidthUnitChange,
	maxWidthValue,
	onMaxWidthChange,
	maxWidthUnit,
	onMaxWidthUnitChange,
	maxHeightValue,
	onMaxHeightChange,
	maxHeightUnit,
	onMaxHeightUnitChange,
	maxWidthPercentValue,
	onMaxWidthPercentChange,
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

			<LengthFieldRow
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
					value={ widthObj.desktop }
					unit={ widthUnit }
					onChangeValue={ ( v ) => onWidthChange( { ...widthObj, desktop: v } ) }
					onChangeUnit={ onWidthUnitChange }
				/>
			) }

			{ onMaxWidthChange && (
				<LengthFieldRow
					label={ __( 'Max width', 'sgs-blocks' ) }
					value={ maxWidthObj.desktop }
					unit={ maxWidthUnit }
					onChangeValue={ ( v ) => onMaxWidthChange( { ...maxWidthObj, desktop: v } ) }
					onChangeUnit={ onMaxWidthUnitChange }
				/>
			) }

			{ onMaxHeightChange && (
				<LengthFieldRow
					label={ __( 'Max height', 'sgs-blocks' ) }
					value={ maxHeightObj.desktop }
					unit={ maxHeightUnit }
					onChangeValue={ ( v ) => onMaxHeightChange( { ...maxHeightObj, desktop: v } ) }
					onChangeUnit={ onMaxHeightUnitChange }
				/>
			) }

			{ onMaxWidthPercentChange && (
				<RangeControl
					label={ __( 'Max width (% of parent)', 'sgs-blocks' ) }
					value={ maxWidthPercentValue }
					onChange={ onMaxWidthPercentChange }
					min={ 0 }
					max={ 100 }
					step={ 1 }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
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
