import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<TextControl value={ attributes.cellBackground } onChange={ ( v ) => setAttributes( { cellBackground: v } ) } />
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { style: { background: attributes.cellBackground } } ) }>x</div>
		</>
	);
}
