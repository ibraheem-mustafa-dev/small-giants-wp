import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

export default function Edit( { attributes } ) {
	const { someAttr } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Colour">
				<div>{ someAttr }</div>
			</PanelBody>
			<PanelBody title="Typography">
				<div>{ someAttr }</div>
			</PanelBody>
		</InspectorControls>
	);
}
