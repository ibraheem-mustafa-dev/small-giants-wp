import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { fieldName, defaultValue } = attributes;

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
