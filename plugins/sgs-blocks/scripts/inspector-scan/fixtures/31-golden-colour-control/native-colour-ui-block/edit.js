import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';

// Mirrors the live sgs/quote / sgs/info-box shape: a colour-eligible block
// with at least one `supports.color` sub-flag left true. No JSX here reaches
// for a colour control at all — this fixture proves the native-colour-ui
// check reads block.json only, never the edit.js JSX.
export default function Edit( { attributes, setAttributes } ) {
	const { label } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Content">
				<TextControl
					label="Label"
					value={ label }
					onChange={ ( value ) => setAttributes( { label: value } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			</PanelBody>
		</InspectorControls>
	);
}
