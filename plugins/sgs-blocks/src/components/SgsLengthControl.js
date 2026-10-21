/**
 * SgsLengthControl — the one control for a single length, in two scales chosen by `scale`.
 *
 * ── scale="spacing" (default): core's spacing-sizes control ─────────────
 * One level row, as SgsBoxControl's rows are built: a names-only preset select, a 104px value box with its unit
 * (it shows the chosen preset's size), and a slider. Picking a preset stores its slug (`"50"`); typing in the box or
 * dragging the slider stores a length WITH a unit (`"20px"`), so a custom value can never collide with a slug, and
 * the select reads Custom. Both are resolved by `sgs_css_length_value()` (includes/helpers-css-safety.php).
 * Without a theme scale (or with `presets` off and no `tokenPresets`) the row is the value box and slider alone.
 *
 * Slider ranges are core's, not ours: `CUSTOM_VALUE_SETTINGS` in Gutenberg `wp/7.1`,
 * `packages/block-editor/src/components/spacing-sizes-control/input-controls/spacing-input-control.js`
 * (px 0-300 step 1; % and the viewport units 0-100 step 1; em and rem 0-10 step 0.1; the lower bound is 0).
 * A caller whose role needs a tighter range (a corner radius) passes `max`, in px: em/rem take it divided by 16,
 * while % and the viewport units keep core's range.
 *
 * ── scale="font-size": core's real FontSizePicker ───────────────────────
 * The same control, props and ranges TypographyControls renders for a font size (presets, gear toggle, unit box,
 * slider: 0-100 step 1 for px, 0-10 step 0.1 for em/rem/vw/vh, `wp/7.1`
 * `packages/components/src/font-size-picker/index.tsx`). A preset is stored as `var(--wp--preset--font-size--{slug})`
 * so the size follows the theme's type scale; a typed size is stored as its CSS length. Used for glyph, icon,
 * number and badge sizes; the render path reads the value through `sgs_icon_length_value()` or
 * `sgs_css_length_value()`. `placeholder`, `tokenPresets` and `presets` do not apply (the picker owns its presets).
 *
 * ── Roles, not blocks ───────────────────────────────────────────────────
 * The scale follows what the attribute DRIVES (`scripts/survey-length-control-scale.py` reads it from the framework
 * DB): glyph/icon/number/badge sizes use `font-size`; gaps, offsets, widths, heights, radius and thickness use
 * `spacing`. `--check` fails a mount whose declared scale disagrees.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSettings } from '@wordpress/block-editor';
import { BaseControl, Flex, FlexBlock, FlexItem, RangeControl, SelectControl } from '@wordpress/components';
import { UnitControl, FontSizePicker } from './primitives';
import { VALUE_BOX_STYLE, parseLength } from './SgsBoxControl';
import { flattenPresetSetting } from '../utils/presetSettings';

const CUSTOM_VALUE = '__custom__';

/** Core's custom-value slider settings per unit (see the file header for the source). */
const CUSTOM_VALUE_SETTINGS = {
	px: { max: 300, step: 1 },
	'%': { max: 100, step: 1 },
	em: { max: 10, step: 0.1 },
	rem: { max: 10, step: 0.1 },
	vw: { max: 100, step: 1 },
	vh: { max: 100, step: 1 },
};
const DEFAULT_RANGE = { max: 100, step: 1 };

/** The units the value box offers (core's spacing control offers px, em, rem; % and the viewport units are SGS's). */
const SPACING_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
	{ value: 'vw', label: 'vw', default: 0 },
	{ value: 'vh', label: 'vh', default: 0 },
];

/** Core's font-size unit set, a plain string array (FontSizePicker builds the object form itself). */
const FONT_SIZE_UNITS = [ 'px', 'em', 'rem', 'vw', 'vh' ];

const FONT_SIZE_PRESET_RE = /^var\(--wp--preset--font-size--([a-z0-9-]+)\)$/;

/**
 * @param {string}      unit Parsed unit.
 * @param {number|undefined} max Caller's tighter maximum, in px.
 * @return {{min: number, max: number, step: number}} The slider range for that unit.
 */
