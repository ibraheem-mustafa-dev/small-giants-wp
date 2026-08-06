import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { linkUrl } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Link">
				<TextControl
					label="Link URL"
					value={ linkUrl }
					onChange={ ( value ) => setAttributes( { linkUrl: value } ) }
					type="url"
				/>
			</PanelBody>
		</InspectorControls>
	);
}
