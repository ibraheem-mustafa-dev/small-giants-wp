import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { label } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Content">
				<TextControl
					label="Label"
					value={ label }
					onChange={ ( value ) => setAttributes( { label: value } ) }
					type="text"
				/>
			</PanelBody>
		</InspectorControls>
	);
}
