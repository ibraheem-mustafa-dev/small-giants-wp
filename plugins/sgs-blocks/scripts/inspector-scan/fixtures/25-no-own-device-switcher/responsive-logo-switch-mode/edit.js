import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';

// Mirrors src/blocks/responsive-logo/edit.js:308-316 (read live 2026-08-10)
// — a 2-option mode picker (which breakpoint the compact logo switches on),
// not a 3-tier device switcher. Uses a SelectControl, not a ButtonGroup /
// ToggleGroupControl, and only ever offers 2 of the 3 tier words. Must NOT
// be flagged.
export default function Edit( { attributes, setAttributes } ) {
	const { logoSwitchMode } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Logo">
				<SelectControl
					label="Switch to compact logo on"
					value={ logoSwitchMode || 'mobile' }
					options={ [
						{ label: 'On mobile', value: 'mobile' },
						{ label: 'On tablet & below', value: 'tablet' },
					] }
					onChange={ ( value ) => setAttributes( { logoSwitchMode: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
