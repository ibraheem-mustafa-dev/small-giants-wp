import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import DesignTokenPicker from '../../../../../src/components/DesignTokenPicker';

export default function Edit( { attributes, setAttributes } ) {
	const { colour } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Colour">
				<DesignTokenPicker
					label="Colour"
					id="fixture-colour"
					value={ colour }
					onChange={ ( value ) => setAttributes( { colour: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
