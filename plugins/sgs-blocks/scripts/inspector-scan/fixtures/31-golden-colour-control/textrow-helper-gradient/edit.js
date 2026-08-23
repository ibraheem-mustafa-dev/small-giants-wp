import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel, textRow } from '../../components';

// The HELPER form of fixtures/31-golden-colour-control/gradient-capable-text-row.
// That fixture pins the LITERAL shape (`gradientCapable: true` written out in the
// row object); this one pins the same contract expressed through textRow(), which
// sets gradientCapable itself (textRow.js:78) and is therefore invisible to a
// static reader that does not model the helper's return value.
//
// This fixture exists because that gap was live: describeRow() reported only
// `hasGradient` for a helper row and rule 31's call site passed a hardcoded
// `gradientCapable: false`, so EVERY gradient-bearing textRow on a resolved text
// attribute was reported `mechanism-mismatch`. It went unnoticed because the sole
// adopter at the time (sgs/nav-drawer) had no css_property in the DB, leaving its
// mechanism unresolved and the branch never taken.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'text',
						label: 'Text colour',
						attrs: {
							base: 'textColour',
							hover: 'textColourHover',
							gradient: 'textColourGradient',
							hoverGradient: 'textColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
		</InspectorControls>
	);
}
