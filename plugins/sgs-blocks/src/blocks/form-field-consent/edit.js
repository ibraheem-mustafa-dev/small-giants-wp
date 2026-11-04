import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	SelectControl,
} from '@wordpress/components';
import { SgsBoxControl, SgsLengthControl, BOX_UNITS } from '../../components';
import FormFieldAdvancedPanel from '../../components/FormFieldAdvancedPanel';
import { fieldLabelClasses } from '../../components/form-field-preview';
import { RICH_TEXT_BODY } from '../../utils/rich-text-formats';

const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
];

const CONSENT_TYPE_OPTIONS = [
	{ label: __( 'Terms & Conditions', 'sgs-blocks' ), value: 'terms' },
	{ label: __( 'GDPR / Privacy', 'sgs-blocks' ), value: 'gdpr' },
	{ label: __( 'Marketing', 'sgs-blocks' ), value: 'marketing' },
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const consentScope = `sgs-cn-preview-${ clientId }`;
	const { fieldName, helpText, width, consentType, consentText } =
		attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--consent',
		`sgs-form-field--${ width }`,
		...fieldLabelClasses( attributes ),
	].join( ' ' );

	const blockProps = useBlockProps( { className: `${ className } ${ consentScope }` } );
	const boxSize = attributes.boxSize ? ( /^[\d.]+$/.test( attributes.boxSize ) ? `${ attributes.boxSize }px` : attributes.boxSize ) : '';
	const boxMargin = attributes.boxMargin && 'object' === typeof attributes.boxMargin && Object.keys( attributes.boxMargin ).length
		? [ 'top', 'right', 'bottom', 'left' ].map( ( side ) => attributes.boxMargin[ side ] || '0' ).join( ' ' )
		: '';
	const consentPreviewCss = [
		boxSize && `.${ consentScope } .sgs-form-field__consent input[type="checkbox"]{width:${ boxSize };height:${ boxSize };min-width:${ boxSize };}`,
		boxMargin && `.${ consentScope } .sgs-form-field__consent input[type="checkbox"]{margin:${ boxMargin };}`,
	].filter( Boolean ).join( '' );

	const isRequired = [ 'terms', 'gdpr' ].includes( consentType );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Field Settings', 'sgs-blocks' ) }>
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
					<SelectControl
						label={ __( 'Consent type', 'sgs-blocks' ) }
						value={ consentType }
						options={ CONSENT_TYPE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { consentType: val } )
						}
						help={
							isRequired
								? __(
										'Terms and GDPR are always required',
										'sgs-blocks'
								  )
								: ''
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextareaControl
						label={ __( 'Consent text', 'sgs-blocks' ) }
						value={ consentText }
						onChange={ ( val ) =>
							setAttributes( { consentText: val } )
						}
						rows={ 3 }
						help={ __(
							'Supports HTML for links',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
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
					<SelectControl
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ width }
						options={ WIDTH_OPTIONS }
						onChange={ ( val ) => setAttributes( { width: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Row minimum height', 'sgs-blocks' ) }
						help={ __( 'Empty keeps 44px, the touch-target minimum. Smaller only to match a supplied design.', 'sgs-blocks' ) }
						value={ attributes.optionRowMinHeight ?? '' }
						onChange={ ( val ) => setAttributes( { optionRowMinHeight: val || undefined } ) }
					/>
					<SgsLengthControl
						presets={ false }
						label={ __( 'Tick box size', 'sgs-blocks' ) }
						help={ __( 'Width and height of the box. Empty = 20px.', 'sgs-blocks' ) }
						value={ attributes.boxSize ?? '' }
						onChange={ ( val ) => setAttributes( { boxSize: val || undefined } ) }
					/>
					<SgsBoxControl
						presets
						label={ __( 'Tick box margin', 'sgs-blocks' ) }
						values={ attributes.boxMargin && 'object' === typeof attributes.boxMargin ? attributes.boxMargin : {} }
						units={ BOX_UNITS }
						onChange={ ( next ) => setAttributes( { boxMargin: next } ) }
					/>
				</PanelBody>
				<FormFieldAdvancedPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
					features={ [ 'defaultChecked', 'msgRequired' ] }
				/>
			</InspectorControls>

			<div { ...blockProps }>
				{ consentPreviewCss && <style>{ consentPreviewCss }</style> }
				<label className="sgs-form-field__consent" style={ attributes.optionRowMinHeight ? { minHeight: attributes.optionRowMinHeight } : undefined }>
					<input
						type="checkbox"
						checked={ !! attributes.defaultChecked }
						readOnly
						disabled
					/>
					<RichText
						tagName="span"
						className="sgs-form-field__consent-text"
						value={ consentText }
						onChange={ ( val ) =>
							setAttributes( { consentText: val } )
						}
						placeholder={ __(
							'Enter consent text…',
							'sgs-blocks'
						) }
						allowedFormats={ RICH_TEXT_BODY }
					/>
				</label>
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
