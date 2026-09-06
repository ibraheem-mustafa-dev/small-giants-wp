import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, BoxControl } from '@wordpress/components';

// Mirrors the live nav-menu/edit.js:1244 and product-card/edit.js:1568,1637,
// 2003 shape. The attribute is a FLAT box object {top,right,bottom,left} with
// NO Tablet/Mobile siblings and no tier keys in its default — deliberately not
// device-tiered, rendered via sgs_box_object_shorthand( array $box ).
//
// A plain BoxControl is the CORRECT control here. ResponsiveBoxControl would
// store a tier-shaped { base, tablet, mobile } object and call
// onChange( tier, next ), which a renderer expecting a flat box drops silently.
//
// This fixture exists because rule 30 originally flagged all four live sites of
// this shape as violations — it classified purely on "is there a
// ResponsiveOverride ancestor?" and never opened block.json, so it could not
// tell a flat box object from a tier object (both read "type": "object" with an
// empty {} default). Guards that regression.
export default function Edit( { attributes, setAttributes } ) {
	const { submenuPadding } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Submenu">
				<BoxControl
					label="Inner spacing"
					values={ submenuPadding || {} }
					onChange={ ( next ) => setAttributes( { submenuPadding: next } ) }
					__next40pxDefaultSize
				/>
			</PanelBody>
		</InspectorControls>
	);
}
