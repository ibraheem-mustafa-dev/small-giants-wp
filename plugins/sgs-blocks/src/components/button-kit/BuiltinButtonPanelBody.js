/**
 * The built-in button kit's controls for one declared button.
 *
 * Every attribute name is `prefix + base`, with the bases taken from `registry.json` (the table the generator writes
 * `block.json` attributes from), so a control can never write a name the generator did not create. Only the groups the
 * block declares show. The look controls sit in one Styles panel titled with the button's label. The colour rows go in the
 * block's one main Colour panel under a heading with the same label (a block with 12 or fewer base colours passes
 * `colourInMainPanel`), or, in any other block, in the kit's own Colour panel.
 *
 * Controls are the shared ones: the colour rows (`./colour-rows.js`), `SgsBorderControl`, `SgsBoxControl` and `SgsLengthControl` inside
 * `ResponsiveOverride`, `ShadowControl` and `TypographyControls`.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

import registry from './registry.json';
import ResponsiveOverride from '../ResponsiveOverride';
import SgsBorderControl from '../SgsBorderControl';
import SgsBoxControl from '../SgsBoxControl';
import KitColourPanel from '../KitColourPanel';
import SgsLengthControl from '../SgsLengthControl';
import ShadowControl from '../ShadowControl';
import TypographyControls from '../TypographyControls';
import { buttonKitColourRows } from './colour-rows';
import { builtinButtonAttrName } from '../BuiltinButtonPanel';
import { BOX_UNITS, normaliseResponsiveBox } from '../ResponsiveBoxControl';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';
import { presetOptions } from '../../blocks/button/preset-names';

/** Every registry row, each carrying its group name. */
const ROWS = Object.entries( registry.groups ).flatMap( ( [ group, rows ] ) =>
	rows.map( ( row ) => ( { group, ...row } ) )
);

/** The groups a declaration without `groups` shows (the registry's `defaultGroups`). */
const DEFAULT_GROUPS = registry.defaultGroups;

const BASES = new Set( ROWS.map( ( row ) => row.base ) );

/** The typography bases stored as `{desktop,tablet,mobile}` objects. */
const TIER_TYPOGRAPHY_BASES = ROWS.filter(
	( row ) => 'typography' === row.group && 'tier_object' === row.tier_shape
).map( ( row ) => row.base );

/** The hover lift is a length in px, at most the ceiling `includes/helpers-hover-lift.php` clamps to (SGS_HOVER_LIFT_MAX_PX). */
const HOVER_LIFT_UNITS = [ 'px' ];
const HOVER_LIFT_MAX_PX = 24;

/**
 * The content alignment choices, sgs/button's own list (its Content alignment control); the empty choice means unset.
 *
 * @param {string} tier The device being edited.
 * @return {Array<{label:string,value:string}>} Select options.
 */
const contentAlignOptions = ( tier ) => [
	{
		label:
			'desktop' === tier
				? __( 'Centre (default)', 'sgs-blocks' )
				: __( '— inherit —', 'sgs-blocks' ),
		value: '',
	},
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{
		label: __( 'Spread (label and price at opposite ends)', 'sgs-blocks' ),
		value: 'space-between',
	},
];

const POSITION_OPTIONS = ( tier ) => [
	{
		label:
			'desktop' === tier
				? __( 'In the layout (the part decides)', 'sgs-blocks' )
				: __( '— inherit —', 'sgs-blocks' ),
		value: '',
	},
	{ label: __( 'In the flow, no offsets', 'sgs-blocks' ), value: 'static' },
	{ label: __( 'In the flow, shifted', 'sgs-blocks' ), value: 'relative' },
	{
		label: __( 'Out of the flow, placed by its edges', 'sgs-blocks' ),
		value: 'absolute',
	},
];

/** The edge offsets of the `float` group: [ registry base, label ]. */
const FLOAT_EDGES = [
	[ 'InsetTop', __( 'Top offset', 'sgs-blocks' ) ],
	[ 'InsetRight', __( 'Right offset', 'sgs-blocks' ) ],
	[ 'InsetBottom', __( 'Bottom offset', 'sgs-blocks' ) ],
	[ 'InsetLeft', __( 'Left offset', 'sgs-blocks' ) ],
];

