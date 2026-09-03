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
	Button,
	TextControl,
	SelectControl,
	Notice,
} from '@wordpress/components';
import {
	SgsColourPanel,
	MediaPanelLayout,
	mediaElementScopeClass,
	mediaElementCustomProperties,
	TypographyControls,
} from '../../components';
import { MEDIA_ATOM_IDS } from '../../components/media/atoms/registry.js';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { sanitiseSvg } from '../../utils';

/**
 * Allowed CSS length units for the media styling controls. Mirrors the
 * server-side sgs_media_validate_unit() allowlist so the editor cannot emit a
 * unit render.php would reject.
 */
/**
 * Playback options (autoplay/loop/muted/controls/plays-inline/lazy-load) are
 * now owned entirely by the `video-behaviour` atom (Wave 5b, 2026-09-01),
 * mounted via `MediaPanelLayout`'s "Playback" section — the hand-rolled
 * `PLAYBACK_TIERS` reset map + "Playback Options" `ToolsPanel` this file used
 * to own here are gone; the atom's own control renders each of the same 6
 * bases through the shared tiered `BooleanResponsiveControl`.
 */

/**
 * `RUnitControl` (a responsive UnitControl trio storing a unit-embedded CSS
 * length string per flat `attr`/`attrTablet`/`attrMobile` sibling) and its
 * `resetResponsiveLength()` reset-object helper were deleted here (Spec 35
 * pass) once `maxWidth`, `maxHeight` AND `height` — the only three consumers
 * — all migrated to the {desktop,tablet,mobile} TIER OBJECT shape and moved
 * onto `<ResponsiveOverride>` instead. Nothing else in this file used either
 * helper.
 */

/**
 * SGS Media block editor component.
 *
 * Renders a media-type toggle (Image | Video) at the top of the inspector.
 * Image tab: existing image controls (MediaPlaceholder / MediaUpload).
 * Video tab: video URL, source toggle, poster, playback options.
 *
 * Frontend rendering is handled 100% by render.php; this component provides
 * editor preview + inspector controls only.
 * @param root0
 * @param root0.attributes
 * @param root0.setAttributes
 */
