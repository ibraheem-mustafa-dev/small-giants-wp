import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<TextControl value={ attributes.padding } onChange={ ( v ) => setAttributes( { padding: v } ) } />
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { style: { padding: attributes.padding?.desktop } } ) }>x</div>
		</>
	);
}
