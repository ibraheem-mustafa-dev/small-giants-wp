import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { DesignTokenPicker, fillRow } from '../../components';

// NEGATIVE CONTROL for standalone-descriptor-row-conformant — byte-identical
// shape, but fillRow()'s attrs carry NO hover key, so the helper genuinely
// returns a 1-state row (states: [normal] only — fillRow.js:188 `hover ?
// [normal, hoverState] : [normal]`). This MUST still flag
// row-below-minimum-states: if it stops flagging, the descriptor-resolution
// fix has over-matched into a blanket exemption for every helper-bound row,
// which is exactly the false-clean this rule exists to prevent.
export default function Edit( { attributes, setAttributes } ) {
	const rowBackgroundRow = fillRow( {
		key: 'rowBackground',
		label: 'Row background colour',
		attrs: {
			base: 'rowBackground',
			gradient: 'rowBackgroundGradient',
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
