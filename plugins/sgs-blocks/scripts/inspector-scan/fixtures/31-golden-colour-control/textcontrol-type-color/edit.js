import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// A raw browser colour input bypasses the theme token palette entirely
// (golden-controls.json controls.colour.bannedLookalikes.patterns).
export default function Edit( { attributes, setAttributes } ) {
	const { myColour } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Colour">
				<TextControl
					type="color"
					label="Colour"
					value={ myColour }
					onChange={ ( val ) => setAttributes( { myColour: val } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
