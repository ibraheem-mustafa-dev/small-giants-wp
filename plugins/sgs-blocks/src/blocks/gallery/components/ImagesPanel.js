/**
 * Gallery settings-tab Images panel: one card per item (media field, fit, focal point, caption, link), the
 * multi-select upload, the load priority and the empty-state message.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl } from '@wordpress/components';
import MediaGalleryPicker from '../../../components/MediaGalleryPicker';
import GalleryThumbnail from './GalleryThumbnail';
import { resolveGalleryMedia } from '../item-model';

import SgsFreeTextField from '../../../components/SgsFreeTextField';

const LOADING_OPTIONS = [
	{ label: __( 'Automatic', 'sgs-blocks' ), value: '' },
	{ label: __( 'Load first', 'sgs-blocks' ), value: 'first' },
	{ label: __( 'Load later', 'sgs-blocks' ), value: 'later' },
];

export default function ImagesPanel( {
	attributes,
	setAttributes,
	items,
	onAddImages,
	removeImage,
	moveItem,
	handleDragStart,
	handleDrop,
	updateItem,
	updateItemSlot,
} ) {
	return (
		<PanelBody title={ __( 'Images', 'sgs-blocks' ) } initialOpen={ true }>
			<p className="sgs-gallery-editor__panel-note">
				{ __( 'Add several photos or videos from the Media Library at once. Drag an item by its picture, or use the arrows, to reorder.', 'sgs-blocks' ) }
			</p>

			{ items.length > 0 && (
				<div className="sgs-gallery-editor__thumbs" role="list" aria-label={ __( 'Gallery items', 'sgs-blocks' ) }>
					{ items.map( ( item, index ) => (
						<GalleryThumbnail
							key={ item._key || index }
							item={ item }
							index={ index }
							count={ items.length }
							onRemove={ removeImage }
							onMove={ moveItem }
							onDragStart={ handleDragStart }
							onDrop={ handleDrop }
							onUpdateSlot={ updateItemSlot }
							onUpdate={ updateItem }
						/>
					) ) }
				</div>
			) }

			<MediaGalleryPicker
				value={ [] }
				multiple="add"
				onChange={ onAddImages }
				resolveItem={ resolveGalleryMedia }
				allowedTypes={ [ 'image', 'video' ] }
				addLabel={ __( 'Add media', 'sgs-blocks' ) }
				buttonVariant="secondary"
				className="sgs-gallery-editor__media-btn"
			/>

			{ items.length > 0 && (
				<p className="sgs-gallery-editor__panel-note sgs-gallery-editor__count">
					{ items.length }{ ' ' }
					{ items.length === 1 ? __( 'item selected', 'sgs-blocks' ) : __( 'items selected', 'sgs-blocks' ) }
				</p>
			) }

			<SelectControl
				label={ __( 'Load priority', 'sgs-blocks' ) }
				help={ __( 'Automatic loads the pictures above the fold first and the rest as they scroll into view.', 'sgs-blocks' ) }
				value={ attributes.itemLoading || '' }
				options={ LOADING_OPTIONS }
				onChange={ ( val ) => setAttributes( { itemLoading: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>

			<SgsFreeTextField
				type="rich"
				label={ __( 'Message when the gallery is empty', 'sgs-blocks' ) }
				help={ __( 'Shown on the live site. Leave empty to show nothing.', 'sgs-blocks' ) }
				value={ attributes.emptyMessage || '' }
				onChange={ ( val ) => setAttributes( { emptyMessage: val } ) }
			/>
		</PanelBody>
	);
}
