import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, useSettings } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	RangeControl,
} from '@wordpress/components';
import FormFieldAdvancedPanel from '../../components/FormFieldAdvancedPanel';
import { DesignTokenPicker, ResponsiveOverride, SgsLengthControl, SgsBoxControl, BOX_UNITS, normaliseResponsiveBox, resolveColourToken } from '../../components';
import { usePreviewTier, tierLengthPreview, tierBoxLonghands } from '../../utils';
import { fieldLabelClasses, fieldDefaultValue, FieldCounterPreview } from '../../components/form-field-preview';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

import SgsFreeTextField from '../../components/SgsFreeTextField';
import AuthoredText from '../../components/AuthoredText';
const COUNTER_PLACEMENT_OPTIONS = [
	{ label: __( 'Below the box', 'sgs-blocks' ), value: 'below' },
	{ label: __( 'Inside the box, bottom right', 'sgs-blocks' ), value: 'inside' },
];

const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const { fieldName, label, placeholder, helpText, required, width, rows } =
		attributes;

	const [ palette ] = useSettings( 'color.palette' );
	const counterInside = 'inside' === attributes.counterPlacement;
	const counterScope = `sgs-ta-preview-${ clientId }`;
	const counterColour = resolveColourToken( attributes.counterColour, palette );
	const previewTier = usePreviewTier();
	const counterSize = tierLengthPreview( attributes.counterFontSize, previewTier );
	const inputMinHeight = tierLengthPreview( attributes.inputMinHeight, previewTier );
	const inputPaddingCss = Object.entries( tierBoxLonghands( attributes.inputPadding, previewTier, 'padding' ) )
		.map( ( [ prop, val ] ) => `${ prop.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` ) }:${ val }` )
		.join( ';' );
	const counterPreviewCss = [
		inputPaddingCss && `.${ counterScope }.sgs-form-field textarea.sgs-form-field__input{${ inputPaddingCss };}`,
		inputMinHeight && `.${ counterScope }.sgs-form-field textarea.sgs-form-field__input{min-height:${ inputMinHeight };}`,
		attributes.inputLineHeight && `.${ counterScope }.sgs-form-field textarea.sgs-form-field__input{line-height:${ attributes.inputLineHeight };}`,
		counterColour && `.${ counterScope } .sgs-form-field__counter{color:${ counterColour };}`,
		counterSize && `.${ counterScope } .sgs-form-field__counter{font-size:${ counterSize };}`,
	].filter( Boolean ).join( '' );

	const className = [
		'sgs-form-field',
		'sgs-form-field--textarea',
		`sgs-form-field--${ width }`,
		...fieldLabelClasses( attributes ),
		counterInside && attributes.maxLength > 0 && false !== attributes.showCounter ? 'sgs-form-field--counter-inside' : '',
		counterInside && false === attributes.counterReserve ? 'sgs-form-field--counter-unreserved' : '',
		counterScope,
	].filter( Boolean ).join( ' ' );

	const blockProps = useBlockProps( { className } );

	return (
		<>
			<InspectorControls>
				{ /* Outer PanelBody removed 2026-08-13 — it duplicated this
				   ToolsPanel's own "Field settings" title with no
				   initialOpen, so the client saw the same words twice for
				   no collapse benefit (Spec 35 A5 note). */ }
					<ToolsPanel
						label={ __( 'Field settings', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								fieldName: '',
								label: '',
								placeholder: '',
								helpText: '',
								rows: 4,
								required: false,
								width: 'full',
							} )
						}
					>
						<ToolsPanelItem
							label={ __( 'Field name', 'sgs-blocks' ) }
							hasValue={ () => !! fieldName }
							onDeselect={ () => setAttributes( { fieldName: '' } ) }
						>
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
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Label', 'sgs-blocks' ) }
							hasValue={ () => !! label }
							onDeselect={ () => setAttributes( { label: '' } ) }
							isShownByDefault
						>
							<SgsFreeTextField type="rich" noLink
								label={ __( 'Label', 'sgs-blocks' ) }
								value={ label }
								onChange={ ( val ) => setAttributes( { label: val } ) }
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Placeholder', 'sgs-blocks' ) }
							hasValue={ () => !! placeholder }
							onDeselect={ () => setAttributes( { placeholder: '' } ) }
						>
							<TextControl
								label={ __( 'Placeholder', 'sgs-blocks' ) }
								value={ placeholder }
								onChange={ ( val ) =>
									setAttributes( { placeholder: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Help text', 'sgs-blocks' ) }
							hasValue={ () => !! helpText }
							onDeselect={ () => setAttributes( { helpText: '' } ) }
						>
							<TextControl
								label={ __( 'Help text', 'sgs-blocks' ) }
								value={ helpText }
								onChange={ ( val ) =>
									setAttributes( { helpText: val } )
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Rows', 'sgs-blocks' ) }
							hasValue={ () => rows !== 4 }
							onDeselect={ () => setAttributes( { rows: 4 } ) }
						>
							<RangeControl
								label={ __( 'Rows', 'sgs-blocks' ) }
								value={ rows }
								onChange={ ( val ) => setAttributes( { rows: val } ) }
								min={ 2 }
								max={ 10 }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Required', 'sgs-blocks' ) }
							hasValue={ () => required !== false }
							onDeselect={ () => setAttributes( { required: false } ) }
							isShownByDefault
						>
							<ToggleControl
								label={ __( 'Required', 'sgs-blocks' ) }
								checked={ required }
								onChange={ ( val ) =>
									setAttributes( { required: val } )
								}
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Width', 'sgs-blocks' ) }
							hasValue={ () => width !== 'full' }
							onDeselect={ () => setAttributes( { width: 'full' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Width', 'sgs-blocks' ) }
								value={ width }
								options={ WIDTH_OPTIONS }
								onChange={ ( val ) => setAttributes( { width: val } ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={ __( 'Box size and spacing', 'sgs-blocks' ) }
							hasValue={ () => [ 'inputMinHeight', 'inputPadding', 'inputLineHeight' ].some( ( key ) => {
								const value = attributes[ key ];
								return value && 'object' === typeof value ? Object.keys( value ).length > 0 : !! value;
							} ) }
							onDeselect={ () => setAttributes( { inputMinHeight: undefined, inputPadding: undefined, inputLineHeight: undefined } ) }
						>
							<ResponsiveOverride
								label={ __( 'Minimum height', 'sgs-blocks' ) }
								value={ attributes.inputMinHeight }
								onChange={ ( obj ) => setAttributes( { inputMinHeight: obj } ) }
							>
								{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
									<SgsLengthControl
										presets={ false }
										hideLabelFromVision
										label={ __( 'Minimum height', 'sgs-blocks' ) }
										value={ ownValue ?? '' }
										placeholder={ inherited ? effectiveValue : '' }
										onChange={ ( val ) => setOwnValue( val || undefined ) }
									/>
								) }
							</ResponsiveOverride>
							<ResponsiveOverride
								value={ attributes.inputPadding }
								onChange={ ( obj ) => setAttributes( { inputPadding: obj } ) }
							>
								{ ( { ownValue, setOwnValue } ) => (
									<SgsBoxControl
										label={ __( 'Padding', 'sgs-blocks' ) }
										values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
										units={ BOX_UNITS }
										presets
										onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
									/>
								) }
							</ResponsiveOverride>
							<TextControl
								label={ __( 'Line height', 'sgs-blocks' ) }
								value={ attributes.inputLineHeight ?? '' }
								onChange={ ( val ) => setAttributes( { inputLineHeight: val } ) }
								help={ __( 'A number such as 1.5, a length, or normal. Empty inherits. With the counter inside the box, the bottom padding stays as set by the counter.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</ToolsPanelItem>
					</ToolsPanel>
				<FormFieldAdvancedPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					features={ [ 'floatingLabel', 'autocomplete', 'inputmode', 'defaultValue', 'valueFromParam', 'msgRequired', 'msgInvalid', 'maxLength', 'counter', 'msgTooLong' ] }
				/>
				{ attributes.maxLength > 0 && false !== attributes.showCounter && (
					<PanelBody title={ __( 'Character counter', 'sgs-blocks' ) } initialOpen={ false }>
						<SelectControl
							label={ __( 'Counter position', 'sgs-blocks' ) }
							value={ attributes.counterPlacement || 'below' }
							options={ COUNTER_PLACEMENT_OPTIONS }
							onChange={ ( val ) => setAttributes( { counterPlacement: val } ) }
							help={ __( 'Inside keeps the count at the bottom right of the box and leaves room under the typed text.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
						{ 'inside' === attributes.counterPlacement && (
							<ToggleControl
								label={ __( 'Keep room under the text for the counter', 'sgs-blocks' ) }
								checked={ false !== attributes.counterReserve }
								onChange={ ( val ) => setAttributes( { counterReserve: val } ) }
								help={ __( 'Off lets the box padding set the space, so the counter overlays the box.', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
						) }
						<ResponsiveOverride
							label={ __( 'Counter font size', 'sgs-blocks' ) }
							value={ attributes.counterFontSize }
							onChange={ ( obj ) => setAttributes( { counterFontSize: obj } ) }
						>
							{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
								<SgsLengthControl
									scale="font-size"
									presets={ false }
									label={ __( 'Counter font size', 'sgs-blocks' ) }
									hideLabelFromVision
									value={ ownValue ?? '' }
									placeholder={ inherited ? effectiveValue : '' }
									onChange={ ( val ) => setOwnValue( val || undefined ) }
								/>
							) }
						</ResponsiveOverride>
						<DesignTokenPicker
							label={ __( 'Counter colour', 'sgs-blocks' ) }
							value={ attributes.counterColour }
							onChange={ ( val ) => setAttributes( { counterColour: val ?? '' } ) }
							linked
						/>
					</PanelBody>
				) }
			</InspectorControls>

			<div { ...blockProps }>
				{ counterPreviewCss && <style>{ counterPreviewCss }</style> }
				{ label && (
					<label className="sgs-form-field__label">
						<AuthoredText value={ label } />
						{ required && (
							<span className="sgs-form-field__required">
								*
							</span>
						) }
					</label>
				) }
				{ counterInside ? (
					<div className="sgs-form-field__control">
						<textarea
							className="sgs-form-field__input"
							placeholder={ placeholder || ' ' }
							value={ fieldDefaultValue( attributes ) }
							readOnly
							rows={ rows }
							disabled
						/>
						<FieldCounterPreview attributes={ attributes } />
					</div>
				) : (
					<>
						<textarea
							className="sgs-form-field__input"
							placeholder={ placeholder || ' ' }
							value={ fieldDefaultValue( attributes ) }
							readOnly
							rows={ rows }
							disabled
						/>
						<FieldCounterPreview attributes={ attributes } />
					</>
				) }
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
