import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { ResponsiveBoxControl } from '../../components';

// The canonical flat-attribute shape (Spec 35 §12 field 3 row 1): a scalar
// base with Tablet/Mobile sibling attrs, edited via the wrapper component —
// never a raw <BoxControl> tag anywhere in this file.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<InspectorControls>
			<PanelBody title="Spacing">
				<ResponsiveBoxControl
					label="Padding"
					attributes={ attributes }
					setAttributes={ setAttributes }
					attrKey="padding"
				/>
			</PanelBody>
		</InspectorControls>
	);
}
