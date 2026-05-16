import { __ } from '@wordpress/i18n';
import { useBlockProps, MediaPlaceholder, MediaUploadCheck } from '@wordpress/block-editor';

// Minimal editor stub — primary value is server-render output.
// The converter emits sgs/media blocks directly without going through the
// editor; this scaffolding only ensures the block REGISTERS in WP and can be
// inserted/inspected if an operator opens an existing instance in the editor.
export default function Edit( { attributes, setAttributes } ) {
	const { imageId, imageUrl, imageAlt } = attributes;
	const blockProps = useBlockProps();

	if ( ! imageUrl ) {
		return (
			<div { ...blockProps }>
				<MediaUploadCheck>
					<MediaPlaceholder
						accept="image/*"
						allowedTypes={ [ 'image' ] }
						onSelect={ ( media ) =>
							setAttributes( {
								imageId: media.id,
								imageUrl: media.url,
								imageAlt: media.alt || '',
								imageWidth: media.width || null,
								imageHeight: media.height || null,
							} )
						}
						labels={ {
							title: __( 'SGS Media', 'sgs-blocks' ),
							instructions: __(
								'Upload or select an image. Styling lifts from the source mockup CSS.',
								'sgs-blocks'
							),
						} }
					/>
				</MediaUploadCheck>
			</div>
		);
	}

	return (
		<figure { ...blockProps }>
			<img src={ imageUrl } alt={ imageAlt } />
		</figure>
	);
}
