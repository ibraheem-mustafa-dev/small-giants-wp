import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<TextControl value={ attributes.gridItemBackground } onChange={ ( v ) => setAttributes( { gridItemBackground: v } ) } />
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { style: { '--sgs-gi-x': attributes.gridItemBackground } } ) }>x</div>
		</>
	);
}
