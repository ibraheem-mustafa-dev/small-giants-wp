import {
	__ } from '@wordpress/i18n';
import { useBlockProps,
	InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	CheckboxControl,
	NumberControl,
} from '@wordpress/components';

const LOOKUP_PROVIDERS = [
	{ label: __( 'getaddress.io', 'sgs-blocks' ), value: 'getaddress.io' },
	{
		label: __( 'Ideal Postcodes', 'sgs-blocks' ),
		value: 'ideal-postcodes',
	},
];

const ADDRESS_FIELDS = [
	{ label: __( 'Address line 1', 'sgs-blocks' ), value: 'line1' },
	{ label: __( 'Address line 2', 'sgs-blocks' ), value: 'line2' },
	{ label: __( 'City', 'sgs-blocks' ), value: 'city' },
	{ label: __( 'County', 'sgs-blocks' ), value: 'county' },
	{ label: __( 'Postcode', 'sgs-blocks' ), value: 'postcode' },
	{ label: __( 'Country', 'sgs-blocks' ), value: 'country' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		fieldName,
		label,
		required,
		enableLookup,
		lookupProvider,
		fields,
		minLength,
		maxLength,
		pattern,
		customError,
	} = attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--address',
		'sgs-form-field--full',
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const toggleField = ( fieldValue ) => {
		const newFields = fields.includes( fieldValue )
			? fields.filter( ( f ) => f !== fieldValue )
			: [ ...fields, fieldValue ];
		setAttributes( { fields: newFields } );
	};

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
					<TextControl
						label={ __( 'Label', 'sgs-blocks' ) }
						value={ label }
						onChange={ ( val ) => setAttributes( { label: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Required', 'sgs-blocks' ) }
						checked={ required }
						onChange={ ( val ) =>
							setAttributes( { required: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Postcode Lookup', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Enable postcode lookup', 'sgs-blocks' ) }
						checked={ enableLookup }
						onChange={ ( val ) =>
							setAttributes( { enableLookup: val } )
						}
						help={ __(
							'Auto-complete address from postcode',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					{ enableLookup && (
						<SelectControl
							label={ __( 'Lookup provider', 'sgs-blocks' ) }
							value={ lookupProvider }
							options={ LOOKUP_PROVIDERS }
							onChange={ ( val ) =>
								setAttributes( { lookupProvider: val } )
							}
							help={ __(
								'API key configured in plugin settings',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>
				<PanelBody
					title={ __( 'Address Fields', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p>
						{ __(
							'Select which address fields to show:',
							'sgs-blocks'
						) }
					</p>
					{ ADDRESS_FIELDS.map( ( field ) => (
						<CheckboxControl
							key={ field.value }
							label={ field.label }
							checked={ fields.includes( field.value ) }
							onChange={ () => toggleField( field.value ) }
							__nextHasNoMarginBottom
						/>
					) ) }
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
				{ label && (
					<label className="sgs-form-field__label">
						{ label }
						{ required && (
							<span className="sgs-form-field__required">
								*
							</span>
						) }
					</label>
				) }
				<div className="sgs-form-field__address-fields">
					{ enableLookup && fields.includes( 'postcode' ) && (
						<div className="sgs-form-field__address-lookup">
							<input
								type="text"
								className="sgs-form-field__input"
								placeholder={ __(
									'Enter postcode',
									'sgs-blocks'
								) }
								disabled
							/>
							<button
								type="button"
								className="sgs-form-field__lookup-button"
								disabled
							>
								{ __( 'Find Address', 'sgs-blocks' ) }
							</button>
						</div>
					) }
					{ fields.includes( 'line1' ) && (
						<input
							type="text"
							className="sgs-form-field__input"
							placeholder={ __(
								'Address line 1',
								'sgs-blocks'
							) }
							disabled
						/>
					) }
					{ fields.includes( 'line2' ) && (
						<input
							type="text"
							className="sgs-form-field__input"
							placeholder={ __(
								'Address line 2',
								'sgs-blocks'
							) }
							disabled
						/>
					) }
					<div className="sgs-form-field__address-row">
						{ fields.includes( 'city' ) && (
							<input
								type="text"
								className="sgs-form-field__input"
								placeholder={ __( 'City', 'sgs-blocks' ) }
								disabled
							/>
						) }
						{ fields.includes( 'county' ) && (
							<input
								type="text"
								className="sgs-form-field__input"
								placeholder={ __( 'County', 'sgs-blocks' ) }
								disabled
							/>
						) }
					</div>
					{ fields.includes( 'postcode' ) && ! enableLookup && (
						<input
							type="text"
							className="sgs-form-field__input"
							placeholder={ __( 'Postcode', 'sgs-blocks' ) }
							disabled
						/>
					) }
					{ fields.includes( 'country' ) && (
						<input
							type="text"
							className="sgs-form-field__input"
							placeholder={ __( 'Country', 'sgs-blocks' ) }
							disabled
						/>
					) }
				</div>
			</div>
		</>
	);
}
