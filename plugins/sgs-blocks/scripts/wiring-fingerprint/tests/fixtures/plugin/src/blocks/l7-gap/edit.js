import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<TextControl value={ attributes.textColour } onChange={ ( v ) => setAttributes( { textColour: v } ) } />
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { style: { '--sgs-l7-other': attributes.textColour } } ) }>x</div>
		</>
	);
}
