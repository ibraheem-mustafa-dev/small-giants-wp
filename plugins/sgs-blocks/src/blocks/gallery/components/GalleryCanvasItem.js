/**
 * One item of the gallery's live preview canvas: the figure, its image or video, and its caption.
 */
import { focalToObjectPosition } from '../../../components/media/focalPosition.js';
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
	itemMedia = null,
} ) {
	const { showCaptions } = attributes;
	const tile = isTileMode( attributes );
	const file = itemFile( item, device );
	const isVideo = 'video' === file.kind;
	const fit = tierValueOf( item.fit, device ) || tierValueOf( attributes.itemFit, device ) || 'cover';
	const focal = tierValueOf( item.focal, device );
	// Ratio, width, height, limits, corners, border and shape come from the shared emitters' CSS (`itemMedia`, scoped to
	// the uid each picture carries); a tile fills its own box. Fit and focal stay inline because each item can override them.
	const mediaStyle = {
		objectFit: fit,
		objectPosition: 'cover' === fit ? focalToObjectPosition( focal || { x: 0.5, y: 0.5 } ) : undefined,
		...( tile ? { height: '100%' } : {} ),
	};
	const uid = itemMedia?.uid || '';
	const withUid = ( classes ) => [ classes, itemMedia?.needsHelper ? '' : uid ].filter( Boolean ).join( ' ' );
	const picture = isVideo && ! file.poster ? (
		<video src={ file.url } className={ withUid( 'sgs-media-el' ) } muted loop playsInline style={ mediaStyle } />
	) : (
		<img
			src={ isVideo ? file.poster : file.url }
			alt={ item.alt || '' }
			className={ withUid( 'sgs-media-el' ) }
			loading="lazy"
			style={ mediaStyle }
		/>
	);
	return (
		<figure
			className={ hiddenOnDevice ? 'sgs-gallery__item sgs-gallery__item--hidden-on-device' : 'sgs-gallery__item' }
			style={ { ...tileStyle } }
		>
			<div className="sgs-gallery__img-wrap">
				{ itemMedia?.needsHelper ? (
					<span className={ `sgs-media-box ${ uid }` }>
						<span className="sgs-media-box__mask">{ picture }</span>
					</span>
				) : (
					picture
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