export function sliderRange( unit, max ) {
	const core = CUSTOM_VALUE_SETTINGS[ unit ] || DEFAULT_RANGE;
	let ceiling = core.max;
	if ( 'number' === typeof max ) {
		if ( 'px' === unit ) {
			ceiling = max;
		} else if ( 'rem' === unit || 'em' === unit ) {
			ceiling = Math.max( 1, Math.round( max / 16 ) );
		}
	}
	return { min: 0, max: ceiling, step: core.step };
}

/** A value that is a size in the font-size picker's terms: a length, a preset var, or empty. */
function fontSizeStored( value ) {
	if ( 'number' === typeof value ) {
		return `${ value }px`;
	}
	return 'string' === typeof value ? value : '';
}

function FontSizeScale( { label, hideLabelFromVision, help, style, disabled, units, value, onChange } ) {
	const stored = fontSizeStored( value );
	const slug = FONT_SIZE_PRESET_RE.exec( stored )?.[ 1 ];
	const pickerUnits = Array.isArray( units ) && units.every( ( u ) => 'string' === typeof u ) ? units : FONT_SIZE_UNITS;
	return (
		<div
			role="group"
			aria-label={ label }
			aria-disabled={ disabled || undefined }
			style={ disabled ? { ...style, opacity: 0.5, pointerEvents: 'none' } : style }
		>
			{ label && ! hideLabelFromVision && <BaseControl.VisualLabel>{ label }</BaseControl.VisualLabel> }
			<FontSizePicker
				value={ slug || stored || undefined }
				valueMode={ slug ? 'slug' : 'literal' }
				withSlider
				withReset={ false }
				units={ pickerUnits }
				onChange={ ( next, selectedItem ) => {
					// onChange always emits the literal size; a picked preset arrives as the second argument.
					if ( selectedItem?.slug ) {
						onChange( `var(--wp--preset--font-size--${ selectedItem.slug })` );
						return;
					}
					onChange( undefined === next || null === next || '' === next ? '' : String( next ) );
				} }
			/>
			{ help && <p className="components-base-control__help">{ help }</p> }
		</div>
	);
}

/**
 * @param {Object}   props
 * @param {string}   props.label          Field label.
 * @param {string}   [props.value]        Stored length ("20px"), spacing slug ("50"), token value or, for the
 *                                        font-size scale, a font-size preset var.
 * @param {Function} props.onChange       Receives the next stored string; '' when cleared.
 * @param {'spacing'|'font-size'} [props.scale='spacing'] Which core control to match (see the file header).
 * @param {Array}    [props.units]        Unit list for the value box (the font-size scale takes plain strings).
 * @param {boolean}  [props.presets=false] Offer the theme spacing scale. OPT-IN: pass true only when the attribute
 *                                        is typed to hold a slug string alongside a length (D338).
 * @param {Array}    [props.tokenPresets] `[ { label, value } ]` options stored verbatim (for example the motion
 *                                        `distance` tokens), listed after the spacing scale. Only when the
 *                                        attribute stores a string.
 * @param {number}   [props.max]          Tighter slider ceiling in px for a role that needs it (a corner radius).
 * @param {string}   [props.help]         Help line under the control.
 * @param {string}   [props.placeholder]  Shown in the value box while unset (an inherited tier value); the slider
 *                                        rests at it.
 * @param {boolean}  [props.hideLabelFromVision] Keep the label for assistive technology only, for a control already
 *                                        labelled by its wrapper (ResponsiveOverride and ResponsiveControl).
 * @param {Object}   [props.style]        Style for the control's wrapper.
 * @param {boolean}  [props.disabled]     Disable every part (a field inert under a disclosure rule).
 * @return {JSX.Element} The control.
 */
