import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// PLANTED DEFECT: mirrors the real sgs/heading bug (edit.js:541) — a
// bare PanelBody titled "Advanced" inside the default Settings group,
// nowhere near InspectorAdvancedControls. It shadows the pinned-last
// "Advanced" name without actually being pinned last.
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title={ __( 'Content', 'sgs-blocks' ) }>
				<ToggleControl label="Show label" checked={ true } onChange={ () => {} } />
			</PanelBody>

			<PanelBody title={ __( 'Advanced', 'sgs-blocks' ) } initialOpen={ false }>
				<ToggleControl
					label="Inherit style from parent"
					checked={ false }
					onChange={ () => {} }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
