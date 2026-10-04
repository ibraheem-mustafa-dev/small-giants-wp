import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<TextControl value={ attributes.textColourHover } onChange={ ( v ) => setAttributes( { textColourHover: v } ) } />
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps() }>x</div>
		</>
	);
}
