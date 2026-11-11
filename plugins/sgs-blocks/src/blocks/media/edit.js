/**
 * SGS Media block editor (Spec 49 §9, §9.7).
 *
 * The inspector is the shared media panels (`MediaElementPanel` with this block's `kinds`): Media, Caption and link,
 * Video, Size and crop, Position in the layout, Border and shape, Shadow, Overlay and filters, Typography, SVG. The
 * canvas prints the layout box with the slot's scope class and the media element of the device being edited, with
 * the CSS `mediaPreview()` builds (the editor's twin of what `SGS_Media_Element::render()` prints).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, MediaPlaceholder, MediaUploadCheck } from '@wordpress/block-editor';
import { SgsColourPanel, textRow } from '../../components';
import MediaElementPanel from '../../components/MediaElementPanel.js';
import mediaPreview from '../../components/media/mediaPreview.js';
import { slotAccess } from '../../components/media/fieldBase.js';
import { resolveTierSource, useActiveDevice } from '../../components/media/deviceValues.js';
import { embedSrc, hasFile, pickPatch } from '../../components/media/mediaSlotWrites.js';
import AuthoredText from '../../components/AuthoredText';
import { sanitiseSvg, typographyPreviewStyle, textPaintPreview, usePreviewTier } from '../../utils';
import TypographyPanel from './components/TypographyPanel';
import metadata from './block.json';

const ENTRY = metadata.supports.sgs.mediaElements.find( ( e ) => ! e.prefix );
const SLOT = { prefix: '', kinds: ENTRY.kinds, context: ENTRY.context, wrapper: true };

/** The media element one device shows. */
function Canvas( { shown, alt, attributes, previewTier } ) {
	if ( 'video' === shown.kind ) {
		const controls = false !== attributes.playback?.controls;
		return (
			<span className="sgs-media-stack">
				{ shown.poster?.url && <img className="sgs-media-el sgs-media-cover" src={ shown.poster.url } alt="" /> }
				{ shown.url && <video className="sgs-media-el sgs-media-video" src={ shown.url } poster={ shown.poster?.url || undefined } muted playsInline preload="metadata" /> }
				{ controls && (
					<span className="sgs-video sgs-video--editor-sample" aria-hidden="true">
						<span className="sgs-video__bar">
							<span className="sgs-video__time" style={ typographyPreviewStyle( attributes, 'videoTime', previewTier ) }>
								0:00 / 1:24
							</span>
						</span>
					</span>
				) }
			</span>
		);
	}
	if ( 'embed' === shown.kind ) {
		const src = embedSrc( shown.url );
		return src ? (
			<iframe className="sgs-media-el sgs-media-embed" src={ src } title={ alt || __( 'Video preview', 'sgs-blocks' ) } loading="lazy" tabIndex={ -1 } />
		) : null;
	}
	if ( 'svg' === shown.kind && shown.markup ) {
		// Editor preview only: the front end prints the PHP-sanitised markup.
		return (
			<span
				className="sgs-media-el sgs-media-svg"
				aria-hidden="true"
				// eslint-disable-next-line react/no-danger
				dangerouslySetInnerHTML={ { __html: sanitiseSvg( shown.markup ) } }
			/>
		);
	}
	if ( shown.url ) {
		return (
			<img
				className="sgs-media-el"
				src={ shown.url }
				width={ shown.width || undefined }
				height={ shown.height || undefined }
				alt={ alt }
			/>
		);
	}
	return null;
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const device = useActiveDevice();
	const previewTier = usePreviewTier();
	const uid = 'sgs-media-' + clientId.slice( 0, 8 );
	const { css, className } = mediaPreview( SLOT, attributes, uid );
	const blockProps = useBlockProps( { className } );
	const access = slotAccess( attributes, setAttributes, '' );

	const stored = attributes.source;
	const shown = resolveTierSource( stored, device, hasFile ).value;
	const alt = attributes.decorative ? '' : shown?.alt || attributes.alt || '';
	const caption = String( attributes.caption || '' );
	const CaptionTag = 'div' === attributes.captionTag ? 'div' : 'figcaption';
	const showsVideoTime = !! shown && 'video' === shown.kind && false !== attributes.playback?.controls;

	const typography = ( caption || showsVideoTime ) && (
		<TypographyPanel
			attributes={ attributes }
			setAttributes={ setAttributes }
			showCaption={ !! caption }
			showVideoTime={ showsVideoTime }
		/>
	);

	const pick = ( attachment ) => {
		const kind = ( attachment?.mime || attachment?.type || '' ).startsWith( 'video' ) ? 'video' : 'image';
		access.write( pickPatch( { read: access.read, device, media: attachment, kind, keepFocal: false } ).patch );
	};

	return (
		<>
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'caption',
						label: __( 'Caption colour', 'sgs-blocks' ),
						attrs: {
							base: 'captionColour',
							hover: 'captionColourHover',
							gradient: 'captionColourGradient',
							hoverGradient: 'captionColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<MediaElementPanel
				attributes={ attributes }
				setAttributes={ setAttributes }
				blockName="sgs/media"
				blockSlug="sgs/media"
				context={ ENTRY.context }
				panelContent={ typography ? { typography } : undefined }
			/>
			<div { ...blockProps }>
				{ css && <style>{ css }</style> }
				{ shown && ( hasFile( shown ) || shown.markup ) ? (
					<>
						<Canvas shown={ shown } alt={ alt } attributes={ attributes } previewTier={ previewTier } />
						{ caption && (
							<CaptionTag
								className="sgs-media-caption"
								style={ {
									...typographyPreviewStyle( attributes, 'caption', previewTier ),
									...textPaintPreview( attributes.captionColour, attributes.captionColourGradient ),
								} }
							>
								<AuthoredText value={ caption } />
							</CaptionTag>
						) }
					</>
				) : (
					<MediaUploadCheck>
						<MediaPlaceholder
							allowedTypes={ [ 'image', 'video' ] }
							onSelect={ pick }
							labels={ {
								title: __( 'SGS Media', 'sgs-blocks' ),
								instructions: __( 'Upload or choose a photo or video. Embeds and SVG are in the Media panel.', 'sgs-blocks' ),
							} }
						/>
					</MediaUploadCheck>
				) }
			</div>
		</>
	);
}
