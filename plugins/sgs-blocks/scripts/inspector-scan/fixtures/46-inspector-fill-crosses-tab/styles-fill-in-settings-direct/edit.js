import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Box">
				<InspectorControls group="styles">
					<TextControl label="Tint" value={ attributes.tint } onChange={ ( tint ) => setAttributes( { tint } ) } />
				</InspectorControls>
			</PanelBody>
		</InspectorControls>
	);
}
