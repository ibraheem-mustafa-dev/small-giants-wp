import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';

// PLANTED DEFECT: a block-private "Visibility conditions" panel. The real
// pinned one is added universally by src/blocks/extensions/
// conditional-visibility.js, registered last so it lands directly above
// core's structurally-last Advanced slot. A block authoring its own panel
// of this name duplicates the label without the position guarantee.
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Visibility conditions">
				<ToggleControl label="Hide on mobile" checked={ false } onChange={ () => {} } />
			</PanelBody>
		</InspectorControls>
	);
}
