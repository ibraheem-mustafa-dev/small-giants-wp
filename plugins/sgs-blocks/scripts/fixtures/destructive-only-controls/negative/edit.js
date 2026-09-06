/**
 * NEGATIVE CONTROL — must NOT flag.
 *
 * Same shape as ../positive/edit.js, but the image-set (true) branch also
 * mounts a MediaUpload replace control for `image` alongside "Remove image" —
 * this is the fixed shape. Proves the detector distinguishes "has a
 * destructive control" (fine) from "has ONLY a destructive control" (the
 * defect), rather than flagging every isDestructive button it sees.
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
					<div style={ { display: 'flex', gap: '4px' } }>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( {
										image: media.url,
										imageAlt: media.alt || '',
									} )
								}
								allowedTypes={ [ 'image' ] }
								render={ ( { open } ) => (
									<Button variant="secondary" onClick={ open }>
										{ __( 'Replace image', 'sgs-blocks' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
						<Button
							isDestructive
							variant="secondary"
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
