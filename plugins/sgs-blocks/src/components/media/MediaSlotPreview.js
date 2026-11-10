/**
 * The preview inside `MediaSlotField` (Spec 49 §9.2, §9.7): a photo or SVG as an image, a video as its cover image
 * or a live element with a pause button, an embed as its iframe with pointer events off (so a click picks the
 * block, not the player).
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { useRef, useState } from '@wordpress/element';
import { embedSrc } from './mediaSlotWrites.js';

function VideoPreview( { source } ) {
	const video = useRef( null );
	const [ paused, setPaused ] = useState( false );
	if ( ! source.url ) {
		return source.poster?.url ? <img className="sgs-media-slot__preview" src={ source.poster.url } alt="" /> : null;
	}
	return (
		<div className="sgs-media-slot__video">
			<video
				ref={ video }
				className="sgs-media-slot__preview"
				src={ source.url }
				poster={ source.poster?.url || undefined }
				muted
				loop
				autoPlay
				playsInline
			/>
			<button
				type="button"
				className="sgs-media-slot__button"
				aria-pressed={ paused }
				onClick={ () => {
					if ( paused ) {
						video.current?.play?.();
					} else {
						video.current?.pause?.();
					}
					setPaused( ! paused );
				} }
			>
				{ paused ? __( 'Play preview', 'sgs-blocks' ) : __( 'Pause preview', 'sgs-blocks' ) }
			</button>
		</div>
	);
}

export default function MediaSlotPreview( { source } ) {
	if ( 'video' === source.kind ) {
		return <VideoPreview source={ source } />;
	}
	if ( 'embed' === source.kind ) {
		const src = embedSrc( source.url );
		return src ? (
			<iframe className="sgs-media-slot__preview sgs-media-slot__preview--embed" src={ src } title={ __( 'Video preview', 'sgs-blocks' ) } loading="lazy" tabIndex={ -1 } />
		) : null;
	}
	if ( 'svg' === source.kind && source.markup && ! source.url ) {
		return <img className="sgs-media-slot__preview" src={ `data:image/svg+xml;charset=utf-8,${ encodeURIComponent( source.markup ) }` } alt="" />;
	}
	return source.url ? <img className="sgs-media-slot__preview" src={ source.url } alt="" /> : null;
}
