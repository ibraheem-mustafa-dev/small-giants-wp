import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { DesignTokenPicker, fillRow } from '../../components';

// Mirrors the live sgs/process-steps edit.js:324-342 shape EXACTLY (the
// Bean-verified false positive, 2026-09-05): a row descriptor built by
// fillRow() and bound to a local const, then mounted as a STANDALONE
// DesignTokenPicker via `states={ theRow.states }` — a MemberExpression,
// never a literal array. Before the fix this fell through to the legacy
// single-value path and was misreported as 1 state / no gradient despite
// being a genuine 2-state, gradient-on-both row. Must NOT flag either kind.
export default function Edit( { attributes, setAttributes } ) {
	const rowBackgroundRow = fillRow( {
		key: 'rowBackground',
		label: 'Row background colour',
		attrs: {
			base: 'rowBackground',
			hover: 'rowBackgroundHover',
			gradient: 'rowBackgroundGradient',
			hoverGradient: 'rowBackgroundHoverGradient',
		},
		attributes,
		setAttributes,
	} );
	return (
		<InspectorControls group="styles">
			<PanelBody title="Row">
				<DesignTokenPicker
					label={ rowBackgroundRow.label }
					states={ rowBackgroundRow.states }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
