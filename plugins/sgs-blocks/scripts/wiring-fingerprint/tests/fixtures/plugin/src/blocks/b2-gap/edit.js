import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<TextControl value={ attributes.titleFontSize } onChange={ ( v ) => setAttributes( { titleFontSize: v } ) } />
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { style: { fontSize: attributes.fontSize, fontWeight: attributes.fontWeight } } ) }><h2 style={ { fontSize: attributes.titleFontSize } }>t</h2></div>
		</>
	);
}
