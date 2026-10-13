/**
 * One item of the gallery's live preview canvas: the figure, its image or video, and its caption.
 */
import { focalPointToObjectPosition } from '../../../utils';
import { isTileMode } from '../tile-preview';

export default function GalleryCanvasItem( { item, attributes, captionStyle, tileStyle, tileFitContain } ) {
	const { aspectRatio, showCaptions } = attributes;
	const tile = isTileMode( attributes );
	const isVideo =
		item.type === 'video' ||
		( item.mime && item.mime.startsWith( 'video/' ) );
	const itemFit = tileFitContain ? 'contain' : item.objectFit || 'cover';
	const mediaStyle = {
		// Tile mode sizes the tile itself (tileStyle.minHeight); the image then fills it.
		...( aspectRatio && ! tile ? { aspectRatio } : {} ),
		objectFit: itemFit,
		objectPosition:
			'cover' === itemFit
				? focalPointToObjectPosition( item.focalPoint || { x: 0.5, y: 0.5 } )
				: undefined,
		width: '100%',
		...( tile ? { height: '100%' } : {} ),
		display: 'block',
	};
	return (
		<figure
			className="sgs-gallery__item"
			style={ {
				...( aspectRatio ? { '--sgs-aspect-ratio': aspectRatio } : {} ),
				...tileStyle,
			} }
		>
			<div className="sgs-gallery__img-wrap">
				{ isVideo ? (
					<video
						src={ item.url }
						className="sgs-gallery__img"
						muted
						loop
						playsInline
						style={ mediaStyle }
					/>
				) : (
					<img
						src={ item.url }
						alt={ item.alt || '' }
						className="sgs-gallery__img"
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
