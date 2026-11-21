/**
 * The built-in button kit's controls for one declared button.
 *
 * Every attribute name is `prefix + base`, with the bases taken from `registry.json` (the table the generator writes
 * `block.json` attributes from), so a control can never write a name the generator did not create. Only the groups the
 * block declares show. The look controls sit in one Styles panel titled with the button's label; the colour rows go in the
 * shared Colour panel under a heading with the same label.
 *
 * Controls are the shared ones: `SgsColourPanel` rows, `SgsBorderControl`, `SgsBoxControl` and `SgsLengthControl` inside
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
import SgsColourPanel from '../SgsColourPanel';
import SgsLengthControl from '../SgsLengthControl';
import ShadowControl from '../ShadowControl';
import TypographyControls from '../TypographyControls';
import fillRow from '../colour-variants/fillRow';
import { builtinButtonAttrName } from '../BuiltinButtonPanel';
import textRow from '../colour-variants/textRow';
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
const TIER_TYPOGRAPHY_BASES = ROWS
	.filter(
		( row ) =>
			'typography' === row.group && 'tier_object' === row.tier_shape
	)
	.map( ( row ) => row.base );

const TYPOGRAPHY_TARGET = {
	fontSizePresets: true,
	showFontFamily: true,
	showDecoration: true,
	showTransform: true,
	showLetterSpacing: true,
};

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.blockName     Block name, for the padding's declared defaults.
 * @param {string}   props.prefix        The button's attribute prefix.
 * @param {string}   props.label         Panel title.
 * @param {string[]} [props.groups]      Declared groups; omitted means every group except `gradient`.
 * @param {Function} [props.seedForPreset] Optional: the preset slug just picked in, further attributes out, written in the same step.
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

	// The colour panel: background and text rows, normal and hover; gradient rows add the Solid/Gradient choice.
	const colourRows = has( 'colour' )
		? [
				fillRow( {
					key: `${ prefix }-background`,
					label: __( 'Background', 'sgs-blocks' ),
					heading: label,
					attrs: {
						base: attr( 'ColourBackground' ),
						hover: attr( 'ColourBackgroundHover' ),
						...( gradient
							? {
									gradient: attr(
										'ColourBackgroundGradient'
									),
									hoverGradient: attr(
										'ColourBackgroundHoverGradient'
									),
							  }
							: {} ),
					},
					attributes,
					setAttributes,
				} ),
				textRow( {
					key: `${ prefix }-text`,
					label: __( 'Text', 'sgs-blocks' ),
					attrs: {
						base: attr( 'ColourText' ),
						hover: attr( 'ColourTextHover' ),
						...( gradient
							? {
									gradient: attr( 'ColourTextGradient' ),
									hoverGradient: attr(
										'ColourTextHoverGradient'
									),
							  }
							: {} ),
					},
					attributes,
					setAttributes,
				} ),
				// Border colour lives in the border control when the button declares one; otherwise it is a row here.
				! has( 'border' ) &&
					fillRow( {
						key: `${ prefix }-border`,
						label: __( 'Border', 'sgs-blocks' ),
						attrs: {
							base: attr( 'ColourBorder' ),
							hover: attr( 'ColourBorderHover' ),
							...( gradient
								? {
										gradient: attr(
											'ColourBorderGradient'
										),
										hoverGradient: attr(
											'ColourBorderHoverGradient'
										),
								  }
								: {} ),
						},
						attributes,
						setAttributes,
					} ),
		  ]
		: [];

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
			{ colourRows.length > 0 && <SgsColourPanel rows={ colourRows } /> }
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
									...( seedForPreset ? seedForPreset( value ) : {} ),
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
					{ has( 'padding' ) && (
						<ResponsiveOverride
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
