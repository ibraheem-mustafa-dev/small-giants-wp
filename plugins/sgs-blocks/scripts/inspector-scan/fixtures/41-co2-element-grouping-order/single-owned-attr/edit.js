import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

export default function Edit( { attributes } ) {
	const { soloAttr } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Solo">
				<div>{ soloAttr }</div>
			</PanelBody>
		</InspectorControls>
	);
}
