import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';

// TIER 2 (isWrapper: true) — Colour and Border are DELIBERATELY separate
// property-family panels for a wrapper element. This must NOT be flagged as
// CO-2 scattering (that is the exact false-positive class that got
// scattered-element-controls.js deleted 2026-09-02).
export default function Edit( { attributes } ) {
	const { backgroundColour, borderColour } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Colour">
				<div>{ backgroundColour }</div>
			</PanelBody>
			<PanelBody title="Border">
				<div>{ borderColour }</div>
			</PanelBody>
		</InspectorControls>
	);
}
