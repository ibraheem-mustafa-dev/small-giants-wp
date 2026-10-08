/**
 * Draggable thumbnail for the sgs/gallery inspector's image strip.
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, ToggleControl, FocalPointPicker } from '@wordpress/components';
import { focalPointToObjectPosition } from '../../../utils';

/**
 * A single draggable thumbnail in the image picker strip.
 *
 * @param {Object}   props
 * @param {Object}   props.image       Image data object.
 * @param {number}   props.index       Position in the images array.
 * @param {Function} props.onRemove    Called when the remove button is clicked.
 * @param {Function} props.onDragStart Called when drag begins.
 * @param {Function} props.onDragOver  Called when dragged over this item.
 * @param {Function} props.onDrop      Called when dropped on this item.
 */
export default function GalleryThumbnail( {
	image,
	index,
	onRemove,
	onDragStart,
	onDragOver,
	onDrop,
	onToggleDecorative,
	onUpdateCrop,
} ) {
	const fit = image.objectFit || 'cover';
	return (
		<div
			className="sgs-gallery-editor__thumb"
			draggable
			onDragStart={ () => onDragStart( index ) }
			onDragOver={ ( e ) => {
				e.preventDefault();
				onDragOver( index );
			} }
			onDrop={ () => onDrop( index ) }
			role="listitem"
		>
			<img
				src={ image.url }
				alt={ image.alt || '' }
				className="sgs-gallery-editor__thumb-img"
				style={ {
					objectFit: fit,
					objectPosition:
						'cover' === fit
							? focalPointToObjectPosition( image.focalPoint || { x: 0.5, y: 0.5 } )
							: undefined,
				} }
			/>
			<button
				type="button"
				className="sgs-gallery-editor__thumb-remove"
				onClick={ () => onRemove( index ) }
				aria-label={ __( 'Remove image', 'sgs-blocks' ) }
			>
				&times;
			</button>
			{ /* Item 18 (2026-09-02, decorative-image-aria) — per-item decorative
			     toggle. This is a REPEATER (mediaItems array), so the flag lives
			     on the item object (`decorative`), not as a top-level block
			     attribute. When true, render.php blanks this item's alt text and
			     adds aria-hidden="true" so the image is hidden from assistive
			     tech (WCAG 2.1 AA 1.1.1). This block has no per-item alt-text
			     control in the editor to disable (alt is set via the WordPress
			     Media Library, not an inline field here). */ }
			<ToggleControl
				className="sgs-gallery-editor__thumb-decorative"
				label={ __( 'Decorative — hide from screen readers', 'sgs-blocks' ) }
				checked={ !! image.decorative }
				onChange={ ( value ) => onToggleDecorative( index, value ) }
				__nextHasNoMarginBottom
			/>
			{ /* Spec 35 Part 4 — per-item crop, same shape as sgs/card-grid's
			     repeater panel. 'image' type only: object-fit on a <video>
			     thumbnail here shows a static poster frame, not a meaningful
			     crop preview, and this block's video items are rare enough
			     that a bespoke second control isn't worth the panel clutter. */ }
			{ 'image' === image.type && (
				<>
					<SelectControl
						className="sgs-gallery-editor__thumb-fit"
						label={ __( 'Image fit', 'sgs-blocks' ) }
						value={ fit }
						options={ [
							{ label: __( 'Cover (crop to fill)', 'sgs-blocks' ), value: 'cover' },
							{ label: __( 'Contain (fit within, no crop)', 'sgs-blocks' ), value: 'contain' },
						] }
						onChange={ ( val ) => onUpdateCrop( index, { objectFit: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ 'cover' === fit && (
						<FocalPointPicker
							label={ __( 'Focal point', 'sgs-blocks' ) }
							url={ image.url }
							value={ image.focalPoint || { x: 0.5, y: 0.5 } }
							onChange={ ( val ) => onUpdateCrop( index, { focalPoint: val } ) }
						/>
					) }
				</>
			) }
		</div>
	);
}
