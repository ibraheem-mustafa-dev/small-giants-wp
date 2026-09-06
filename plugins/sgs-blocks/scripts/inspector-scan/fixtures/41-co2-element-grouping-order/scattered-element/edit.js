import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

export default function Edit( { attributes } ) {
	const { titleColour, titleFontSize } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Colour">
				<div>{ titleColour }</div>
			</PanelBody>
			<PanelBody title="Typography">
				<div>{ titleFontSize }</div>
			</PanelBody>
		</InspectorControls>
	);
}
