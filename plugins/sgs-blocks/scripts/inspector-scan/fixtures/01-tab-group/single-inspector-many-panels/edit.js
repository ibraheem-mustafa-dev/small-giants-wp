import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, __experimentalToolsPanel as ToolsPanel } from '@wordpress/components';

// PLANTED DEFECT — the DOMINANT real-world shape (measured live 2026-08-03:
// hero, product-card, trust-bar, button all do exactly this). ONE
// InspectorControls wrapping THREE panels, no group prop anywhere. The
// original version of this rule counted InspectorControls elements (1) and
// missed this entirely — this fixture exists specifically so that mistake
// cannot silently return.
export default function Edit() {
	return (
		<InspectorControls>
			<PanelBody title="Content">
				<TextControl label="Heading" value="" onChange={ () => {} } />
			</PanelBody>
			<PanelBody title="Layout">
				<TextControl label="Columns" value="" onChange={ () => {} } />
			</PanelBody>
			<ToolsPanel label="Appearance" resetAll={ () => {} }>
				<TextControl label="Colour" value="" onChange={ () => {} } />
			</ToolsPanel>
		</InspectorControls>
	);
}
