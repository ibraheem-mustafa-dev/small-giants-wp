import {
	__ } from '@wordpress/i18n';
import { useBlockProps,
	InspectorControls,
	RichText } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	TextareaControl,
	SelectControl,
	NumberControl,
} from '@wordpress/components';

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

export default function Edit( { attributes, setAttributes } ) {
	const {
		fieldName,
		helpText,
		width,
		consentType,
		consentText,
		minLength,
		maxLength,
		pattern,
		customError,
	} = attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--consent',
		`sgs-form-field--${ width }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

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
					/>
					<SelectControl
						label={ __( 'Width', 'sgs-blocks' ) }
						value={ width }
						options={ WIDTH_OPTIONS }
						onChange={ ( val ) => setAttributes( { width: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			
				<PanelBody
					title={ __( 'Validation', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<NumberControl
						label={ __( 'Min length', 'sgs-blocks' ) }
						value={ minLength }
						onChange={ ( val ) =>
							setAttributes( { minLength: parseInt( val, 10 ) || 0 } )
						}
						min={ 0 }
						help={ __(
							'Minimum characters required (0 = no minimum).',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
					/>
					<NumberControl
						label={ __( 'Max length', 'sgs-blocks' ) }
						value={ maxLength }
						onChange={ ( val ) =>
							setAttributes( { maxLength: parseInt( val, 10 ) || 0 } )
						}
						min={ 0 }
						help={ __(
							'Maximum characters allowed (0 = no limit).',
							'sgs-blocks'
						) }
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Pattern (regex)', 'sgs-blocks' ) }
						value={ pattern }
						onChange={ ( val ) =>
							setAttributes( { pattern: val } )
						}
						help={ __(
							'HTML5 pattern (regex, no delimiters). Leave empty for no check.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Custom error message', 'sgs-blocks' ) }
						value={ customError }
						onChange={ ( val ) =>
							setAttributes( { customError: val } )
						}
						help={ __(
							'Override the default validation error shown to users.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<label className="sgs-form-field__consent">
					<input type="checkbox" disabled />
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
					/>
				</label>
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
