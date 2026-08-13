import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

// This block used to render <SgsLinkControl> here, migrated to
// LinkPopoverField 2026-08-13 — the old name is only prose now.
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Link" />
		</InspectorControls>
	);
}
