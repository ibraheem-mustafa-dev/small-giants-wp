/**
 * One item of the sgs/gallery inspector's Images panel: a draggable card with its media field, fit, focal point,
 * caption and link.
 */
import { __, sprintf } from '@wordpress/i18n';
import { TextControl } from '@wordpress/components';
import { LinkPopoverField } from '../../../components';
import MediaSlotField from '../../../components/media/MediaSlotField.js';
import FitField from '../../../components/media/FitField.js';
import FocalField from '../../../components/media/FocalField.js';
import { LINK_SOURCES_ALL } from '../../../shared/link-source-options';
import { ITEM_SLOT, itemFile, itemToSlotAttrs } from '../item-model';

/**
 * @param {Object}   props
 * @param {Object}   props.item         The `mediaItems` entry.
 * @param {number}   props.index        Position in the items array.
 * @param {number}   props.count        How many items there are.
 * @param {Function} props.onRemove     Called with the index when Remove is pressed.
 * @param {Function} props.onMove       Called with (from, to).
 * @param {Function} props.onDragStart  Called with the index when a drag begins.
 * @param {Function} props.onDrop       Called with the index when something is dropped on this card.
 * @param {Function} props.onUpdateSlot Called with (index, patch) for a media field's `item*` patch.
 * @param {Function} props.onUpdate     Called with (index, patch) for the item's own caption and link fields.
 */
export default function GalleryThumbnail( { item, index, count, onRemove, onMove, onDragStart, onDrop, onUpdateSlot, onUpdate } ) {
	const file = itemFile( item );
	const preview = file.poster || ( 'video' === file.kind ? '' : file.url );
	const slotAttrs = itemToSlotAttrs( item );
	const setSlot = ( patch ) => onUpdateSlot( index, patch );
	/* translators: %d: the item's position in the gallery. */
	const title = sprintf( __( 'Item %d', 'sgs-blocks' ), index + 1 );

	return (
		<div
			className="sgs-gallery-editor__thumb"
			onDragOver={ ( e ) => e.preventDefault() }
			onDrop={ () => onDrop( index ) }
			role="listitem"
		>
			<div className="sgs-gallery-editor__thumb-head">
				<span
					className="sgs-gallery-editor__thumb-handle"
					draggable
					onDragStart={ () => onDragStart( index ) }
					title={ __( 'Drag to reorder', 'sgs-blocks' ) }
				>
					{ preview ? (
						<img src={ preview } alt="" className="sgs-gallery-editor__thumb-img" />
					) : (
						<span className="sgs-gallery-editor__thumb-img sgs-gallery-editor__thumb-img--empty" />
					) }
				</span>
				<strong className="sgs-gallery-editor__thumb-title">{ title }</strong>
				<button
					type="button"
					className="sgs-gallery-editor__thumb-move"
					onClick={ () => onMove( index, index - 1 ) }
					disabled={ 0 === index }
					aria-label={ __( 'Move earlier', 'sgs-blocks' ) }
				>
					&uarr;
				</button>
				<button
					type="button"
					className="sgs-gallery-editor__thumb-move"
					onClick={ () => onMove( index, index + 1 ) }
					disabled={ index >= count - 1 }
					aria-label={ __( 'Move later', 'sgs-blocks' ) }
				>
					&darr;
				</button>
				<button
					type="button"
					className="sgs-gallery-editor__thumb-remove"
					onClick={ () => onRemove( index ) }
					aria-label={ __( 'Remove item', 'sgs-blocks' ) }
				>
					&times;
				</button>
			</div>
			<MediaSlotField attributes={ slotAttrs } setAttributes={ setSlot } prefix={ ITEM_SLOT.prefix } slot={ ITEM_SLOT } label={ __( 'Media', 'sgs-blocks' ) } />
			<FitField attributes={ slotAttrs } setAttributes={ setSlot } prefix={ ITEM_SLOT.prefix } slot={ ITEM_SLOT } />
			<FocalField attributes={ slotAttrs } setAttributes={ setSlot } prefix={ ITEM_SLOT.prefix } />
			<TextControl
				label={ __( 'Caption', 'sgs-blocks' ) }
				help={ __( 'Shown with the picture when the gallery shows captions.', 'sgs-blocks' ) }
				value={ item.caption || '' }
				onChange={ ( val ) => onUpdate( index, { caption: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ /* A linked item renders as an <a> to this URL and never opens the lightbox. The label is the link's
			     accessible name (empty falls back to the alt text). */ }
			<LinkPopoverField
				label={ __( 'Link', 'sgs-blocks' ) }
				emptyLabel={ __( 'Link this item', 'sgs-blocks' ) }
				value={ { url: item.linkUrl || '', linkTarget: item.linkTarget || '', linkSource: item.linkUrlSource || '' } }
				linkSources={ LINK_SOURCES_ALL }
				targetMode="boolean"
				showRel={ false }
				onChange={ ( next ) => {
					const patch = {};
					const nextSource = 'linkSource' in next ? next.linkSource : item.linkUrlSource || '';
					if ( 'linkSource' in next ) {
						patch.linkUrlSource = next.linkSource;
					}
					if ( 'url' in next ) {
						patch.linkUrl = next.url;
						if ( ! next.url && ! nextSource ) {
							patch.linkTarget = '';
							patch.linkLabel = '';
						}
					}
					if ( 'linkTarget' in next ) {
						patch.linkTarget = '_blank' === next.linkTarget ? '_blank' : '';
					}
					onUpdate( index, patch );
				} }
			/>
			{ !! ( item.linkUrl || item.linkUrlSource ) && (
				<TextControl
					label={ __( 'Link label', 'sgs-blocks' ) }
					help={ __( 'Read out by screen readers. Empty uses the image description.', 'sgs-blocks' ) }
					value={ item.linkLabel || '' }
					onChange={ ( val ) => onUpdate( index, { linkLabel: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</div>
	);
}
