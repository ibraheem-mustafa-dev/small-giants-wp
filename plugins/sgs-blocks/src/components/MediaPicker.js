/**
 * MediaPicker — shared media-slot component for SGS blocks.
 *
 * Wraps `MediaUpload` + `MediaUploadCheck` to accept BOTH image and video
 * MIME types from the WordPress media library. Returns a unified attribute
 * shape so any block can render either an `<img>` or `<video>` from the
 * same slot.
 *
 * Returned media object shape:
 * {
 *   url:    string,            // public URL of the asset
 *   type:   'image' | 'video', // resolved from the picked media's mime
 *   id:     number,            // attachment ID (0 if external)
 *   alt:    string,            // alt text (for images) or aria-label
 *   mime:   string,            // raw MIME (e.g. 'image/jpeg', 'video/mp4')
 *   width:  number|undefined,  // intrinsic width  (when known)
 *   height: number|undefined,  // intrinsic height (when known)
 * }
 *
 * @package SGS\Blocks
 */

import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * @typedef {Object} SGSMedia
 * @property {string} url
 * @property {'image'|'video'} type
 * @property {number} id
 * @property {string} alt
 * @property {string} mime
 * @property {number} [width]
 * @property {number} [height]
 */

/**
 * Resolve a WordPress media-library object to the unified SGS media shape.
 *
 * @param {Object} media WordPress media-library item (from MediaUpload onSelect).
 * @returns {SGSMedia|null}
 */
function normaliseMedia( media ) {
	if ( ! media || ! media.url ) {
		return null;
	}
	const mime = media.mime || media.mime_type || '';
	const type = mime.indexOf( 'video/' ) === 0 ? 'video' : 'image';
	return {
		url: media.url,
		type,
		id: media.id || 0,
		alt: media.alt || '',
		mime,
		width: media.width,
		height: media.height,
	};
}

/**
 * MediaPicker component.
 *
 * @param {Object}   props
 * @param {SGSMedia|null} props.value
 * @param {(media: SGSMedia|null) => void} props.onChange
 * @param {() => void} [props.onRemove]
 * @param {string[]} [props.allowedTypes]      Defaults to ['image', 'video'].
 * @param {string}   [props.label]             Button label when nothing is selected.
 * @param {string}   [props.instructionsImage] Help text shown alongside the picker.
 * @returns {JSX.Element}
 */
export default function MediaPicker( {
	value,
	onChange,
	onRemove,
	allowedTypes = [ 'image', 'video' ],
	label = __( 'Select Media', 'sgs-blocks' ),
	instructionsImage = __( 'Choose an image or video', 'sgs-blocks' ),
} ) {
	const handleSelect = ( media ) => {
		const normalised = normaliseMedia( media );
		if ( normalised ) {
			onChange( normalised );
		}
	};

	const handleRemove = () => {
		if ( onRemove ) {
			onRemove();
		} else {
			onChange( null );
		}
	};

	const hasMedia = !! ( value && value.url );

	return (
		<MediaUploadCheck>
			<div className="sgs-media-picker">
				{ ! hasMedia && (
					<MediaUpload
						onSelect={ handleSelect }
						allowedTypes={ allowedTypes }
						value={ 0 }
						render={ ( { open } ) => (
							<div className="sgs-media-picker__empty">
								<p className="sgs-media-picker__instructions">
									{ instructionsImage }
								</p>
								<Button
									variant="secondary"
									onClick={ open }
									aria-label={ label }
								>
									{ label }
								</Button>
							</div>
						) }
					/>
				) }

				{ hasMedia && value.type === 'image' && (
					<div className="sgs-media-picker__preview sgs-media-picker__preview--image">
						<img
							src={ value.url }
							alt={ value.alt || __( 'Selected image preview', 'sgs-blocks' ) }
							style={ { maxWidth: '100%', height: 'auto', display: 'block' } }
						/>
						<MediaUpload
							onSelect={ handleSelect }
							allowedTypes={ allowedTypes }
							value={ value.id }
							render={ ( { open } ) => (
								<div className="sgs-media-picker__actions">
									<Button variant="secondary" onClick={ open }>
										{ __( 'Replace media', 'sgs-blocks' ) }
									</Button>
									<Button variant="link" isDestructive onClick={ handleRemove }>
										{ __( 'Remove', 'sgs-blocks' ) }
									</Button>
								</div>
							) }
						/>
					</div>
				) }

				{ hasMedia && value.type === 'video' && (
					<div className="sgs-media-picker__preview sgs-media-picker__preview--video">
						<div className="sgs-media-picker__video-wrap" style={ { position: 'relative' } }>
							<video
								src={ value.url }
								autoPlay
								muted
								loop
								playsInline
								aria-label={ __( 'Selected video preview', 'sgs-blocks' ) }
								style={ { maxWidth: '100%', height: 'auto', display: 'block' } }
							/>
							<span
								className="sgs-media-picker__badge"
								aria-hidden="true"
								style={ {
									position: 'absolute',
									top: '8px',
									left: '8px',
									padding: '2px 6px',
									fontSize: '10px',
									fontWeight: 600,
									letterSpacing: '0.05em',
									background: 'rgba(0,0,0,0.7)',
									color: '#fff',
									borderRadius: '2px',
								} }
							>
								{ __( 'VIDEO', 'sgs-blocks' ) }
							</span>
						</div>
						<MediaUpload
							onSelect={ handleSelect }
							allowedTypes={ allowedTypes }
							value={ value.id }
							render={ ( { open } ) => (
								<div className="sgs-media-picker__actions">
									<Button variant="secondary" onClick={ open }>
										{ __( 'Replace media', 'sgs-blocks' ) }
									</Button>
									<Button variant="link" isDestructive onClick={ handleRemove }>
										{ __( 'Remove', 'sgs-blocks' ) }
									</Button>
								</div>
							) }
						/>
					</div>
				) }
			</div>
		</MediaUploadCheck>
	);
}
