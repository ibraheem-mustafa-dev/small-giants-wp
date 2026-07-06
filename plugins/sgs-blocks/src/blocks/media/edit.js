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
	TextareaControl,
	ToggleControl,
	RangeControl,
	Notice,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { ResponsiveControl } from '../../components';

/**
 * Allowed CSS length units for the media styling controls. Mirrors the
 * server-side sgs_media_validate_unit() allowlist so the editor cannot emit a
 * unit render.php would reject.
 */
const SGS_MEDIA_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
	{ value: 'vw', label: 'vw' },
	{ value: 'vh', label: 'vh' },
];

/**
 * Responsive UnitControl trio — stores a unit-embedded CSS length string per
 * breakpoint (e.g. "440px", "100%"). attrDesktop/Tablet/Mobile are declared as
 * JSX props so the dead-control guard sees them as controlled attrs.
 */
function RUnitControl( { label, attrDesktop, attrTablet, attrMobile, attributes, setAttributes } ) {
	return (
		<ResponsiveControl label={ label }>
			{ ( bp ) => {
				const key = { desktop: attrDesktop, tablet: attrTablet, mobile: attrMobile }[ bp ];
				return (
					<UnitControl
						value={ attributes[ key ] || '' }
						onChange={ ( v ) => setAttributes( { [ key ]: v || null } ) }
						units={ SGS_MEDIA_UNITS }
						__next40pxDefaultSize
					/>
				);
			} }
		</ResponsiveControl>
	);
}

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
		// SVG.
		svgContent,
		svgAnimation,
		svgAnimationSpeed,
	} = attributes;

	const blockProps = useBlockProps();

	// -------------------------------------------------------------------------
	// Helpers.
	// -------------------------------------------------------------------------
	const isImage = 'image' === mediaType || ! mediaType;
	const isVideo = 'video' === mediaType;
	const isSvg   = 'svg' === mediaType;

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
					<Button
						variant={ isSvg ? 'primary' : 'secondary' }
						onClick={ () => setAttributes( { mediaType: 'svg' } ) }
					>
						{ __( 'SVG / Animation', 'sgs-blocks' ) }
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
					<TextControl
						label={ __( 'Alt text (alternative text)', 'sgs-blocks' ) }
						help={ __( 'Describe the image for screen readers and search engines. Leave empty only if the image is purely decorative.', 'sgs-blocks' ) }
						value={ imageAlt || '' }
						onChange={ ( value ) => setAttributes( { imageAlt: value } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			) }

			{ /* Media styling — writes the block's NATIVE styling attributes
			     (single source of truth the cloning converter also writes). */ }
			{ ( isImage || isVideo ) && (
				<PanelBody title={ __( 'Media Styling', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Object fit', 'sgs-blocks' ) }
						help={ __( 'How the media fills its box when a fixed height / aspect ratio is set.', 'sgs-blocks' ) }
						value={ attributes.objectFit || 'cover' }
						options={ [
							{ label: __( 'Cover (fill, crop)', 'sgs-blocks' ), value: 'cover' },
							{ label: __( 'Contain (fit, letterbox)', 'sgs-blocks' ), value: 'contain' },
							{ label: __( 'Fill (stretch)', 'sgs-blocks' ), value: 'fill' },
							{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
							{ label: __( 'Scale down', 'sgs-blocks' ), value: 'scale-down' },
						] }
						onChange={ ( value ) => setAttributes( { objectFit: value } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Object position', 'sgs-blocks' ) }
						help={ __( 'Which part stays visible when cropped, e.g. "center center", "top right", "center 20%".', 'sgs-blocks' ) }
						value={ attributes.objectPosition || '' }
						placeholder="center center"
						onChange={ ( value ) => setAttributes( { objectPosition: value } ) }
						__nextHasNoMarginBottom
					/>
					<RUnitControl
						label={ __( 'Max width', 'sgs-blocks' ) }
						attrDesktop="maxWidth"
						attrTablet="maxWidthTablet"
						attrMobile="maxWidthMobile"
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
					<RUnitControl
						label={ __( 'Max height', 'sgs-blocks' ) }
						attrDesktop="maxHeight"
						attrTablet="maxHeightTablet"
						attrMobile="maxHeightMobile"
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
					<RUnitControl
						label={ __( 'Height (fill)', 'sgs-blocks' ) }
						attrDesktop="height"
						attrTablet="heightTablet"
						attrMobile="heightMobile"
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
					<TextControl
						label={ __( 'Aspect ratio', 'sgs-blocks' ) }
						help={ __( 'e.g. "16 / 9", "4 / 3", "1 / 1". Leave empty for the natural ratio.', 'sgs-blocks' ) }
						value={ attributes.aspectRatio || '' }
						placeholder="16 / 9"
						onChange={ ( value ) => setAttributes( { aspectRatio: value } ) }
						__nextHasNoMarginBottom
					/>
					<UnitControl
						label={ __( 'Border radius', 'sgs-blocks' ) }
						value={ attributes.borderRadius || '' }
						units={ SGS_MEDIA_UNITS }
						onChange={ ( value ) => setAttributes( { borderRadius: value || '' } ) }
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Alignment', 'sgs-blocks' ) }
						value={ attributes.alignment || 'left' }
						options={ [
							{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
							{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
							{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
						] }
						onChange={ ( value ) => setAttributes( { alignment: value } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Opacity', 'sgs-blocks' ) }
						value={ attributes.opacity ?? 1 }
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
						onChange={ ( value ) => setAttributes( { opacity: value ?? 1 } ) }
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Box shadow (CSS)', 'sgs-blocks' ) }
						help={ __( 'A raw CSS box-shadow value, e.g. "0 6px 24px rgba(0,0,0,0.15)". Leave empty for none.', 'sgs-blocks' ) }
						value={ attributes.boxShadow || '' }
						onChange={ ( value ) => setAttributes( { boxShadow: value } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			) }

			{ /* Caption & link — caption applies to image + video; link is image-only. */ }
			{ ( isImage || isVideo ) && (
				<PanelBody title={ __( 'Caption & Link', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Caption', 'sgs-blocks' ) }
						value={ attributes.caption || '' }
						onChange={ ( value ) => setAttributes( { caption: value } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Caption tag', 'sgs-blocks' ) }
						value={ attributes.captionTag || 'figcaption' }
						options={ [
							{ label: __( 'Figure caption (figcaption)', 'sgs-blocks' ), value: 'figcaption' },
							{ label: __( 'Div', 'sgs-blocks' ), value: 'div' },
						] }
						onChange={ ( value ) => setAttributes( { captionTag: value } ) }
						__nextHasNoMarginBottom
					/>
					{ isImage && (
						<>
							<TextControl
								label={ __( 'Link URL', 'sgs-blocks' ) }
								help={ __( 'Wrap the image in a link. Leave empty for no link.', 'sgs-blocks' ) }
								type="url"
								value={ attributes.linkUrl || '' }
								onChange={ ( value ) => setAttributes( { linkUrl: value } ) }
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Open link in new tab', 'sgs-blocks' ) }
								checked={ !! attributes.linkOpensNewTab }
								onChange={ ( value ) => setAttributes( { linkOpensNewTab: value } ) }
							/>
							<TextControl
								label={ __( 'Link rel', 'sgs-blocks' ) }
								help={ __( 'Optional rel attribute, e.g. "nofollow sponsored". "noopener" is added automatically for new-tab links.', 'sgs-blocks' ) }
								value={ attributes.linkRel || '' }
								onChange={ ( value ) => setAttributes( { linkRel: value } ) }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>
			) }

			{ /* SVG controls */ }
			{ isSvg && (
				<PanelBody title={ __( 'SVG / Animation', 'sgs-blocks' ) } initialOpen={ true }>
					<p className="components-base-control__help">
						{ __( 'Paste SVG markup to render it as a foreground content element. Animations use pure CSS — no JavaScript required.', 'sgs-blocks' ) }
					</p>
					<TextareaControl
						label={ __( 'SVG code', 'sgs-blocks' ) }
						value={ svgContent || '' }
						onChange={ ( value ) => setAttributes( { svgContent: value } ) }
						help={ __( 'Paste your <svg>…</svg> markup here.', 'sgs-blocks' ) }
						rows={ 8 }
					/>
					<SelectControl
						label={ __( 'Animation', 'sgs-blocks' ) }
						value={ svgAnimation || 'none' }
						options={ [
							{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
							{ label: __( 'Pulse', 'sgs-blocks' ), value: 'pulse' },
							{ label: __( 'Float', 'sgs-blocks' ), value: 'float' },
							{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
						] }
						onChange={ ( value ) => setAttributes( { svgAnimation: value } ) }
						__nextHasNoMarginBottom
					/>
					{ svgAnimation && 'none' !== svgAnimation && (
						<SelectControl
							label={ __( 'Animation speed', 'sgs-blocks' ) }
							value={ svgAnimationSpeed || 'medium' }
							options={ [
								{ label: __( 'Slow', 'sgs-blocks' ), value: 'slow' },
								{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
								{ label: __( 'Fast', 'sgs-blocks' ), value: 'fast' },
							] }
							onChange={ ( value ) => setAttributes( { svgAnimationSpeed: value } ) }
							__nextHasNoMarginBottom
						/>
					) }
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
	// Canvas — SVG mode.
	// -------------------------------------------------------------------------
	if ( isSvg ) {
		if ( ! svgContent ) {
			return (
				<div { ...blockProps }>
					{ inspectorControls }
					<div className="components-placeholder">
						<div className="components-placeholder__label">
							{ __( 'SGS Media — SVG / Animation', 'sgs-blocks' ) }
						</div>
						<div className="components-placeholder__instructions">
							{ __( 'Paste your SVG markup in the block settings panel.', 'sgs-blocks' ) }
						</div>
					</div>
				</div>
			);
		}

		// Editor preview: render SVG inline via dangerouslySetInnerHTML.
		// This is editor-only — the frontend uses the PHP-sanitised path (render.php).
		const svgClass = [
			'sgs-media__svg',
			svgAnimation && 'none' !== svgAnimation
				? `sgs-media__svg--${ svgAnimation } sgs-media__svg--speed-${ svgAnimationSpeed || 'medium' }`
				: '',
		].filter( Boolean ).join( ' ' );

		return (
			<figure { ...blockProps }>
				{ inspectorControls }
				{ /* eslint-disable-next-line react/no-danger */ }
				<div
					className={ svgClass }
					aria-hidden="true"
					dangerouslySetInnerHTML={ { __html: svgContent } }
				/>
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
