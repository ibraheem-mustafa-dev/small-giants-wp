import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

export default function Edit( { attributes } ) {
	const { titleColour, titleFontSize } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Title">
				<div>{ titleColour }</div>
				<div>{ titleFontSize }</div>
			</PanelBody>
		</InspectorControls>
	);
}
