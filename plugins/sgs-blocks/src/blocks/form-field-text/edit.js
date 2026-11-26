import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
} from '@wordpress/components';
import { useSettings } from '@wordpress/block-editor';
import {
	IconPicker,
	IconPreview,
	SgsColourPanel,
	resolveColourToken,
	fillRow,
	SgsBorderControl,
	SgsLengthControl,
	ShadowControl,
	ResponsiveOverride,
} from '../../components';
import {
	backgroundPaintPreview,
	sgsBorderPreview,
	usePreviewTier,
	resolveShadowPreviewComposed,
	sgsLengthPreview,
} from '../../utils';
import { cssLengthValue } from '../../utils/css-length';
import { resolveTier } from '../../utils/responsive';
import FormFieldAdvancedPanel from '../../components/FormFieldAdvancedPanel';
import {
	fieldLabelClasses,
	fieldDefaultValue,
} from '../../components/form-field-preview';

import SgsFreeTextField from '../../components/SgsFreeTextField';
import AuthoredText from '../../components/AuthoredText';
const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
	{ label: __( 'Parent grid decides', 'sgs-blocks' ), value: 'auto' },
];

const MAX_WIDTH_UNITS = [
	{ value: 'px', label: 'px', default: 600 },
	{ value: '%', label: '%', default: 100 },
	{ value: 'rem', label: 'rem', default: 30 },
	{ value: 'em', label: 'em', default: 30 },
	{ value: 'ch', label: 'ch', default: 40 },
];

