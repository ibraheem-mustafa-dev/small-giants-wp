import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import SgsLinkControl from '../../../../../src/components/SgsLinkControl';

export default function Edit( { attributes, setAttributes } ) {
	const { linkUrl } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Link">
				<SgsLinkControl
					url={ linkUrl }
					onChange={ ( value ) => setAttributes( { linkUrl: value.url } ) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
