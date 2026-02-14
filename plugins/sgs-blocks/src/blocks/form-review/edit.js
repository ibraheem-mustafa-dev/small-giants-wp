import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { heading } = attributes;

	const blockProps = useBlockProps( { className: 'sgs-form-review' } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Review Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Heading', 'sgs-blocks' ) }
						value={ heading }
						onChange={ ( val ) =>
							setAttributes( { heading: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<h3 className="sgs-form-review__heading">{ heading }</h3>
				<p className="sgs-form-review__intro">
					{ __(
						'Please check your details below before submitting.',
						'sgs-blocks'
					) }
				</p>
				<div
					className="sgs-form-review__placeholder"
					style={ {
						padding: '24px',
						border: '2px dashed #ccc',
						borderRadius: '8px',
						backgroundColor: '#f9f9f9',
						textAlign: 'center',
						color: '#666',
					} }
				>
					<p>
						{ __(
							'Review step — entered fields will be displayed here on the frontend.',
							'sgs-blocks'
						) }
					</p>
				</div>
			</div>
		</>
	);
}
