import { InspectorControls, InspectorAdvancedControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl, TextareaControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// CONFORMANT: the block's own advanced-ish control is routed through the
// real, structurally-last InspectorAdvancedControls slot, not a lookalike
// PanelBody. Must NOT be flagged.
export default function Edit() {
	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Content', 'sgs-blocks' ) }>
					<ToggleControl label="Show label" checked={ true } onChange={ () => {} } />
				</PanelBody>
			</InspectorControls>
			<InspectorAdvancedControls>
				<TextareaControl label="Extra notes" value="" onChange={ () => {} } />
			</InspectorAdvancedControls>
		</>
	);
}
