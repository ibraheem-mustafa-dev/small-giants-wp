import { InspectorControls, MediaUpload } from '@wordpress/block-editor';
import { PanelBody, Button } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { imageId } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Media">
				<MediaUpload
					onSelect={ ( media ) => setAttributes( { imageId: media.id } ) }
					value={ imageId }
					render={ ( { open } ) => (
						<Button onClick={ open }>Select image</Button>
					) }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
