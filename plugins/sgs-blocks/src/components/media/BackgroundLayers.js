/**
 * The editor canvas's background layers for an adopted block (Spec 49 §7.8, §9.5, §9.7): the same two nodes the page
 * prints, `.sgs-bg-media` and `.sgs-bg-overlay`, painted by `assets/css/media-bg.css`. A photo is an image, a tile
 * or a Pinned photo a CSS background, a video its cover image or a live muted element, an SVG its sanitised markup.
 * A file that is gone shows "Image missing" and prints nothing on the page.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import '../../../assets/css/media-bg.css';

const MISSING_STYLE = { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#b32d2e', background: '#fcf0f1', font: '600 13px/1.4 sans-serif' };

/**
 * @param {Object}      props
 * @param {Object|null} props.media   `backgroundMediaPreview().media`.
 * @param {Object|null} props.overlay `backgroundMediaPreview().overlay`.
 * @return {JSX.Element|null} The layers.
 */
export default function BackgroundLayers( { media, overlay } ) {
	if ( ! media && ! overlay ) {
		return null;
	}
	const classes = [ 'sgs-bg-media', 'tile' === media?.type && media.pinned && 'sgs-bg-media--pinned' ].filter( Boolean ).join( ' ' );
	const fitStyle = media ? { objectFit: media.fit, ...( media.focal && { objectPosition: media.focal } ) } : {};
	let inner = null;
	let style = {};
	if ( media ) {
		style = undefined !== media.opacity ? { opacity: media.opacity } : {};
		if ( 'tile' === media.type ) {
			style = {
				...style,
				backgroundImage: `url(${ media.url })`,
				backgroundRepeat: media.repeat,
				backgroundSize: media.size,
				...( media.position && { backgroundPosition: media.position } ),
			};
		} else if ( 'image' === media.type ) {
			inner = <img className="sgs-media-el" src={ media.url } alt="" style={ fitStyle } />;
		} else if ( 'video' === media.type ) {
			inner = media.poster ? (
				<img className="sgs-media-el" src={ media.poster } alt="" style={ fitStyle } />
			) : (
				<video className="sgs-media-el sgs-media-video" src={ media.url } muted loop playsInline preload="metadata" style={ fitStyle } />
			);
		} else if ( 'svg' === media.type ) {
			// The markup went through `sanitiseSvg()` in the model, the same allowlist the server uses.
			inner = <span className="sgs-media-el sgs-media-svg" dangerouslySetInnerHTML={ { __html: media.markup } } />;
		} else if ( 'missing' === media.type ) {
			inner = <span style={ MISSING_STYLE }>{ 'video' === media.kind ? __( 'Video missing', 'sgs-blocks' ) : __( 'Image missing', 'sgs-blocks' ) }</span>;
		}
	}
	return (
		<>
			{ media && (
				<div className={ classes } aria-hidden="true" style={ style }>
					{ inner }
				</div>
			) }
			{ overlay && <span className="sgs-bg-overlay" aria-hidden="true" style={ overlay } /> }
		</>
	);
}
