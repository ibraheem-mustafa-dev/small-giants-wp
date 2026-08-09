import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import DesignTokenPicker from '../../../../../src/components/DesignTokenPicker';

// This block used to render a raw ColorPalette and a raw URLInput directly.
// Both were migrated to DesignTokenPicker / SgsLinkControl. Do not re-add a
// raw ColorPalette, GradientPicker, PanelColorGradientSettings, URLInput or
// LinkControl here — this comment names them all, but none of them appears
// as an actual JSX tag below, so this fixture must not flag.

export default function Edit( { attributes, setAttributes } ) {
	const { colour, label } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Colour">
				<DesignTokenPicker
					label="Colour"
					id="fixture-colour"
					value={ colour }
					onChange={ ( value ) => setAttributes( { colour: value } ) }
				/>
				<TextControl
					label="Label"
					value={ label }
					onChange={ ( value ) => setAttributes( { label: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
