/**
 * One item of the gallery's live preview canvas: the figure, its image or video, and its caption.
 */
import { focalPointToObjectPosition, resolveResponsiveTier } from '../../../utils';
import { tierValueOf } from '../../../utils/responsive.js';
import { isTileMode } from '../tile-preview';
import { itemFile } from '../item-model';

export default function GalleryCanvasItem( {
	item,
	attributes,
	captionStyle,
	tileStyle,
	device = 'desktop',
	hiddenOnDevice = false,
} ) {
	const { showCaptions } = attributes;
	const tile = isTileMode( attributes );
	const file = itemFile( item, device );
	const isVideo = 'video' === file.kind;
	const ratio = String( resolveResponsiveTier( attributes.itemRatio || {}, device )?.value || '' ).replace( /\s+/g, '' );
	const fit = tierValueOf( item.fit, device ) || tierValueOf( attributes.itemFit, device ) || 'cover';
	const focal = tierValueOf( item.focal, device );
	const mediaStyle = {
		// Tile mode sizes the tile itself (tileStyle.minHeight); the image then fills it.
		...( /\d/.test( ratio ) && ! tile ? { aspectRatio: ratio } : {} ),
		objectFit: fit,
		objectPosition: 'cover' === fit ? focalPointToObjectPosition( focal || { x: 0.5, y: 0.5 } ) : undefined,
		width: '100%',
		...( tile ? { height: '100%' } : {} ),
		display: 'block',
	};
	return (
		<figure
			className={ hiddenOnDevice ? 'sgs-gallery__item sgs-gallery__item--hidden-on-device' : 'sgs-gallery__item' }
			style={ { ...tileStyle } }
		>
			<div className="sgs-gallery__img-wrap">
				{ isVideo && ! file.poster ? (
					<video src={ file.url } className="sgs-media-el" muted loop playsInline style={ mediaStyle } />
				) : (
					<img
						src={ isVideo ? file.poster : file.url }
						alt={ item.alt || '' }
						className="sgs-media-el"
						loading="lazy"
						style={ mediaStyle }
					/>
				) }
			</div>
			{ showCaptions && item.caption && (
				<figcaption className="sgs-gallery__caption" style={ captionStyle }>
					{ item.caption }
				</figcaption>
			) }
		</figure>
	);
}
