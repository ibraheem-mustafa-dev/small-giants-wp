import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { DesignTokenPicker } from '../../components';

// Mirrors the live sgs/mega-panel edit.js divider-colour shape: a standalone
// DesignTokenPicker using the OLD single-value API (value=/onChange=, no
// states array at all). This is structurally a 1-state row with no gradient
// path — both checks fire.
export default function Edit( { attributes, setAttributes } ) {
	const { dividerColour } = attributes;
	return (
		<InspectorControls group="styles">
			<PanelBody title="Divider">
				<DesignTokenPicker
					label="Divider colour"
					value={ dividerColour }
					onChange={ ( value ) => setAttributes( { dividerColour: value || '' } ) }
					linked
					clearable
				/>
			</PanelBody>
		</InspectorControls>
	);
}
