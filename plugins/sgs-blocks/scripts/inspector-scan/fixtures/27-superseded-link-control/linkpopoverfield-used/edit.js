import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import { LinkPopoverField } from '../../../../../src/components';

export default function Edit( { attributes, setAttributes } ) {
	const { url } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Link">
				<LinkPopoverField
					label="Link"
					value={ url }
					onChange={ ( next ) => setAttributes( { url: next } ) }
					searchOnly
				/>
			</PanelBody>
		</InspectorControls>
	);
}
