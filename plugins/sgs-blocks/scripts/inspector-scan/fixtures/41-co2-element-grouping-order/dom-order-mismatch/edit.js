import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

export default function Edit( { attributes } ) {
	const { firstA, firstB, secondA, secondB } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Second">
				<div>{ secondA }</div>
				<div>{ secondB }</div>
			</PanelBody>
			<PanelBody title="First">
				<div>{ firstA }</div>
				<div>{ firstB }</div>
			</PanelBody>
		</InspectorControls>
	);
}
