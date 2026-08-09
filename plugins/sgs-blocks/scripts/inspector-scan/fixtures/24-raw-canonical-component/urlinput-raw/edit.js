import { InspectorControls, URLInput } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { url } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Link">
				<URLInput
					value={ url }
					onChange={ ( value ) => setAttributes( { url: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
