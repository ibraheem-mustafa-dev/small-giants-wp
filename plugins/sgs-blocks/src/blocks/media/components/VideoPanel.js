/**
 * Media block inspector: the Video panel (captions upload and settings).
 */
import { __ } from '@wordpress/i18n';
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { PanelBody, Button, TextControl } from '@wordpress/components';

export default function VideoPanel( { attributes, setAttributes, videoUrl } ) {
	return (
		<PanelBody
			title={ __( 'Video', 'sgs-blocks' ) }
			initialOpen={ true }
		>
			{ /* Video source (URL/media-library toggle via the `media-type`
			     atom's VideoSourceControl) + the video/poster pickers with
			     their tablet/mobile art-direction are now owned by the
			     `source` atom in MediaPanelLayout (mounted above). */ }

			{ /* Captions (WCAG 1.2.2, Level A — below the stated AA
			     baseline). Gated on a video existing, not on `muted`:
			     muted is per-device and can be switched off later, so
			     hiding the control while it happens to be on would mean
			     the client cannot add captions until AFTER they unmute —
			     exactly the ordering trap that makes hero's media-type
			     enum unreachable. Shown whenever there is a video. */ }
			{ ( videoUrl || attributes.videoId ) && (
				<>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( {
									videoCaptionsId: media.id || null,
									videoCaptionsUrl: media.url || '',
								} )
							}
							allowedTypes={ [ 'text/vtt' ] }
							value={ attributes.videoCaptionsId }
							render={ ( { open } ) => (
								<Button
									variant="secondary"
									onClick={ open }
									__next40pxDefaultSize
								>
									{ attributes.videoCaptionsUrl
										? __( 'Replace captions (.vtt)', 'sgs-blocks' )
										: __( 'Add captions (.vtt)', 'sgs-blocks' ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
					{ attributes.videoCaptionsUrl && (
						<>
							<TextControl
								label={ __( 'Captions label', 'sgs-blocks' ) }
								help={ __(
									'Shown in the player’s subtitle menu, e.g. “English”.',
									'sgs-blocks'
								) }
								value={ attributes.videoCaptionsLabel || '' }
								onChange={ ( value ) =>
									setAttributes( { videoCaptionsLabel: value } )
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'Captions language code', 'sgs-blocks' ) }
								help={ __(
									'A two- or three-letter code such as en, cy or fr.',
									'sgs-blocks'
								) }
								value={ attributes.videoCaptionsSrcLang || '' }
								onChange={ ( value ) =>
									setAttributes( { videoCaptionsSrcLang: value } )
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<Button
								variant="link"
								isDestructive
								onClick={ () =>
									setAttributes( {
										videoCaptionsId: null,
										videoCaptionsUrl: '',
									} )
								}
							>
								{ __( 'Remove captions', 'sgs-blocks' ) }
							</Button>
						</>
					) }
				</>
			) }

			{ /* Video art-direction tiers + the Thumbnail/poster panel
			     (picker + tablet/mobile art-direction) are now owned
			     by the `source` atom in MediaPanelLayout (mounted
			     above) — its "Poster image" row is the same
			     ThumbnailId/Thumbnail pair, tiered the same way. */ }

			{ /* Playback options are now owned entirely by the
			     `video-behaviour` atom, mounted via MediaPanelLayout's
			     "Playback" PanelBody (video-only) — each of the same
			     6 bases (Autoplay/Loop/Muted/Show Controls/Plays
			     Inline/Lazy Load) renders through the shared tiered
			     `BooleanResponsiveControl`, matching this panel's old
			     capability rather than falling short of it. */ }
		</PanelBody>
	);
}
