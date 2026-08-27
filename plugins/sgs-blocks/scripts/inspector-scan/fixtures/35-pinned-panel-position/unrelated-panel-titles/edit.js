import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// CONFORMANT: neither panel title collides with a pinned name. Must NOT
// be flagged — also proves the rule isn't matching on "PanelBody" alone.
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title={ __( 'Content', 'sgs-blocks' ) }>
				<ToggleControl label="Show label" checked={ true } onChange={ () => {} } />
			</PanelBody>
			<PanelBody title="Advanced options for spacing">
				<ToggleControl label="Custom gap" checked={ false } onChange={ () => {} } />
			</PanelBody>
		</InspectorControls>
	);
}