const TYPOGRAPHY_TARGET = {
	fontSizePresets: true,
	showFontFamily: true,
	showDecoration: true,
	showTransform: true,
	showLetterSpacing: true,
};

/**
 * @param {Object}   props
 * @param {Object}   props.attributes      Block attributes.
 * @param {Function} props.setAttributes   Block `setAttributes`.
 * @param {string}   props.blockName       Block name, for the padding's declared defaults.
 * @param {string}   props.prefix          The button's attribute prefix.
 * @param {string}   props.label           Panel title.
 * @param {string[]} [props.groups]        Declared groups; omitted means every group except `gradient`.
 * @param {Function} [props.seedForPreset] Optional: the preset slug just picked in, further attributes out, written in the same step.
 * @param {boolean}  [props.colourInMainPanel=false] True when the block draws this button's colour rows in its own main Colour panel
 *                                         (`builtinButtonColourRows`), so the kit draws none; false keeps them in the kit's own panel.
 * @param {*}        [props.children] Extra rows the block adds to the end of the button's Styles panel, before its Text style.
 * @return {JSX.Element|null} The panels.
 */
export default function BuiltinButtonPanelBody( {
	attributes,
	setAttributes,
	blockName,
	prefix,
	label,
	groups,
	seedForPreset,
	colourInMainPanel = false,
	children,
} ) {
	const shown =
		Array.isArray( groups ) && groups.length ? groups : DEFAULT_GROUPS;
	const has = ( group ) => shown.includes( group );

	/**
	 * The attribute name for a registry base.
	 *
	 * @param {string} base Registry base, for example 'ColourBackground'.
	 * @return {string} `prefix + base`.
	 */
	const attr = ( base ) => {
		if ( ! BASES.has( base ) ) {
			throw new Error(
				`BuiltinButtonPanel: "${ base }" is not in button-kit/registry.json`
			);
		}
		return builtinButtonAttrName( prefix, base );
	};
	const write = ( base, value ) =>
		setAttributes( { [ attr( base ) ]: value || undefined } );
	const gradient = has( 'gradient' );

	// The colour rows (Background, Text, and Border when no border control is declared) come from `./colour-rows.js`: a block
	// with 12 or fewer base colours draws them in its one main Colour panel, and any other block gets them in the kit's own
	// Colour panel below.
	const colourRows = colourInMainPanel
		? []
		: buttonKitColourRows( { attributes, setAttributes, prefix, label, groups } );

	const borderColourState = ( key, stateLabel, base, gradientBase ) => ( {
		key,
		label: stateLabel,
		value: attributes[ attr( base ) ],
		onChange: ( val ) => setAttributes( { [ attr( base ) ]: val ?? '' } ),
		linked: true,
		...( gradient
			? {
					gradientValue: attributes[ attr( gradientBase ) ],
					onGradientChange: ( val ) =>
						setAttributes( {
							[ attr( gradientBase ) ]: val ?? '',
						} ),
			  }
			: {} ),
	} );

	const radius = attributes[ attr( 'BorderRadius' ) ];

	// Typography reads each size-like value's shape from what is stored, and a generated attribute is absent until set:
	// an empty object stands in, so the controls write `{desktop,tablet,mobile}` objects.
	const typographyAttributes = { ...attributes };
	TIER_TYPOGRAPHY_BASES.forEach( ( base ) => {
		typographyAttributes[ attr( base ) ] = attributes[ attr( base ) ] ?? {};
	} );

	return (
		<>
			<KitColourPanel rows={ colourRows } />
			<InspectorControls group="styles">
				<PanelBody title={ label } initialOpen={ false }>
					{ has( 'preset' ) && (
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Button style', 'sgs-blocks' ) }
							value={ attributes[ attr( 'Style' ) ] ?? '' }
							options={ [
								{
									label: __( 'Block default', 'sgs-blocks' ),
									value: '',
								},
								...presetOptions( {
									primary: __( 'Primary', 'sgs-blocks' ),
									secondary: __( 'Secondary', 'sgs-blocks' ),
									outline: __( 'Outline', 'sgs-blocks' ),
								} ),
							] }
							onChange={ ( value ) =>
								setAttributes( {
									[ attr( 'Style' ) ]: value,
									...( seedForPreset
										? seedForPreset( value )
										: {} ),
								} )
							}
						/>
					) }
					{ has( 'width' ) && (
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Width', 'sgs-blocks' ) }
							value={ attributes[ attr( 'WidthType' ) ] ?? '' }
							options={ [
								{
									label: __( 'Block default', 'sgs-blocks' ),
									value: '',
								},
								{
									label: __(
										'Fit to the text',
										'sgs-blocks'
									),
									value: 'fit',
								},
								{
									label: __( 'Full width', 'sgs-blocks' ),
									value: 'full',
								},
							] }
							onChange={ ( value ) =>
								write( 'WidthType', value )
							}
						/>
					) }
					{ has( 'size' ) && (
						<ResponsiveOverride
							label={ __( 'Size', 'sgs-blocks' ) }
							value={ attributes[ attr( 'Size' ) ] }
							onChange={ ( obj ) =>
								setAttributes( { [ attr( 'Size' ) ]: obj } )
							}
						>
							{ ( {
								ownValue,
								effectiveValue,
								inherited,
								setOwnValue,
							} ) => (
								<SgsLengthControl
									presets
									label={ __( 'Size', 'sgs-blocks' ) }
									hideLabelFromVision
									value={ ownValue ?? '' }
									placeholder={
										inherited ? effectiveValue : ''
									}
									onChange={ ( val ) =>
										setOwnValue( val || undefined )
									}
								/>
							) }
						</ResponsiveOverride>
					) }
					{ has( 'minHeight' ) && (
						<ResponsiveOverride
							label={ __( 'Minimum height', 'sgs-blocks' ) }
							value={ attributes[ attr( 'MinHeight' ) ] }
							onChange={ ( obj ) =>
								setAttributes( {
									[ attr( 'MinHeight' ) ]: obj,
								} )
							}
						>
							{ ( {
								ownValue,
								effectiveValue,
								inherited,
								setOwnValue,
							} ) => (
								<SgsLengthControl
									presets
									label={ __(
										'Minimum height',
										'sgs-blocks'
									) }
									hideLabelFromVision
									value={ ownValue ?? '' }
									placeholder={
										inherited ? effectiveValue : ''
									}
									onChange={ ( val ) =>
										setOwnValue( val || undefined )
									}
								/>
							) }
						</ResponsiveOverride>
					) }
					{ has( 'contentAlign' ) && (
						<ResponsiveOverride
							label={ __( 'Content alignment', 'sgs-blocks' ) }
							value={ attributes[ attr( 'ContentAlign' ) ] }
							onChange={ ( obj ) =>
								setAttributes( {
									[ attr( 'ContentAlign' ) ]: obj,
								} )
							}
						>
							{ ( { tier, ownValue, setOwnValue } ) => (
								<SelectControl
									value={ ownValue || '' }
									options={ contentAlignOptions( tier ) }
									onChange={ ( val ) =>
										setOwnValue( val || undefined )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</ResponsiveOverride>
					) }
					{ has( 'float' ) && (
						<ResponsiveOverride
							label={ __( 'Position', 'sgs-blocks' ) }
							value={ attributes[ attr( 'Position' ) ] }
							onChange={ ( obj ) =>
								setAttributes( { [ attr( 'Position' ) ]: obj } )
							}
						>
							{ ( { tier, ownValue, setOwnValue } ) => (
								<SelectControl
									value={ ownValue || '' }
									options={ POSITION_OPTIONS( tier ) }
									onChange={ ( val ) =>
										setOwnValue( val || undefined )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</ResponsiveOverride>
					) }
					{ has( 'float' ) &&
						FLOAT_EDGES.map( ( [ base, label ] ) => (
							<ResponsiveOverride
								key={ base }
								label={ label }
								value={ attributes[ attr( base ) ] }
								onChange={ ( obj ) =>
									setAttributes( { [ attr( base ) ]: obj } )
								}
							>
								{ ( {
									ownValue,
									effectiveValue,
									inherited,
									setOwnValue,
								} ) => (
									<SgsLengthControl
										presets={ false }
										label={ label }
										hideLabelFromVision
										value={ ownValue ?? '' }
										placeholder={
											inherited ? effectiveValue : ''
										}
										onChange={ ( val ) =>
											setOwnValue( val || undefined )
										}
									/>
								) }
							</ResponsiveOverride>
						) ) }
					{ has( 'padding' ) && (
						<ResponsiveOverride
							label={ __( 'Padding', 'sgs-blocks' ) }
							value={ attributes[ attr( 'Padding' ) ] }
							onChange={ ( obj ) =>
								setAttributes( { [ attr( 'Padding' ) ]: obj } )
							}
						>
							{ ( { ownValue, setOwnValue } ) => (
								<SgsBoxControl
									label={ __( 'Padding', 'sgs-blocks' ) }
									values={
										ownValue && 'object' === typeof ownValue
											? ownValue
											: {}
									}
									units={ BOX_UNITS }
									presets
									defaults={ spacingDefaultsFor(
										blockName,
										attr( 'Padding' )
									) }
									onChange={ ( next ) =>
										setOwnValue(
											normaliseResponsiveBox( next )
										)
									}
								/>
							) }
						</ResponsiveOverride>
					) }
					{ has( 'border' ) && (
						<SgsBorderControl
							widthValues={
								attributes[ attr( 'BorderWidth' ) ] ?? {}
							}
							onWidthChange={ ( next ) =>
								setAttributes( {
									[ attr( 'BorderWidth' ) ]: next,
								} )
							}
							styleValue={ attributes[ attr( 'BorderStyle' ) ] }
							onStyleChange={ ( val ) =>
								write( 'BorderStyle', val )
							}
							showColour={ has( 'colour' ) }
							colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
							colourStates={ [
								borderColourState(
									'normal',
									__( 'Normal', 'sgs-blocks' ),
									'ColourBorder',
									'ColourBorderGradient'
								),
								borderColourState(
									'hover',
									__( 'Hover', 'sgs-blocks' ),
									'ColourBorderHover',
									'ColourBorderHoverGradient'
								),
							] }
							radiusValues={ {
								base: radius?.desktop ?? {},
								tablet: radius?.tablet ?? {},
								mobile: radius?.mobile ?? {},
							} }
							onRadiusChange={ ( tier, next ) => {
								const key = 'base' === tier ? 'desktop' : tier;
								setAttributes( {
									[ attr( 'BorderRadius' ) ]: {
										...radius,
										[ key ]: next,
									},
								} );
							} }
						/>
					) }
					{ has( 'shadow' ) && (
						<ShadowControl
							label={ __( 'Button shadow', 'sgs-blocks' ) }
							attributes={ attributes }
							setAttributes={ setAttributes }
							attrNames={ {
								base: attr( 'Shadow' ),
								colour: attr( 'ShadowColour' ),
								hover: attr( 'ShadowHover' ),
								hoverColour: attr( 'ShadowColourHover' ),
							} }
							// A block that declares `{prefix}ShadowLiftOnHover` (the buy box's Add to Cart) gets its switch here too.
							liftPrefix={ prefix }
						/>
					) }
					{ has( 'hoverLift' ) && (
						<SgsLengthControl
							label={ __( 'Hover lift', 'sgs-blocks' ) }
							help={ __(
								'How far the button moves up on hover, in place of any lift the site sets. 0 keeps it still. Empty keeps whatever the site sets.',
								'sgs-blocks'
							) }
							presets={ false }
							units={ HOVER_LIFT_UNITS }
							max={ HOVER_LIFT_MAX_PX }
							value={
								attributes[ attr( 'HoverLiftDistance' ) ] ?? ''
							}
							onChange={ ( val ) =>
								write( 'HoverLiftDistance', val )
							}
						/>
					) }
					{ children }
					{ has( 'typography' ) && (
						<PanelBody
							title={ __( 'Text style', 'sgs-blocks' ) }
							initialOpen={ false }
						>
							<TypographyControls
								attributes={ typographyAttributes }
								setAttributes={ setAttributes }
								prefix={ prefix }
								{ ...TYPOGRAPHY_TARGET }
							/>
						</PanelBody>
					) }
				</PanelBody>
			</InspectorControls>
		</>
	);
}
