import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import SgsColourPanel from '../../../../src/components/SgsColourPanel';

// NEGATIVE CONTROL for the colour-row exemption: a genuine 3-way scatter —
// colour lives in the shared SgsColourPanel row, but the title's OTHER
// controls are split across TWO separate panels (Typography + Border), not
// one. The exemption only forgives colour-row + ONE other panel, so this
// must still be flagged — proving the exemption doesn't overmatch.
export default function Edit( { attributes } ) {
	const { titleColour, titleSize, titleBorder } = attributes;
	return (
		<InspectorControls>
			<SgsColourPanel
				rows={ [
					{ key: 'title', label: 'Title', states: [ { value: titleColour } ] },
				] }
			/>
			<PanelBody title="Typography">
				<div>{ titleSize }</div>
			</PanelBody>
			<PanelBody title="Border">
				<div>{ titleBorder }</div>
			</PanelBody>
		</InspectorControls>
	);
}
