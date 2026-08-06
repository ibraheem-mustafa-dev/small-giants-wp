import { InspectorControls, MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { PanelBody, Button } from '@wordpress/components';

export default function Edit( { attributes, setAttributes } ) {
	const { imageId } = attributes;
	return (
		<InspectorControls>
			<PanelBody title="Media">
				<MediaUploadCheck>
					<MediaUpload
						onSelect={ ( media ) => setAttributes( { imageId: media.id } ) }
						value={ imageId }
						render={ ( { open } ) => (
							<Button onClick={ open }>Select image</Button>
						) }
					/>
				</MediaUploadCheck>
			</PanelBody>
		</InspectorControls>
	);
}
