/**
 * ItemImageField: a small fixed image a block keeps as its own attribute (a glyph, a reviewer photo), picked from the
 * Media Library through `LibraryButton`, the one picker MediaSlotField uses. It is not a media slot: it stores the
 * chosen attachment as `{ url, id, alt, type, mime, width, height }` and has no per-device, fit or focal settings.
 *
 * @package
 */
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { LibraryButton } from './MediaSlotField.js';

/**
 * The stored shape of a chosen attachment, or null when it has no URL.
 *
 * @param {Object} media A Media Library attachment.
 * @return {Object|null} The stored value.
 */
export function normaliseImage( media ) {
	if ( ! media || ! media.url ) {
		return null;
	}
	return {
		url: media.url,
		type: 'image',
		id: media.id || 0,
		alt: media.alt || '',
		mime: media.mime || media.mime_type || '',
		width: media.width,
		height: media.height,
	};
}

/**
 * @param {Object}   props
 * @param {Object}   props.value        The stored image, or null.
 * @param {Function} props.onChange     Called with the stored shape of a newly chosen image.
 * @param {Function} props.onRemove     Called when the image is removed.
 * @param {string}   props.label        The pick button's label.
 * @param {string}   props.instructions Help shown above the pick button when empty.
 */
export default function ItemImageField( { value, onChange, onRemove, label, instructions } ) {
	const hasImage = !! ( value && value.url );
	const choose = ( media ) => {
		const next = normaliseImage( media );
		if ( next ) {
			onChange( next );
		}
	};

	return (
		<div className="sgs-item-image-field">
			{ hasImage ? (
				<>
					<img
						className="sgs-item-image-field__preview"
						src={ value.url }
						alt={ value.alt || __( 'Selected image preview', 'sgs-blocks' ) }
					/>
					<LibraryButton types={ [ 'image' ] } value={ value.id } label={ __( 'Replace image', 'sgs-blocks' ) } onSelect={ choose } />
					<Button variant="link" isDestructive onClick={ onRemove }>
						{ __( 'Remove', 'sgs-blocks' ) }
					</Button>
				</>
			) : (
				<>
					{ instructions && <p className="sgs-item-image-field__help">{ instructions }</p> }
					<LibraryButton types={ [ 'image' ] } value={ 0 } label={ label } onSelect={ choose } />
				</>
			) }
		</div>
	);
}
