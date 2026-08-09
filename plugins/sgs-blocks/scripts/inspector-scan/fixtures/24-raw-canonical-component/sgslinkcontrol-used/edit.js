import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import SgsLinkControl from '../../../../../src/components/SgsLinkControl';

export default function Edit( { attributes, setAttributes } ) {
	const { url } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Link">
				<SgsLinkControl
					label="Link"
					id="fixture-link"
					value={ url }
					onChange={ ( value ) => setAttributes( { url: value } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
