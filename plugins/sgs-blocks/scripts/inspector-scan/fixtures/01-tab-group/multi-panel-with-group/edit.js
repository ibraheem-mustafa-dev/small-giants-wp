import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// NEGATIVE CONTROL: two InspectorControls panels, both explicitly routed via
// the group prop. Must NOT be flagged.
export default function Edit() {
	return (
		<>
			<InspectorControls group="settings">
				<PanelBody title="Behaviour">
					<TextControl label="Label" value="" onChange={ () => {} } />
				</PanelBody>
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelBody title="Appearance">
					<TextControl label="Colour" value="" onChange={ () => {} } />
				</PanelBody>
			</InspectorControls>
		</>
	);
}
