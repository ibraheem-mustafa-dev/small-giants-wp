import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// PLANTED DEFECT: two separate InspectorControls panels, neither carrying a
// group prop — Settings/Styles are not routed to the native tab UI.
export default function Edit() {
	return (
		<>
			<InspectorControls>
				<PanelBody title="Behaviour">
					<TextControl label="Label" value="" onChange={ () => {} } />
				</PanelBody>
			</InspectorControls>
			<InspectorControls>
				<PanelBody title="Appearance">
					<TextControl label="Colour" value="" onChange={ () => {} } />
				</PanelBody>
			</InspectorControls>
		</>
	);
}