export default function Edit( { attributes, setAttributes } ) {
	const { fieldName, label, placeholder, helpText, required, width } =
		attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--text',
		`sgs-form-field--${ width }`,
		...fieldLabelClasses( attributes ),
	].join( ' ' );

	const previewTier = usePreviewTier();
	const [ colourPalette ] = useSettings( 'color.palette' );
	const iconSize = sgsLengthPreview( attributes.leadingIconSize );
	// The field's max width for the device being previewed (an unset device keeps the wider one, like the frontend).
	const maxWidthPreview = cssLengthValue(
		resolveTier( attributes.maxWidth, previewTier, '' ).value ?? ''
	);
	const blockProps = useBlockProps( {
		className,
		style:
			iconSize || maxWidthPreview
				? {
						'--sgs-field-icon-size': iconSize || undefined,
						maxWidth: maxWidthPreview || undefined,
				  }
				: undefined,
	} );
	const iconColour = resolveColourToken(
		attributes.leadingIconColour,
		colourPalette
	);
	const radius = attributes.fieldBorderRadius ?? {};
	const inputStyle = {
		...backgroundPaintPreview(
			attributes.fieldBackground,
			'',
			colourPalette
		),
		boxShadow: resolveShadowPreviewComposed(
			attributes.fieldShadow,
			attributes.fieldShadowColour
		),
		...sgsBorderPreview(
			{
				widthValues: attributes.fieldBorderWidth,
				styleValue: attributes.fieldBorderStyle,
				colourValue: attributes.fieldBorderColour,
				radiusValues: radius,
			},
			previewTier,
			colourPalette
		),
	};
	const inputControl = (
		<input
			type="text"
			className="sgs-form-field__input"
			style={ inputStyle }
			placeholder={ placeholder || ' ' }
			value={ fieldDefaultValue( attributes ) }
			readOnly
			disabled
		/>
	);

	return (
		<>
			<InspectorControls>
				<PanelBody initialOpen title={ __( 'Field Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Field name', 'sgs-blocks' ) }
						value={ fieldName }
						onChange={ ( val ) =>
							setAttributes( { fieldName: val } )
						}
						help={ __(
							'Machine name used in submission data',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SgsFreeTextField
						type="rich"
						noLink
						label={ __( 'Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
					/>
					<TextControl
						label={ __( 'Placeholder', 'sgs-blocks' ) }
						value={ placeholder }
						onChange={ ( val ) =>
							setAttributes( { placeholder: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Help text', 'sgs-blocks' ) }
						value={ helpText }
						onChange={ ( val ) =>
							setAttributes( { helpText: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ToggleControl
						label={ __( 'Required', 'sgs-blocks' ) }
						checked={ required }
						onChange={ ( val ) =>
							setAttributes( { required: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ width }
						options={ WIDTH_OPTIONS }
						onChange={ ( val ) => setAttributes( { width: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ResponsiveOverride
						label={ __( 'Max width', 'sgs-blocks' ) }
						value={ attributes.maxWidth }
						onChange={ ( obj ) =>
							setAttributes( { maxWidth: obj } )
						}
					>
						{ ( {
							ownValue,
							effectiveValue,
							inherited,
							setOwnValue,
						} ) => (
							<SgsLengthControl
								label={ __( 'Max width', 'sgs-blocks' ) }
								hideLabelFromVision
								help={ __(
									'Caps the whole field so it can be narrower than its row. Empty fills the row.',
									'sgs-blocks'
								) }
								value={ ownValue || '' }
								placeholder={
									inherited ? effectiveValue || '' : ''
								}
								units={ MAX_WIDTH_UNITS }
								onChange={ ( v ) => setOwnValue( v || '' ) }
								presets={ false }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
				<FormFieldAdvancedPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					features={ [
						'floatingLabel',
						'autocomplete',
						'inputmode',
						'defaultValue',
						'valueFromParam',
						'msgRequired',
						'msgInvalid',
						'maxLength',
						'msgTooLong',
					] }
				/>
				<PanelBody
					title={ __( 'Input style', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SgsBorderControl
						widthValues={ attributes.fieldBorderWidth ?? {} }
						onWidthChange={ ( next ) =>
							setAttributes( { fieldBorderWidth: next } )
						}
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.fieldBorderStyle }
						onStyleChange={ ( val ) =>
							setAttributes( { fieldBorderStyle: val } )
						}
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.fieldBorderColour }
						onColourChange={ ( val ) =>
							setAttributes( { fieldBorderColour: val ?? '' } )
						}
						colourLinked={ true }
						radiusValues={ {
							base: radius.desktop ?? {},
							tablet: radius.tablet ?? {},
							mobile: radius.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( {
								fieldBorderRadius: { ...radius, [ key ]: next },
							} );
						} }
					/>
					<ShadowControl
						label={ __( 'Input shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'fieldShadow',
							colour: 'fieldShadowColour',
						} }
					/>
					<IconPicker
						label={ __( 'Leading icon', 'sgs-blocks' ) }
						sources={ [ 'lucide' ] }
						value={ {
							source: 'lucide',
							name: attributes.leadingIcon || '',
						} }
						onChange={ ( { name } ) =>
							setAttributes( { leadingIcon: name || '' } )
						}
					/>
					{ !! attributes.leadingIcon && (
						<SgsLengthControl
							scale="spacing"
							presets={ false }
							label={ __( 'Leading icon size', 'sgs-blocks' ) }
							value={ attributes.leadingIconSize ?? '' }
							onChange={ ( val ) =>
								setAttributes( { leadingIconSize: val || '' } )
							}
						/>
					) }
				</PanelBody>
			</InspectorControls>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'fieldBackground',
						label: __( 'Input fill', 'sgs-blocks' ),
						attrs: { base: 'fieldBackground' },
						attributes,
						setAttributes,
					} ),
					fillRow( {
						key: 'leadingIconColour',
						label: __( 'Leading icon colour', 'sgs-blocks' ),
						attrs: {
							base: 'leadingIconColour',
							gradient: 'leadingIconColourGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>

			<div { ...blockProps }>
				{ label && (
					<label className="sgs-form-field__label">
						<AuthoredText value={ label } />
						{ required && (
							<span className="sgs-form-field__required">*</span>
						) }
					</label>
				) }
				{ attributes.leadingIcon ? (
					<span className="sgs-form-field__control sgs-form-field__control--has-icon">
						<span
							className="sgs-form-field__leading-icon"
							style={
								iconColour ? { color: iconColour } : undefined
							}
							aria-hidden="true"
						>
							<IconPreview
								source="lucide"
								name={ attributes.leadingIcon }
								gradient={
									attributes.leadingIconColourGradient || ''
								}
							/>
						</span>
						{ inputControl }
					</span>
				) : (
					inputControl
				) }
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
