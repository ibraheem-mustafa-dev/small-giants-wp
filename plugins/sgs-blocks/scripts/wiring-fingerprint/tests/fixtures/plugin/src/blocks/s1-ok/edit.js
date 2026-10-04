import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<TextControl value={ attributes.borderColour } onChange={ ( v ) => setAttributes( { borderColour: v } ) } />
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { style: { '--sgs-s1-border': attributes.borderColour } } ) }>x</div>
		</>
	);
}
