import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// Uses a real control-binding shape (`value={ x } onChange={...}`), not a
// bare text-display `<div>{ x }</div>` — the rule's classifyAttrReferences()
// only counts a WRITE occurrence (a genuine bound control) as a real panel
// location, so a positive-control fixture must use a real control shape to
// keep testing "scattered CONTROLS", not "scattered incidental text".
export default function Edit( { attributes, setAttributes } ) {
	const { titleColour, titleFontSize } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Colour">
				<TextControl value={ titleColour } onChange={ ( v ) => setAttributes( { titleColour: v } ) } />
			</PanelBody>
			<PanelBody title="Typography">
				<TextControl value={ titleFontSize } onChange={ ( v ) => setAttributes( { titleFontSize: v } ) } />
			</PanelBody>
		</InspectorControls>
	);
}
