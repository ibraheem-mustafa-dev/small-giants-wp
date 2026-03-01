import {
	__ } from '@wordpress/i18n';
import { useBlockProps,
	InspectorControls } from '@wordpress/block-editor';
import { PanelBody,
	TextControl,
	NumberControl,
} from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const {
		fieldName,
		defaultValue,
		minLength,
		maxLength,
		pattern,
		customError,
	} = attributes;

	const className = [ 'sgs-form-field', 'sgs-form-field--hidden' ].join(
		' '
	);

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
						label={ __( 'Default value', 'sgs-blocks' ) }
						value={ defaultValue }
						onChange={ ( val ) =>
							setAttributes( { defaultValue: val } )
						}
						help={ __(
							'Value to include in submissions',
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
				<div className="sgs-form-field__hidden-preview">
					🔒
					{ fieldName ? (
						<strong>{ fieldName }</strong>
					) : (
						<em>{ __( 'Hidden field', 'sgs-blocks' ) }</em>
					) }
					{ defaultValue && (
						<span className="sgs-form-field__hidden-value">
							= { defaultValue }
						</span>
					) }
				</div>
			</div>
		</>
	);
}
