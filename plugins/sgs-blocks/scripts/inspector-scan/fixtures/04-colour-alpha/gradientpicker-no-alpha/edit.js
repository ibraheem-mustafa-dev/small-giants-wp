import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, GradientPicker } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { gradient } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Background">
				<GradientPicker
					value={ gradient }
					onChange={ ( value ) => setAttributes( { gradient: value } ) }
					gradients={ [] }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
