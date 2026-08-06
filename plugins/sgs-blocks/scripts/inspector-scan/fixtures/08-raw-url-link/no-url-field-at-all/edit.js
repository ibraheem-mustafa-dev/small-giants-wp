import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { enabled } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Options">
				<ToggleControl
					label="Enabled"
					checked={ enabled }
					onChange={ ( value ) => setAttributes( { enabled: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
