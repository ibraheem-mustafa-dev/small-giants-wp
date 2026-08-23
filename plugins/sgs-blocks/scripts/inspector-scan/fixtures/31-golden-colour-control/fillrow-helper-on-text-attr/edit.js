import { InspectorControls } from '@wordpress/block-editor';
import { SgsColourPanel, fillRow } from '../../components';

// THE NEGATIVE CONTROL for the describeRow() gradientCapable fix.
//
// Teaching describeRow() to report gradientCapable for a helper row risks the
// opposite error: reporting it for EVERY helper, which would silently accept a
// fill-shaped gradient on a text attribute and blind the mechanism axis. Only
// textRow sets gradientCapable (textRow.js:78); fillRow and borderRow never do
// (borderRow.js:18 states it outright).
//
// So this fixture is byte-identical to textrow-helper-gradient except for the
// helper name, and it MUST still flag: a per-state gradientValue toggle paints a
// gradient BEHIND the text rather than clipping the glyphs, which is precisely
// the defect gradientPathMatchesMechanism() exists to catch. If this ever stops
// flagging, the fix has over-matched.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls group="styles">
			<SgsColourPanel
				rows={ [
					fillRow( {
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