export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		// Shared.
		mediaType,
		// Image.
		imageUrl,
		imageAlt,
		imageDecorative,
		// Video.
		videoUrl,
		videoSource,
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
	const isSvg = 'svg' === mediaType;

	// -------------------------------------------------------------------------
	// Media-atom canvas mirror (Wave 5-7 gap, closed 2026-09-01).
	//
	// render.php applies the `.sgs-media-el` marker + this element's own
	// scope class + every atom's custom-property VALUES so the shared
	// `assets/css/media-element.css` stylesheet paints object-fit/opacity/
	// shadow/etc on the FRONTEND. Nothing on the editor side ever did the
	// same, so the canvas <img>/<svg> never visibly reacted to those
	// inspector controls even though the underlying attribute was written
	// correctly — confirmed live via Playwright before this fix (`opacity`/
	// `object-fit` computed styles stayed at their CSS defaults regardless
	// of the panel value). `sgs/media` is unprefixed and uses every atom
	// (MediaPanelLayout.js mounts all 16 unprefixed), so the full
	// MEDIA_ATOM_IDS set applies here.
	const mediaScopeClass = mediaElementScopeClass( clientId, '' );
	const mediaElementStyle = mediaElementCustomProperties( {
		attributes,
		blockSlug: 'sgs/media',
		atoms: MEDIA_ATOM_IDS,
	} );
	// The box marker is a no-op until the `overlay` atom has a colour/gradient
	// set (media-element.css's own docblock: "no custom properties set means
	// the pseudo-element paints fully transparent") — unlike render.php's
	// naked-mode branch, the editor canvas always wraps in a <figure>, so
	// there is no wrapper-avoidance case to gate here.
	const mediaBoxStyle = mediaElementCustomProperties( {
		attributes,
		blockSlug: 'sgs/media',
		atoms: MEDIA_ATOM_IDS.filter( ( id ) => 'overlay' === id ),
	} );
	const mediaElementClassName = [ 'sgs-media__img', 'sgs-media-el', mediaScopeClass ]
		.filter( Boolean )
		.join( ' ' );
	const mediaBoxClassName = [ 'sgs-media-box', mediaScopeClass ].filter( Boolean ).join( ' ' );

	const onSelectImage = ( media ) => {
		setAttributes( {
			imageId: media.id || null,
			imageUrl: media.url || '',
			imageAlt: media.alt || '',
			imageWidth: media.width || null,
			imageHeight: media.height || null,
		} );
	};

	const onSelectVideo = ( media ) => {
		setAttributes( {
			videoId: media.id || null,
			videoUrl: media.url || '',
			videoMimeType: media.mime || '',
			videoSource: 'internal',
		} );
	};


	// -------------------------------------------------------------------------
	// Inspector controls.
	// -------------------------------------------------------------------------
	const inspectorControls = (
		<>
			{ /* GROUND-TRUTH: block.json attributes.captionColour (no default,
			   type string) + render.php:118 ($caption_colour, styled onto the
			   caption element) — confirmed 2026-08-15 against the live source
			   before wiring this row. Single-state colour (no hover pair
			   exists for the caption), `linked: true` per D619.
			   boxShadowColour row (D621/D622) added 2026-08-16 — colour lives
			   here, shape stays with ShadowControl in the Media Styling
			   ToolsPanel below, per the shared colour-architecture. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'caption',
						label: __( 'Caption colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.captionColour,
								onChange: ( val ) => setAttributes( { captionColour: val ?? '' } ),
								linked: true,
								gradientValue: attributes.captionColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { captionColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'boxShadow',
						label: __( 'Shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.boxShadowColour,
								onChange: ( val ) => setAttributes( { boxShadowColour: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.boxShadowColourHover,
								onChange: ( val ) => setAttributes( { boxShadowColourHover: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Caption typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="caption"
						showSize={ true }
						showWeight={ false }
						showStyle={ false }
						showLineHeight={ false }
						showResponsive={ false }
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls>
			{ /* Media type switch + per-type source/meaning/svg-presentation +
			     Image Styling (object-fit/focal-point/motion) + Box & Border
			     (box-shape) + Playback (video-behaviour) + Overlay — the full
			     Wave 5b atom layer (MediaPanelLayout.js). Replaces the old
			     hand-rolled media-type ButtonGroup, the Image panel's
			     Replace/Remove + art-direction + decorative/alt controls, the
			     SVG content/animation controls, the Video source/URL/poster
			     workflow, the old Media Styling ToolsPanel's sizing/border
			     rows, and the old Playback Options ToolsPanel — all now owned
			     by the atom layer. This block's Media Styling ToolsPanel
			     (further below) keeps only Alignment/Opacity/Box shadow, none
			     of which any atom owns. */ }
			<MediaPanelLayout
				attributes={ attributes }
				setAttributes={ setAttributes }
				mediaType={ mediaType || 'image' }
				blockSlug="sgs/media"
				previewUrl={ isImage ? imageUrl : '' }
			/>

			{ /* Media styling — writes the block's NATIVE styling attributes
			     (single source of truth the cloning converter also writes).
			     ToolsPanel (dense-panel-candidate, Spec 35 wave-B T-item-2):
			     9 independent optional settings — objectFit / maxWidth / alignment
			     are the highest-frequency per-instance tweaks so they stay
			     isShownByDefault; the rest are one click away via "+". */ }
			{ ( isImage || isVideo ) && (
				<ToolsPanel
					label={ __( 'Media Styling', 'sgs-blocks' ) }
					resetAll={ () => setAttributes( { alignment: 'left' } ) }
				>
					{ /*
					  * Sizing (mediaSizing/height/width/maxWidth/maxHeight/
					  * aspectRatio), Shape and Border (radius/width/style/
					  * colour) now render in MediaPanelLayout's own
					  * "Box & Border" PanelBody (mounted above) via the
					  * `box-shape` atom — one writer per attribute, not two
					  * panels racing. object-fit/focal-point/motion render in
					  * the "Image Styling" PanelBody, also mounted above.
					  */ }

					<ToolsPanelItem
						label={ __( 'Alignment', 'sgs-blocks' ) }
						hasValue={ () =>
							( attributes.alignment || 'left' ) !== 'left'
						}
						onDeselect={ () =>
							setAttributes( { alignment: 'left' } )
						}
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Alignment', 'sgs-blocks' ) }
							value={ attributes.alignment || 'left' }
							options={ [
								{
									label: __( 'Left', 'sgs-blocks' ),
									value: 'left',
								},
								{
									label: __( 'Centre', 'sgs-blocks' ),
									value: 'center',
								},
								{
									label: __( 'Right', 'sgs-blocks' ),
									value: 'right',
								},
							] }
							onChange={ ( value ) =>
								setAttributes( { alignment: value } )
							}
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			) }

			{ /* Caption & link are now owned entirely by the `caption`/`link`
			     atoms, mounted via MediaPanelLayout's own "Caption & Link"
			     PanelBody (mounted above) — this old hand-rolled panel is
			     fully superseded (Wave 5c, 2026-09-01). */ }

			{ /* SVG content + animation/speed/position/opacity/text-shadow/
			     min-height are now owned by the `source` and
			     `svg-presentation` atoms in MediaPanelLayout (mounted above)
			     — this old hand-rolled SVG panel is fully superseded. */ }

			{ /* Video controls — SKIP-WITH-REASON (Spec 35 wave-B T-item-2 dense-panel
			     audit): this outer "Video" panel is a source-picker WORKFLOW, not a
			     flat list of independent optional settings — videoSource gates which
			     control shows next (URL field vs media-library button), so ToolsPanel's
			     "add/remove independent settings" model doesn't fit. Same reason for
			     the nested "Poster Image" panel below (an image-picker item editor,
			     like the main Image panel above it). Only the nested "Playback
			     Options" panel (a genuine flat list of 6 independent toggles) converts
			     to ToolsPanel — see below. */ }
			{ isVideo && (
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
			) }
			</InspectorControls>
		</>
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
			<figure
				{ ...blockProps }
				className={ [ blockProps.className, mediaBoxClassName ].filter( Boolean ).join( ' ' ) }
				style={ { ...blockProps.style, ...mediaBoxStyle } }
			>
				{ inspectorControls }
				<img
					src={ imageUrl }
					alt={ imageDecorative ? '' : imageAlt }
					aria-hidden={ imageDecorative ? 'true' : undefined }
					className={ mediaElementClassName }
					style={ mediaElementStyle }
				/>
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
							{ __(
								'SGS Media — SVG / Animation',
								'sgs-blocks'
							) }
						</div>
						<div className="components-placeholder__instructions">
							{ __(
								'Paste your SVG markup in the block settings panel.',
								'sgs-blocks'
							) }
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
				? `sgs-media__svg--${ svgAnimation } sgs-media__svg--speed-${
						svgAnimationSpeed || 'medium'
				  }`
				: '',
		]
			.filter( Boolean )
			.join( ' ' );

		return (
			<figure
				{ ...blockProps }
				className={ [ blockProps.className, mediaBoxClassName ].filter( Boolean ).join( ' ' ) }
				style={ { ...blockProps.style, ...mediaBoxStyle } }
			>
				{ inspectorControls }
				{ /* eslint-disable-next-line react/no-danger */ }
				<div
					className={ [ svgClass, 'sgs-media-el', mediaScopeClass ].filter( Boolean ).join( ' ' ) }
					style={ mediaElementStyle }
					aria-hidden="true"
					dangerouslySetInnerHTML={ { __html: sanitiseSvg( svgContent ) } }
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
		</figure>
	);
}
