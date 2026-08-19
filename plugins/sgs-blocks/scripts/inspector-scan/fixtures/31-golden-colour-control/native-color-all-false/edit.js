import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// golden-controls.json controls.colour.nativeUi.conformantShape: "declared
// with every sub-flag false (keeps __experimentalSkipSerialization while
// suppressing core's UI)". Must not be flagged — this is the correct shape.
export default function Edit( { attributes, setAttributes } ) {
	const { label } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Content">
				<TextControl
					label="Label"
					value={ label }
					onChange={ ( value ) => setAttributes( { label: value } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		</InspectorControls>
	);
}
