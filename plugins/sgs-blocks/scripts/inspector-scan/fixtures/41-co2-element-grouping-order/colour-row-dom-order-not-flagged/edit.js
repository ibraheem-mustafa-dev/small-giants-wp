import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import SgsColourPanel from '../../../../src/components/SgsColourPanel';

// NEGATIVE CONTROL for the axis-C colour-row exemption (extended 2026-09-07,
// see the rule's header "AXIS C" section). "headline" owns ONLY colour rows
// (headlineColour + headlineColourHover), both matched inside the shared,
// early-mounted <SgsColourPanel> — its declared `order` (2, see
// _placement-reach.json) is LATER than "meta" (order 1), but the colour
// panel mounts FIRST in this file. Before the axis-C extension, this
// produced a false "headline appears before meta" dom-order-vs-declared-
// order finding, because headline's computed firstPanelIndex pointed at the
// colour panel's early mount position rather than headline's real position.
// After the extension, headline is excluded from axis C's comparison set
// entirely (its earliest matched panel IS SgsColourPanel), so this fixture
// must produce ZERO findings.
export default function Edit( { attributes } ) {
	const { headlineColour, headlineColourHover, metaA, metaB } = attributes;
	return (
		<InspectorControls>
			<SgsColourPanel
				rows={ [
					{
						key: 'headline',
						label: 'Headline',
						states: [ { value: headlineColour }, { value: headlineColourHover, state: 'hover' } ],
					},
				] }
			/>
			<PanelBody title="Meta">
				<div>{ metaA }</div>
				<div>{ metaB }</div>
			</PanelBody>
		</InspectorControls>
	);
}
