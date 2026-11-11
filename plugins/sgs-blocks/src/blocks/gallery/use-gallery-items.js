/**
 * Gallery item handlers: drag-to-reorder, move, remove, patch and media selection.
 */
import { useRef } from '@wordpress/element';
import { applySlotPatch } from './item-model';

export default function useGalleryItems( { items, setAttributes } ) {
	// Drag-to-reorder state.
	const dragSourceIndex = useRef( null );

	const write = ( next ) => setAttributes( { mediaItems: next } );

	/**
	 * Move one item to a new position.
	 *
	 * @param {number} from Source index.
	 * @param {number} to   Target index.
	 */
	const moveItem = ( from, to ) => {
		if ( from === to || from < 0 || to < 0 || from >= items.length || to >= items.length ) {
			return;
		}
		const next = [ ...items ];
		const [ moved ] = next.splice( from, 1 );
		next.splice( to, 0, moved );
		write( next );
	};

	const handleDragStart = ( index ) => {
		dragSourceIndex.current = index;
	};

	const handleDrop = ( targetIndex ) => {
		const sourceIndex = dragSourceIndex.current;
		dragSourceIndex.current = null;
		if ( null !== sourceIndex ) {
			moveItem( sourceIndex, targetIndex );
		}
	};

	const removeImage = ( index ) => write( items.filter( ( _, i ) => i !== index ) );

	/**
	 * Patch one item's own fields (caption, link and the like).
	 *
	 * @param {number} index Item index.
	 * @param {Object} patch Fields to set; an empty value removes the field.
	 */
	const updateItem = ( index, patch ) =>
		write(
			items.map( ( item, i ) => {
				if ( i !== index ) {
					return item;
				}
				const next = { ...item, ...patch };
				Object.keys( patch ).forEach( ( key ) => {
					if ( '' === patch[ key ] || undefined === patch[ key ] ) {
						delete next[ key ];
					}
				} );
				return next;
			} )
		);

	/**
	 * Apply a media field's `setAttributes` patch to one item.
	 *
	 * @param {number} index Item index.
	 * @param {Object} patch `{ itemSource: ..., itemFocal: ... }`.
	 */
	const updateItemSlot = ( index, patch ) =>
		write( items.map( ( item, i ) => ( i === index ? applySlotPatch( item, patch ) : item ) ) );

	/**
	 * Add the media picked in the library after the items already in the gallery.
	 *
	 * @param {Object[]} picked New items from `resolveGalleryMedia`.
	 */
	const onAddImages = ( picked ) => write( [ ...items, ...picked ] );

	return {
		handleDragStart,
		handleDrop,
		moveItem,
		removeImage,
		updateItem,
		updateItemSlot,
		onAddImages,
	};
}
