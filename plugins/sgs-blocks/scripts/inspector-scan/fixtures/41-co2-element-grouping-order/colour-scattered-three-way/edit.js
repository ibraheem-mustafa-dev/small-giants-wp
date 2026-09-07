import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import SgsColourPanel from '../../../../src/components/SgsColourPanel';

// NEGATIVE CONTROL for the colour-row exemption: a genuine 3-way scatter —
// colour lives in the shared SgsColourPanel row, but the title's OTHER
// controls are split across TWO separate panels (Typography + Border), not
// one. The exemption only forgives colour-row + ONE other panel, so this
// must still be flagged — proving the exemption doesn't overmatch. Uses a
// real control-binding shape (`value={ x } onChange={...}`), not a bare
// text-display `<div>{ x }</div>` — see scattered-element/edit.js for why.
export default function Edit( { attributes, setAttributes } ) {
	const { titleColour, titleSize, titleBorder } = attributes;
	return (
		<InspectorControls>
			<SgsColourPanel
				rows={ [
					{ key: 'title', label: 'Title', states: [ { value: titleColour } ] },
				] }
			/>
			<PanelBody title="Typography">
				<TextControl value={ titleSize } onChange={ ( v ) => setAttributes( { titleSize: v } ) } />
			</PanelBody>
			<PanelBody title="Border">
				<TextControl value={ titleBorder } onChange={ ( v ) => setAttributes( { titleBorder: v } ) } />
			</PanelBody>
		</InspectorControls>
	);
}
