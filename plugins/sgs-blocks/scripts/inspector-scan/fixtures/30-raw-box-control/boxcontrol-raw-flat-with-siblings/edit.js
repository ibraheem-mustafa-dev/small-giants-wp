import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, BoxControl } from '@wordpress/components';

// Mirrors the live nav-menu/edit.js:1244 + product-card/edit.js:1568,1637,2003
// shape: an object-typed box attribute with Tablet/Mobile sibling attrs
// declared in block.json, edited via a RAW BoxControl with no
// <ResponsiveOverride> wrapper anywhere in the file. Neither sanctioned Spec
// 35 §12 field 3 pairing is present, so this is the banned lookalike.
export default function Edit( { attributes, setAttributes } ) {
	const { itemPadding } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Spacing">
				<BoxControl
					label="Item padding"
					values={ itemPadding ?? {} }
					onChange={ ( next ) => setAttributes( { itemPadding: next } ) }
					__next40pxDefaultSize
				/>
			</PanelBody>
		</InspectorControls>
	);
}
