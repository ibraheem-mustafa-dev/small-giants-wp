import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import SgsColourPanel from '../../../../src/components/SgsColourPanel';

// POSITIVE CONTROL for the D533/D537/D618/D609/D622 colour-row exemption:
// the icon's colour lives as ONE row inside the shared SgsColourPanel, and
// its non-colour control (size) lives in the icon's own panel. This is the
// framework's documented two-mechanism model (nav-menu/edit.js,
// trust-bar/edit.js) — NOT scattering — and must NOT be flagged.
export default function Edit( { attributes } ) {
	const { iconColour, iconSize } = attributes;
	return (
		<InspectorControls>
			<SgsColourPanel
				rows={ [
					{ key: 'icon', label: 'Icon', states: [ { value: iconColour } ] },
				] }
			/>
			<PanelBody title="Icon">
				<div>{ iconSize }</div>
			</PanelBody>
		</InspectorControls>
	);
}
