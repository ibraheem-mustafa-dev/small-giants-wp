import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<InspectorControls>
				<PanelBody>
					<p>none</p>
				</PanelBody>
			</InspectorControls>
			<div { ...useBlockProps( { style: { color: attributes.textColour } } ) }>x</div>
		</>
	);
}
