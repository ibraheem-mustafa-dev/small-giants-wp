import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	MediaPlaceholder,
	MediaUpload,
	MediaUploadCheck,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	ButtonGroup,
	Button,
	TextControl,
	SelectControl,
	ToggleControl,
	Notice,
} from '@wordpress/components';

/**
 * SGS Media block editor component.
 *
 * Renders a media-type toggle (Image | Video) at the top of the inspector.
 * Image tab: existing image controls (MediaPlaceholder / MediaUpload).
 * Video tab: video URL, source toggle, poster, playback options.
 *
 * Frontend rendering is handled 100% by render.php; this component provides
 * editor preview + inspector controls only.
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		// Shared.
		mediaType,
		// Image.
		imageId,
		imageUrl,
		imageAlt,
		// Video.
		videoUrl,
		videoSource,
		videoPoster,
		videoPosterId,
		videoAutoplay,
		videoLoop,
		videoMuted,
		videoControls,
		videoPlaysInline,
		videoLazyLoad,
	} = attributes;

	const blockProps = useBlockProps();

	// -------------------------------------------------------------------------
	// Helpers.
	// -------------------------------------------------------------------------
	const isImage = 'image' === mediaType || ! mediaType;
	const isVideo = 'video' === mediaType;

	const onSelectImage = ( media ) => {
		setAttributes( {
			imageId:     media.id   || null,
			imageUrl:    media.url  || '',
			imageAlt:    media.alt  || '',
			imageWidth:  media.width  || null,
			imageHeight: media.height || null,
		} );
	};

	const onSelectVideo = ( media ) => {
		setAttributes( {
			videoId:       media.id       || null,
			videoUrl:      media.url      || '',
			videoMimeType: media.mime     || '',
			videoSource:   'internal',
		} );
	};

	const onSelectPoster = ( media ) => {
		setAttributes( {
			videoPosterId: media.id  || null,
			videoPoster:   media.url || '',
		} );
	};

	// -------------------------------------------------------------------------
	// Inspector controls.
	// -------------------------------------------------------------------------
	const inspectorControls = (
		<InspectorControls>
			{ /* Media type toggle */ }
			<PanelBody title={ __( 'Media Type', 'sgs-blocks' ) } initialOpen={ true }>
				<ButtonGroup aria-label={ __( 'Select media type', 'sgs-blocks' ) }>
					<Button
						variant={ isImage ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { mediaType: 'image' } ) }
					>
						{ __( 'Image', 'sgs-blocks' ) }
					</Button>
					<Button
						variant={ isVideo ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { mediaType: 'video' } ) }
					>
						{ __( 'Video', 'sgs-blocks' ) }
					</Button>
				</ButtonGroup>
			</PanelBody>

			{ /* Image controls */ }
			{ isImage && imageUrl && (
				<PanelBody title={ __( 'Image', 'sgs-blocks' ) } initialOpen={ true }>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ onSelectImage }
							allowedTypes={ [ 'image' ] }
							value={ imageId }
							render={ ( { open } ) => (
								<Button variant="secondary" onClick={ open }>
									{ __( 'Replace Image', 'sgs-blocks' ) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
					<Button
						variant="link"
						isDestructive
						onClick={ () => setAttributes( { imageId: null, imageUrl: '', imageAlt: '' } ) }
						style={ { marginTop: '8px', display: 'block' } }
					>
						{ __( 'Remove Image', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			) }

			{ /* Video controls */ }
			{ isVideo && (
				<PanelBody title={ __( 'Video', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Video Source', 'sgs-blocks' ) }
						value={ videoSource || 'external' }
						options={ [
							{ label: __( 'External URL (YouTube, Vimeo, MP4)', 'sgs-blocks' ), value: 'external' },
							{ label: __( 'WordPress Media Library', 'sgs-blocks' ), value: 'internal' },
						] }
						onChange={ ( value ) => setAttributes( { videoSource: value } ) }
					/>

					{ ( 'external' === ( videoSource || 'external' ) ) && (
						<TextControl
							label={ __( 'Video URL', 'sgs-blocks' ) }
							help={ __( 'YouTube, Vimeo, or direct MP4/WebM URL. Watch URLs are converted to embed URLs automatically.', 'sgs-blocks' ) }
							value={ videoUrl || '' }
							onChange={ ( value ) => setAttributes( { videoUrl: value } ) }
						/>
					) }

					{ 'internal' === videoSource && (
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectVideo }
								allowedTypes={ [ 'video' ] }
								value={ attributes.videoId }
								render={ ( { open } ) => (
									<Button variant="secondary" onClick={ open }>
										{ attributes.videoId
											? __( 'Replace Video', 'sgs-blocks' )
											: __( 'Select Video', 'sgs-blocks' ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
					) }

					{ /* Poster image */ }
					<PanelBody title={ __( 'Poster Image', 'sgs-blocks' ) } initialOpen={ false }>
						<p className="components-base-control__help">
							{ __( 'Shown before the video plays. Recommended for external embeds.', 'sgs-blocks' ) }
						</p>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectPoster }
								allowedTypes={ [ 'image' ] }
								value={ videoPosterId }
								render={ ( { open } ) => (
									<>
										{ videoPoster && (
											<img
												src={ videoPoster }
												alt={ __( 'Video poster', 'sgs-blocks' ) }
												style={ { maxWidth: '100%', marginBottom: '8px', display: 'block' } }
											/>
										) }
										<Button variant="secondary" onClick={ open }>
											{ videoPoster
												? __( 'Replace Poster', 'sgs-blocks' )
												: __( 'Select Poster', 'sgs-blocks' ) }
										</Button>
										{ videoPoster && (
											<Button
												variant="link"
												isDestructive
												onClick={ () => setAttributes( { videoPosterId: null, videoPoster: '' } ) }
												style={ { marginLeft: '8px' } }
											>
												{ __( 'Remove', 'sgs-blocks' ) }
											</Button>
										) }
									</>
								) }
							/>
						</MediaUploadCheck>
					</PanelBody>

					{ /* Playback options */ }
					<PanelBody title={ __( 'Playback Options', 'sgs-blocks' ) } initialOpen={ false }>
						<ToggleControl
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							help={ __( 'Autoplay requires Muted to be enabled on most browsers.', 'sgs-blocks' ) }
							checked={ !! videoAutoplay }
							onChange={ ( value ) => setAttributes( { videoAutoplay: value } ) }
						/>
						<ToggleControl
							label={ __( 'Loop', 'sgs-blocks' ) }
							checked={ !! videoLoop }
							onChange={ ( value ) => setAttributes( { videoLoop: value } ) }
						/>
						<ToggleControl
							label={ __( 'Muted', 'sgs-blocks' ) }
							help={ __( 'Required for autoplay. Always on for background videos.', 'sgs-blocks' ) }
							checked={ videoMuted !== false }
							onChange={ ( value ) => setAttributes( { videoMuted: value } ) }
						/>
						<ToggleControl
							label={ __( 'Show Controls', 'sgs-blocks' ) }
							checked={ videoControls !== false }
							onChange={ ( value ) => setAttributes( { videoControls: value } ) }
						/>
						<ToggleControl
							label={ __( 'Plays Inline (iOS)', 'sgs-blocks' ) }
							help={ __( 'Prevents iOS from opening the video in full screen automatically.', 'sgs-blocks' ) }
							checked={ videoPlaysInline !== false }
							onChange={ ( value ) => setAttributes( { videoPlaysInline: value } ) }
						/>
						<ToggleControl
							label={ __( 'Lazy Load', 'sgs-blocks' ) }
							help={ __( 'Load video only when scrolled into view.', 'sgs-blocks' ) }
							checked={ videoLazyLoad !== false }
							onChange={ ( value ) => setAttributes( { videoLazyLoad: value } ) }
						/>
					</PanelBody>
				</PanelBody>
			) }
		</InspectorControls>
	);

	// -------------------------------------------------------------------------
	// Canvas — image mode.
	// -------------------------------------------------------------------------
	if ( isImage ) {
		if ( ! imageUrl ) {
			return (
				<div { ...blockProps }>
					{ inspectorControls }
					<MediaUploadCheck>
						<MediaPlaceholder
							accept="image/*"
							allowedTypes={ [ 'image' ] }
							onSelect={ onSelectImage }
							labels={ {
								title: __( 'SGS Media — Image', 'sgs-blocks' ),
								instructions: __(
									'Upload or select an image.',
									'sgs-blocks'
								),
							} }
						/>
					</MediaUploadCheck>
				</div>
			);
		}

		return (
			<figure { ...blockProps }>
				{ inspectorControls }
				<img src={ imageUrl } alt={ imageAlt } className="sgs-media__img" />
			</figure>
		);
	}

	// -------------------------------------------------------------------------
	// Canvas — video mode.
	// -------------------------------------------------------------------------
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
							{ __( 'Enter a YouTube, Vimeo, or direct MP4 URL in the block settings.', 'sgs-blocks' ) }
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
					{ __( 'Video URL set. Frontend render handled by server. Preview not available in editor.', 'sgs-blocks' ) }
					<br />
					<code>{ videoUrl }</code>
				</Notice>
			) }
			{ ! videoUrl && attributes.videoId && (
				<Notice status="info" isDismissible={ false }>
					{ __( 'Internal video selected (WP Media Library). Frontend render handled by server.', 'sgs-blocks' ) }
				</Notice>
			) }
		</figure>
	);
}
