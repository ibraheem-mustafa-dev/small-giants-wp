import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { a, b } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Basics">
				<TextControl label="A" value={ a } onChange={ ( v ) => setAttributes( { a: v } ) } />
				<ToggleControl label="B" checked={ b } onChange={ ( v ) => setAttributes( { b: v } ) } />
			</PanelBody>
		</InspectorControls>
	);
}
