import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ColorPalette } from '@wordpress/components';

// The contract bans this component outright (golden-controls.json
// controls.colour.bannedLookalikes.jsxComponents) — the canonical wrapper is
// DesignTokenPicker, never a raw core ColorPalette.
export default function Edit( { attributes, setAttributes } ) {
	const { myColour } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Colour">
				<ColorPalette
					value={ myColour }
					onChange={ ( val ) => setAttributes( { myColour: val ?? '' } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
