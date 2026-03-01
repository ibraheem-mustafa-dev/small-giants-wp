import {
	__ } from '@wordpress/i18n';
import { useBlockProps,
	InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	ToggleControl,
	SelectControl,
	NumberControl,
} from '@wordpress/components';

const WIDTH_OPTIONS = [
	{ label: __( 'Full width', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Half width', 'sgs-blocks' ), value: 'half' },
	{ label: __( 'One third', 'sgs-blocks' ), value: 'third' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		fieldName,
		label,
		placeholder,
		helpText,
		required,
		width,
		minDate,
		maxDate,
		minLength,
		maxLength,
		pattern,
		customError,
	} = attributes;

	const className = [
		'sgs-form-field',
		'sgs-form-field--date',
		`sgs-form-field--${ width }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

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
					<TextControl
						label={ __( 'Placeholder', 'sgs-blocks' ) }
						value={ placeholder }
						onChange={ ( val ) =>
							setAttributes( { placeholder: val } )
						}
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
					/>
				</PanelBody>
				<PanelBody
					title={ __( 'Date Constraints', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Minimum date', 'sgs-blocks' ) }
						value={ minDate }
						onChange={ ( val ) =>
							setAttributes( { minDate: val } )
						}
						type="date"
						help={ __(
							'Leave blank for no minimum',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Maximum date', 'sgs-blocks' ) }
						value={ maxDate }
						onChange={ ( val ) =>
							setAttributes( { maxDate: val } )
						}
						type="date"
						help={ __(
							'Leave blank for no maximum',
							'sgs-blocks'
						) }
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
				<input
					type="date"
					className="sgs-form-field__input"
					placeholder={ placeholder }
					min={ minDate }
					max={ maxDate }
					disabled
				/>
				{ helpText && (
					<p className="sgs-form-field__help">{ helpText }</p>
				) }
			</div>
		</>
	);
}
