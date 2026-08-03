import { InspectorControls, InspectorAdvancedControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, TextareaControl } from '@wordpress/components';

// NEGATIVE CONTROL: proves the InspectorAdvancedControls exemption actually
// matters, not just that it exists. There are TWO PanelBody-shaped panels in
// this file — one in the normal InspectorControls, one inside
// InspectorAdvancedControls. Without the exemption, panelCount would be 2
// and this would be (wrongly) flagged for having no group prop. With the
// exemption, only the first panel counts (1 < 2), so it is correctly NOT
// flagged — Advanced is already routed, by construction, with no group prop
// needed.
export default function Edit() {
	return (
		<>
			<InspectorControls>
				<PanelBody title="Settings">
					<TextControl label="Label" value="" onChange={ () => {} } />
				</PanelBody>
			</InspectorControls>
			<InspectorAdvancedControls>
				<TextareaControl label="Custom CSS" value="" onChange={ () => {} } />
			</InspectorAdvancedControls>
		</>
	);
}
