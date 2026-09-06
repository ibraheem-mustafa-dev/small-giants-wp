/**
 * WATCHED-FAILING FIXTURE — must-flag.
 *
 * Minimal reproduction of D787: the `image` attribute's image-set branch
 * offers only a destructive "Remove image" action. The picker
 * (MediaPlaceholder onSelect) exists only in the empty-state (false) branch,
 * so once `image` is set, a client with a broken image URL has no way back to
 * the picker without first destroying the value.
 */
export default function Edit( { attributes, setAttributes } ) {
	const { image, imageAlt } = attributes;
	return (
		<div>
			{ image ? (
				<div style={ { position: 'relative' } }>
					<img
						className="sgs-fixture__image"
						src={ image }
						alt={ imageAlt || '' }
					/>
					<Button
						isDestructive
						isSmall
						onClick={ () =>
							setAttributes( {
								image: '',
								imageAlt: '',
							} )
						}
					>
						{ __( 'Remove image', 'sgs-blocks' ) }
					</Button>
				</div>
			) : (
				<MediaUploadCheck>
					<MediaPlaceholder
						icon="format-image"
						onSelect={ ( media ) =>
							setAttributes( {
								image: media.url,
								imageAlt: media.alt || '',
							} )
						}
						accept="image/*"
						allowedTypes={ [ 'image' ] }
					/>
				</MediaUploadCheck>
			) }
		</div>
	);
}
