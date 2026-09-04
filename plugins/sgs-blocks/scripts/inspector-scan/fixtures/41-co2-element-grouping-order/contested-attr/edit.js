import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

export default function Edit( { attributes } ) {
	const { sharedAttr } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Wrapper">
				<div>{ sharedAttr }</div>
			</PanelBody>
		</InspectorControls>
	);
}
