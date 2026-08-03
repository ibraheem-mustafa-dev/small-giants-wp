import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// NEGATIVE CONTROL: exactly one InspectorControls panel. Nothing to split, so
// the absence of a group prop is not a violation. Must NOT be flagged.
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Settings">
				<TextControl label="Label" value="" onChange={ () => {} } />
			</PanelBody>
		</InspectorControls>
	);
}
