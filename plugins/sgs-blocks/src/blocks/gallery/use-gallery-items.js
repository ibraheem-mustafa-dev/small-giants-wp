/**
 * Gallery item handlers: drag-to-reorder, remove, decorative toggle, crop patch and media selection.
 */
import { useRef } from '@wordpress/element';

export default function useGalleryItems( { items, setAttributes } ) {
	// Drag-to-reorder state.
	const dragSourceIndex = useRef( null );

	/**
	 * Handle drag-start — record which index is being moved.
	 *
	 * @param {number} index Source index.
	 */
	const handleDragStart = ( index ) => {
		dragSourceIndex.current = index;
	};

	/**
	 * Handle drop — swap the dragged image with the target position.
	 *
	 * @param {number} targetIndex Drop target index.
	 */
	const handleDrop = ( targetIndex ) => {
		const sourceIndex = dragSourceIndex.current;
		if ( sourceIndex === null || sourceIndex === targetIndex ) {
			return;
		}
		const next = [ ...items ];
		const [ moved ] = next.splice( sourceIndex, 1 );
		next.splice( targetIndex, 0, moved );
		setAttributes( { mediaItems: next } );
		dragSourceIndex.current = null;
	};

	/**
	 * Remove a single item from the gallery.
	 *
	 * @param {number} index Index to remove.
	 */
	const removeImage = ( index ) => {
		const next = items.filter( ( _, i ) => i !== index );
		setAttributes( { mediaItems: next } );
	};

	/**
	 * Toggle the per-item decorative flag (item 18, decorative-image-aria).
	 * Patches only the targeted item in the mediaItems repeater — the flag is
	 * a per-item field, not a top-level block attribute.
	 *
	 * @param {number}  index      Index of the item to update.
	 * @param {boolean} decorative New decorative value.
	 */
	const toggleItemDecorative = ( index, decorative ) => {
		const next = items.map( ( item, i ) =>
			i === index ? { ...item, decorative } : item
		);
		setAttributes( { mediaItems: next } );
	};

	/**
	 * Patch a single item's crop fields (Spec 35 Part 4).
	 *
	 * @param {number} index Index of the item to update.
	 * @param {Object} patch Partial item patch — { objectFit } and/or { focalPoint }.
	 */
	const updateItemCrop = ( index, patch ) => {
		const next = items.map( ( item, i ) =>
			i === index ? { ...item, ...patch } : item
		);
		setAttributes( { mediaItems: next } );
	};

	/**
	 * Handle a selection from MediaGalleryPicker.
	 * MediaGalleryPicker already maps each raw WP media object to the
	 * unified SGS media-slot shape (via the resolveItem prop, bound below
	 * to resolveGalleryMedia) so sgs_render_media() can render either an
	 * <img> or <video> per item — this just persists the mapped array.
	 *
	 * @param {Object[]} mappedItems Array already resolved to the SGS media-slot shape.
	 */
	const onSelectImages = ( mappedItems ) => {
		setAttributes( { mediaItems: mappedItems } );
	};

	return {
		handleDragStart,
		handleDrop,
		removeImage,
		toggleItemDecorative,
		updateItemCrop,
		onSelectImages,
	};
}