export default function SgsLengthControl( {
	label,
	value,
	onChange,
	scale = 'spacing',
	units,
	presets = false,
	tokenPresets,
	max,
	help,
	placeholder,
	hideLabelFromVision,
	style,
	disabled,
} ) {
	// useSettings() may hand back an origin-keyed OBJECT rather than an array (measured on the canary for
	// typography.fontSizes); normalise once so an object never reads as "the theme has no scale".
	const [ spacingSizesRaw ] = useSettings( 'spacing.spacingSizes' );
	// With `tokenPresets` an emptied value still shows the Custom input once Custom… is picked.
	const [ customPicked, setCustomPicked ] = useState( false );

	if ( 'font-size' === scale ) {
		return (
			<FontSizeScale
				label={ label }
				hideLabelFromVision={ hideLabelFromVision }
				help={ help }
				style={ style }
				disabled={ disabled }
				units={ units }
				value={ value }
				onChange={ onChange }
			/>
		);
	}

	const spacingSizes = presets ? flattenPresetSetting( spacingSizesRaw ) : [];
	const tokens = Array.isArray( tokenPresets ) ? tokenPresets : [];
	const hasSelect = spacingSizes.length > 0 || tokens.length > 0;

	const stored = 'number' === typeof value ? `${ value }px` : value ?? '';
	const preset = spacingSizes.find( ( s ) => s.slug === stored );
	const isToken = tokens.some( ( token ) => token.value === stored );
	const isPresetValue = !! preset || isToken;
	const keepCustom = tokens.length > 0 && customPicked;

	let selectValue = CUSTOM_VALUE;
	if ( ! stored ) {
		selectValue = keepCustom ? CUSTOM_VALUE : '';
	} else if ( isPresetValue ) {
		selectValue = stored;
	}

	// What the value box and slider read: the preset's size, the typed length, or the inherited placeholder.
	// A preset reads as its size, a token as nothing (it is not a length), anything else as the typed length.
	let readFrom = stored;
	if ( preset ) {
		readFrom = preset.size;
	} else if ( isToken ) {
		readFrom = '';
	}
	const shown = parseLength( readFrom );
	const resting = parseLength( placeholder );
	const unit = shown.num === undefined && resting.num !== undefined ? resting.unit : shown.unit;
	const range = sliderRange( unit, max );
	const sliderValue = shown.num ?? resting.num ?? 0;
	const boxPlaceholder = placeholder || ( preset && undefined === shown.num ? preset.size : undefined );

	const options = [
		{ label: __( '— none —', 'sgs-blocks' ), value: '' },
		...spacingSizes.map( ( s ) => ( { label: s.name || s.slug, value: s.slug } ) ),
		...tokens,
		{ label: __( 'Custom…', 'sgs-blocks' ), value: CUSTOM_VALUE },
	];

	const write = ( next ) => {
		setCustomPicked( true );
		onChange( next ?? '' );
	};

	return (
		// No group role: the select, value box and slider each carry the label, and a wrapper (AtomFrame,
		// ResponsiveOverride) already names the group.
		<div className="sgs-length-control" style={ style }>
			{ label && ! hideLabelFromVision && <BaseControl.VisualLabel>{ label }</BaseControl.VisualLabel> }
			<Flex align="center" gap={ 2 } className="sgs-length-control__row">
				{ hasSelect && (
					<FlexBlock>
						<SelectControl
							label={ label }
							hideLabelFromVision
							value={ selectValue }
							options={ options }
							disabled={ disabled }
							onChange={ ( next ) => {
								setCustomPicked( CUSTOM_VALUE === next );
								if ( CUSTOM_VALUE === next ) {
									// Custom starts from the size of the preset just left; from none it waits for a value.
									const start = readFrom;
									if ( start !== stored ) {
										onChange( start );
									}
									return;
								}
								onChange( next );
							} }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</FlexBlock>
				) }
				<FlexItem className="sgs-length-control__value" style={ hasSelect ? VALUE_BOX_STYLE : { ...VALUE_BOX_STYLE, width: 112 } }>
					<UnitControl
						label={ label }
						hideLabelFromVision
						value={ shown.num === undefined ? ( isPresetValue ? '' : stored ) : `${ shown.num }${ shown.unit }` }
						placeholder={ boxPlaceholder }
						onChange={ ( raw ) => write( raw ) }
						units={ units || SPACING_UNITS }
						disabled={ disabled }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</FlexItem>
				<FlexBlock>
					<RangeControl
						label={ label }
						hideLabelFromVision
						value={ sliderValue }
						onChange={ ( v ) => write( undefined === v || null === v ? '' : `${ v }${ unit }` ) }
						min={ range.min }
						max={ range.max }
						step={ range.step }
						withInputField={ false }
						disabled={ disabled }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</FlexBlock>
			</Flex>
			{ help && <p className="components-base-control__help">{ help }</p> }
		</div>
	);
}
