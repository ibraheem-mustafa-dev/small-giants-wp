import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Text">
				<TextControl
					label="Label"
					value={ attributes.label }
					onChange={ ( val ) => setAttributes( { label: val } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
