import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { shadowSize } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Effects">
				<SelectControl
					label="Hover shadow"
					value={ shadowSize }
					options={ [
						{ label: 'None', value: 'none' },
						{ label: 'Small', value: 'small' },
						{ label: 'Medium', value: 'medium' },
					] }
					onChange={ ( value ) => setAttributes( { shadowSize: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
