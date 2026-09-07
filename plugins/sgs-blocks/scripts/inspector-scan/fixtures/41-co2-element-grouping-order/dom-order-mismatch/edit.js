import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// Uses a real control-binding shape (`value={ x } onChange={...}`), not a
// bare text-display `<div>{ x }</div>` — see scattered-element/edit.js for why.
export default function Edit( { attributes, setAttributes } ) {
	const { firstA, firstB, secondA, secondB } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Second">
				<TextControl value={ secondA } onChange={ ( v ) => setAttributes( { secondA: v } ) } />
				<TextControl value={ secondB } onChange={ ( v ) => setAttributes( { secondB: v } ) } />
			</PanelBody>
			<PanelBody title="First">
				<TextControl value={ firstA } onChange={ ( v ) => setAttributes( { firstA: v } ) } />
				<TextControl value={ firstB } onChange={ ( v ) => setAttributes( { firstB: v } ) } />
			</PanelBody>
		</InspectorControls>
	);
}
