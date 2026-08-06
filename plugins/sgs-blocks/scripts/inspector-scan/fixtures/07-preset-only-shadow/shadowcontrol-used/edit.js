import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import ShadowControl from '../../../../../src/components/ShadowControl';

export default function Edit( { attributes, setAttributes } ) {
	const { shadow } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Effects">
				<ShadowControl
					value={ shadow }
					onChange={ ( value ) => setAttributes( { shadow: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
