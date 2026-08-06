import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ColorPalette } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { colour } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Colour">
				<ColorPalette
					value={ colour }
					onChange={ ( value ) => setAttributes( { colour: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
