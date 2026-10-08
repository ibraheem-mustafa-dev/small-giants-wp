/**
 * Media block canvas: video mode (placeholder, or the non-playing preview notice and player-bar sample).
 */
import { __ } from '@wordpress/i18n';
import { MediaPlaceholder, MediaUploadCheck } from '@wordpress/block-editor';
import { Notice } from '@wordpress/components';
import { typographyPreviewStyle } from '../../../utils';

export default function VideoCanvas( { blockProps, inspectorControls, attributes, videoUrl, videoSource, previewTier, onSelectVideo } ) {
	const hasVideo = videoUrl || attributes.videoId;

	if ( ! hasVideo ) {
		return (
			<div { ...blockProps }>
				{ inspectorControls }
				{ 'internal' === videoSource ? (
					<MediaUploadCheck>
						<MediaPlaceholder
							accept="video/*"
							allowedTypes={ [ 'video' ] }
							onSelect={ onSelectVideo }
							labels={ {
								title: __( 'SGS Media — Video', 'sgs-blocks' ),
								instructions: __(
									'Upload or select a video from the media library.',
									'sgs-blocks'
								),
							} }
						/>
					</MediaUploadCheck>
				) : (
					<div className="components-placeholder">
						<div className="components-placeholder__label">
							{ __( 'SGS Media — Video', 'sgs-blocks' ) }
						</div>
						<div className="components-placeholder__instructions">
							{ __(
								'Enter a YouTube, Vimeo, or direct MP4 URL in the block settings.',
								'sgs-blocks'
							) }
						</div>
					</div>
				) }
			</div>
		);
	}

	// Video preview in editor — simplified; render.php drives the frontend.
	return (
		<figure { ...blockProps }>
			{ inspectorControls }
			{ videoUrl && (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'Video URL set. Frontend render handled by server. Preview not available in editor.',
						'sgs-blocks'
					) }
					<br />
					<code>{ videoUrl }</code>
				</Notice>
			) }
			{ ! videoUrl && attributes.videoId && (
				<Notice status="info" isDismissible={ false }>
					{ __(
						'Internal video selected (WP Media Library). Frontend render handled by server.',
						'sgs-blocks'
					) }
				</Notice>
			) }
			{ /* view.js builds the player bar on the front end; a static sample of its
			     time read-out wears the same classes so the canvas shows the client's
			     time typography. */ }
			<div className="sgs-video sgs-video--editor-sample" aria-hidden="true">
				<span className="sgs-video__sample-label">
					{ __( 'Player controls preview', 'sgs-blocks' ) }
				</span>
				<div className="sgs-video__bar">
					<span
						className="sgs-video__time"
						style={ typographyPreviewStyle( attributes, 'videoTime', previewTier ) }
					>
						0:00 / 1:24
					</span>
				</div>
			</div>
		</figure>
	);
}
