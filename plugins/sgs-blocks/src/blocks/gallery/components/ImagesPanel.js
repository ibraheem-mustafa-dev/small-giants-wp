/**
 * Gallery settings-tab Images panel: thumbnail list, media picker and empty-state message.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import MediaGalleryPicker from '../../../components/MediaGalleryPicker';
import GalleryThumbnail from './GalleryThumbnail';
import { resolveGalleryMedia } from '../resolve-gallery-media';

export default function ImagesPanel( {
	attributes,
	setAttributes,
	items,
	onSelectImages,
	removeImage,
	handleDragStart,
	handleDrop,
	toggleItemDecorative,
	updateItemCrop,
} ) {
	const { imageSize } = attributes;

	return (
		<>
				{ /* Panel 1: Images */ }
				<PanelBody
					title={ __( 'Images', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<p className="sgs-gallery-editor__panel-note">
						{ __(
							'Select multiple images from the Media Library. Drag thumbnails to reorder.',
							'sgs-blocks'
						) }
					</p>

					{ items.length > 0 && (
						<div
							className="sgs-gallery-editor__thumbs"
							role="list"
							aria-label={ __( 'Gallery items', 'sgs-blocks' ) }
						>
							{ items.map( ( image, index ) => (
								<GalleryThumbnail
									key={ image._key || image.id || index }
									image={ image }
									index={ index }
									onRemove={ removeImage }
									onDragStart={ handleDragStart }
									onDragOver={ () => {} }
									onDrop={ handleDrop }
									onToggleDecorative={ toggleItemDecorative }
									onUpdateCrop={ updateItemCrop }
								/>
							) ) }
						</div>
					) }

					<MediaGalleryPicker
						value={ items }
						onChange={ onSelectImages }
						resolveItem={ ( media ) =>
							resolveGalleryMedia( media, imageSize )
						}
						allowedTypes={ [ 'image', 'video' ] }
						addLabel={ __( 'Add media', 'sgs-blocks' ) }
						editLabel={ __( 'Edit gallery', 'sgs-blocks' ) }
						buttonVariant="secondary"
						className="sgs-gallery-editor__media-btn"
					/>

					{ items.length > 0 && (
						<p
							className="sgs-gallery-editor__panel-note"
							style={ { marginTop: '8px' } }
						>
							{ items.length }{ ' ' }
							{ items.length === 1
								? __( 'item selected', 'sgs-blocks' )
								: __( 'items selected', 'sgs-blocks' ) }
						</p>
					) }

					<TextControl
						label={ __( 'Message when the gallery is empty', 'sgs-blocks' ) }
						help={ __( 'Shown on the live site. Leave empty to show nothing.', 'sgs-blocks' ) }
						value={ attributes.emptyMessage || '' }
						onChange={ ( val ) => setAttributes( { emptyMessage: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
		</>
	);
}
