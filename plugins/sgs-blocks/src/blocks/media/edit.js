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
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import {
	ResponsiveControl,
	ResponsiveBorderRadiusControl,
	SgsLinkControl,
} from '../../components';
import BooleanResponsiveControl from './BooleanResponsiveControl';

/**
 * Allowed CSS length units for the media styling controls. Mirrors the
 * server-side sgs_media_validate_unit() allowlist so the editor cannot emit a
 * unit render.php would reject.
 */
/**
 * The video playback booleans, each as a breakpoint map plus its desktop default.
 *
 * Shape is deliberate: `{ desktop, tablet, mobile }` is the canonical responsive
 * idiom in this codebase (see any `<ResponsiveControl>` call site), and
 * `check-control-ux.js` recognises a variant appearing as the VALUE of a
 * `tablet:`/`mobile:` key as a compliant family. Listing the tier attrs any other
 * way — e.g. spelled out one per line in a resetAll — reads to that gate as an
 * unwrapped direct control, which is exactly what it flagged.
 *
 * Single source of truth for the panel's reset, so adding a seventh boolean
 * cannot be silently forgotten by `resetAll`.
 */
const PLAYBACK_TIERS = [
	{
		map: { desktop: 'videoAutoplay', tablet: 'videoAutoplayTablet', mobile: 'videoAutoplayMobile' },
		desktopDefault: false,
	},
	{
		map: { desktop: 'videoLoop', tablet: 'videoLoopTablet', mobile: 'videoLoopMobile' },
		desktopDefault: false,
	},
	{
		map: { desktop: 'videoMuted', tablet: 'videoMutedTablet', mobile: 'videoMutedMobile' },
		desktopDefault: true,
	},
	{
		map: { desktop: 'videoControls', tablet: 'videoControlsTablet', mobile: 'videoControlsMobile' },
		desktopDefault: true,
	},
	{
		map: { desktop: 'videoPlaysInline', tablet: 'videoPlaysInlineTablet', mobile: 'videoPlaysInlineMobile' },
		desktopDefault: true,
	},
	{
		map: { desktop: 'videoLazyLoad', tablet: 'videoLazyLoadTablet', mobile: 'videoLazyLoadMobile' },
		desktopDefault: true,
	},
];

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
 * @param root0
 * @param root0.label
 * @param root0.attrDesktop
 * @param root0.attrTablet
 * @param root0.attrMobile
 * @param root0.attributes
 * @param root0.setAttributes
 */
function RUnitControl( {
	label,
	attrDesktop,
	attrTablet,
	attrMobile,
	attributes,
	setAttributes,
} ) {
	return (
		<ResponsiveControl label={ label }>
			{ ( bp ) => {
				const key = {
					desktop: attrDesktop,
					tablet: attrTablet,
					mobile: attrMobile,
				}[ bp ];
				return (
					<UnitControl
						value={ attributes[ key ] || '' }
						onChange={ ( v ) =>
							setAttributes( { [ key ]: v || null } )
						}
						units={ SGS_MEDIA_UNITS }
						__next40pxDefaultSize
					/>
				);
			} }
		</ResponsiveControl>
	);
}

/**
 * Build the { [base]: null, [base]Tablet: null, [base]Mobile: null } reset
 * object for a responsive length family (maxWidth / maxHeight / height) owned
 * by <RUnitControl> (which itself wraps the shared <ResponsiveControl>). Uses
 * a computed key for the Tablet/Mobile pair so the reset write is not read by
 * the control-ux static gate as a second, competing direct control —
 * RUnitControl's own onChange (also a computed-key write) remains the single
 * writer the gate sees for these attrs; this helper only clears them back to
 * unset when a panel item / the whole panel resets.
 *
 * @param {string} base Desktop attr name, e.g. 'maxWidth', 'maxHeight', 'height'.
 */
function resetResponsiveLength( base ) {
	return {
		[ base ]: null,
		[ `${ base }Tablet` ]: null,
		[ `${ base }Mobile` ]: null,
	};
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
 * @param root0
 * @param root0.attributes
 * @param root0.setAttributes
 */
export default function Edit( { attributes, setAttributes } ) {
	const {
		// Shared.
		mediaType,
		style,
		borderRadiusTablet,
		borderRadiusMobile,
		// Image.
		imageId,
		imageUrl,
		imageAlt,
		imageIsDecorative,
		// Video.
		videoUrl,
		videoSource,
		thumbnail,
		thumbnailId,
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
	const isSvg = 'svg' === mediaType;

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

	const onSelectPoster = ( media ) => {
		setAttributes( {
			thumbnailId: media.id || null,
			thumbnail: media.url || '',
		} );
	};

	// -------------------------------------------------------------------------
	// Inspector controls.
	// -------------------------------------------------------------------------
	const inspectorControls = (
		<InspectorControls>
			{ /* Media type toggle */ }
			<PanelBody
				title={ __( 'Media Type', 'sgs-blocks' ) }
				initialOpen={ true }
			>
				<ButtonGroup
					aria-label={ __( 'Select media type', 'sgs-blocks' ) }
				>
					<Button
						variant={ isImage ? 'primary' : 'secondary' }
						onClick={ () =>
							setAttributes( { mediaType: 'image' } )
						}
					>
						{ __( 'Image', 'sgs-blocks' ) }
					</Button>
					<Button
						variant={ isVideo ? 'primary' : 'secondary' }
						onClick={ () =>
							setAttributes( { mediaType: 'video' } )
						}
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
				<PanelBody
					title={ __( 'Image', 'sgs-blocks' ) }
					initialOpen={ true }
				>
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
						onClick={ () =>
							setAttributes( {
								imageId: null,
								imageUrl: '',
								imageAlt: '',
							} )
						}
						style={ { marginTop: '8px', display: 'block' } }
					>
						{ __( 'Remove Image', 'sgs-blocks' ) }
					</Button>
					{ /* Art direction (2026-08-07). Same device-switched shape as
					     sgs/hero's split image, so a client meets ONE interaction for
					     "a different crop on narrow screens" wherever images appear.
					     Desktop is the image chosen above; tablet/mobile are optional
					     overrides that fall back to it when left empty. */ }
					<ResponsiveControl label={ __( 'Art direction (optional)', 'sgs-blocks' ) }>
						{ ( bp ) => {
							if ( 'desktop' === bp ) {
								return (
									<p style={ { margin: 0, fontStyle: 'italic' } }>
										{ __(
											'The image above is used on desktop. Switch to tablet or mobile to set a different crop.',
											'sgs-blocks'
										) }
									</p>
								);
							}
							const idKey = 'tablet' === bp ? 'imageIdTablet' : 'imageIdMobile';
							const urlKey = 'tablet' === bp ? 'imageUrlTablet' : 'imageUrlMobile';
							return (
								<>
									<MediaUploadCheck>
										<MediaUpload
											onSelect={ ( media ) =>
												setAttributes( {
													[ idKey ]: media.id || null,
													[ urlKey ]: media.url || '',
												} )
											}
											allowedTypes={ [ 'image' ] }
											value={ attributes[ idKey ] }
											render={ ( { open } ) => (
												<Button variant="secondary" onClick={ open }>
													{ attributes[ urlKey ]
														? __( 'Replace image', 'sgs-blocks' )
														: __( 'Set image', 'sgs-blocks' ) }
												</Button>
											) }
										/>
									</MediaUploadCheck>
									{ attributes[ urlKey ] && (
										<Button
											variant="link"
											isDestructive
											onClick={ () =>
												setAttributes( {
													[ idKey ]: null,
													[ urlKey ]: '',
												} )
											}
											style={ { marginTop: '8px', display: 'block' } }
										>
											{ __( 'Use the main image here', 'sgs-blocks' ) }
										</Button>
									) }
								</>
							);
						} }
					</ResponsiveControl>
					{ /* WCAG 2.1 AA 1.1.1 (Non-text Content): decorative toggle is the
					     structural fix for "leave alt blank" — it makes the choice
					     explicit and emits both alt="" AND aria-hidden="true", rather
					     than relying on the operator remembering to leave a field
					     empty (which screen readers can't distinguish from a missing
					     description). Informational control, not a gate (a11y-validation-informational rule). */ }
					<ToggleControl
						label={ __(
							'Decorative image (hide from screen readers)',
							'sgs-blocks'
						) }
						help={ __(
							'Turn on for purely decorative images that add no information — e.g. background flourishes. Screen readers will skip it entirely.',
							'sgs-blocks'
						) }
						checked={ !! imageIsDecorative }
						onChange={ ( value ) =>
							setAttributes( { imageIsDecorative: value } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __(
							'Alt text (alternative text)',
							'sgs-blocks'
						) }
						help={
							imageIsDecorative
								? __(
										'Disabled — this image is marked decorative and is hidden from screen readers.',
										'sgs-blocks'
								  )
								: __(
										'Describe the image for screen readers and search engines. Leave empty only if the image is purely decorative.',
										'sgs-blocks'
								  )
						}
						value={ imageIsDecorative ? '' : imageAlt || '' }
						onChange={ ( value ) =>
							setAttributes( { imageAlt: value } )
						}
						disabled={ imageIsDecorative }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			) }

			{ /* Media styling — writes the block's NATIVE styling attributes
			     (single source of truth the cloning converter also writes).
			     ToolsPanel (dense-panel-candidate, Spec 35 wave-B T-item-2):
			     9 independent optional settings — objectFit / maxWidth / alignment
			     are the highest-frequency per-instance tweaks so they stay
			     isShownByDefault; the rest are one click away via "+". */ }
			{ ( isImage || isVideo ) && (
				<ToolsPanel
					label={ __( 'Media Styling', 'sgs-blocks' ) }
					resetAll={ () => {
						setAttributes( {
							objectFit: 'cover',
							objectPosition: 'center center',
							...resetResponsiveLength( 'maxWidth' ),
							...resetResponsiveLength( 'maxHeight' ),
							...resetResponsiveLength( 'height' ),
							style: {
								...style,
								border: { ...style?.border, radius: {} },
							},
							borderRadiusTablet: {},
							borderRadiusMobile: {},
							alignment: 'left',
							opacity: 1,
							boxShadow: '',
						} );
					} }
				>
					<ToolsPanelItem
						label={ __( 'Object fit', 'sgs-blocks' ) }
						hasValue={ () =>
							( attributes.objectFit || 'cover' ) !== 'cover'
						}
						onDeselect={ () =>
							setAttributes( { objectFit: 'cover' } )
						}
						isShownByDefault
					>
						<SelectControl
							label={ __( 'Object fit', 'sgs-blocks' ) }
							help={ __(
								'How the media fills its box when a fixed height / aspect ratio is set.',
								'sgs-blocks'
							) }
							value={ attributes.objectFit || 'cover' }
							options={ [
								{
									label: __(
										'Cover (fill, crop)',
										'sgs-blocks'
									),
									value: 'cover',
								},
								{
									label: __(
										'Contain (fit, letterbox)',
										'sgs-blocks'
									),
									value: 'contain',
								},
								{
									label: __( 'Fill (stretch)', 'sgs-blocks' ),
									value: 'fill',
								},
								{
									label: __( 'None', 'sgs-blocks' ),
									value: 'none',
								},
								{
									label: __( 'Scale down', 'sgs-blocks' ),
									value: 'scale-down',
								},
							] }
							onChange={ ( value ) =>
								setAttributes( { objectFit: value } )
							}
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Object position', 'sgs-blocks' ) }
						hasValue={ () =>
							!! attributes.objectPosition &&
							'center center' !== attributes.objectPosition
						}
						onDeselect={ () =>
							setAttributes( { objectPosition: 'center center' } )
						}
					>
						<TextControl
							label={ __( 'Object position', 'sgs-blocks' ) }
							help={ __(
								'Which part stays visible when cropped, e.g. "center center", "top right", "center 20%".',
								'sgs-blocks'
							) }
							value={ attributes.objectPosition || '' }
							placeholder="center center"
							onChange={ ( value ) =>
								setAttributes( { objectPosition: value } )
							}
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Max width', 'sgs-blocks' ) }
						hasValue={ () =>
							!! (
								attributes.maxWidth ||
								attributes.maxWidthTablet ||
								attributes.maxWidthMobile
							)
						}
						onDeselect={ () =>
							setAttributes( resetResponsiveLength( 'maxWidth' ) )
						}
						isShownByDefault
					>
						<RUnitControl
							label={ __( 'Max width', 'sgs-blocks' ) }
							attrDesktop="maxWidth"
							attrTablet="maxWidthTablet"
							attrMobile="maxWidthMobile"
							attributes={ attributes }
							setAttributes={ setAttributes }
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Max height', 'sgs-blocks' ) }
						hasValue={ () =>
							!! (
								attributes.maxHeight ||
								attributes.maxHeightTablet ||
								attributes.maxHeightMobile
							)
						}
						onDeselect={ () =>
							setAttributes(
								resetResponsiveLength( 'maxHeight' )
							)
						}
					>
						<RUnitControl
							label={ __( 'Max height', 'sgs-blocks' ) }
							attrDesktop="maxHeight"
							attrTablet="maxHeightTablet"
							attrMobile="maxHeightMobile"
							attributes={ attributes }
							setAttributes={ setAttributes }
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Height (fill)', 'sgs-blocks' ) }
						hasValue={ () =>
							!! (
								attributes.height ||
								attributes.heightTablet ||
								attributes.heightMobile
							)
						}
						onDeselect={ () =>
							setAttributes( resetResponsiveLength( 'height' ) )
						}
					>
						<RUnitControl
							label={ __( 'Height (fill)', 'sgs-blocks' ) }
							attrDesktop="height"
							attrTablet="heightTablet"
							attrMobile="heightMobile"
							attributes={ attributes }
							setAttributes={ setAttributes }
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Border radius', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( style?.border?.radius ?? {} ).length >
								0 ||
							Object.keys( borderRadiusTablet ?? {} ).length >
								0 ||
							Object.keys( borderRadiusMobile ?? {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( {
								style: {
									...style,
									border: { ...style?.border, radius: {} },
								},
								borderRadiusTablet: {},
								borderRadiusMobile: {},
							} )
						}
					>
						<ResponsiveBorderRadiusControl
							label={ __( 'Border radius', 'sgs-blocks' ) }
							values={ {
								base: style?.border?.radius ?? {},
								tablet: borderRadiusTablet ?? {},
								mobile: borderRadiusMobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								if ( 'base' === tier ) {
									setAttributes( {
										style: {
											...style,
											border: {
												...style?.border,
												radius: next,
											},
										},
									} );
								} else {
									setAttributes( {
										[ `borderRadius${
											'tablet' === tier
												? 'Tablet'
												: 'Mobile'
										}` ]: next,
									} );
								}
							} }
						/>
					</ToolsPanelItem>

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
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Opacity', 'sgs-blocks' ) }
						hasValue={ () => 1 !== ( attributes.opacity ?? 1 ) }
						onDeselect={ () => setAttributes( { opacity: 1 } ) }
					>
						<RangeControl
							label={ __( 'Opacity', 'sgs-blocks' ) }
							value={ attributes.opacity ?? 1 }
							min={ 0 }
							max={ 1 }
							step={ 0.05 }
							onChange={ ( value ) =>
								setAttributes( { opacity: value ?? 1 } )
							}
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Box shadow', 'sgs-blocks' ) }
						hasValue={ () => !! attributes.boxShadow }
						onDeselect={ () => setAttributes( { boxShadow: '' } ) }
					>
						<TextControl
							label={ __( 'Box shadow (CSS)', 'sgs-blocks' ) }
							help={ __(
								'A raw CSS box-shadow value, e.g. "0 6px 24px rgba(0,0,0,0.15)". Leave empty for none.',
								'sgs-blocks'
							) }
							value={ attributes.boxShadow || '' }
							onChange={ ( value ) =>
								setAttributes( { boxShadow: value } )
							}
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			) }

			{ /* Caption & link — caption applies to image + video; link is image-only. */ }
			{ ( isImage || isVideo ) && (
				<PanelBody
					title={ __( 'Caption & Link', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Caption', 'sgs-blocks' ) }
						value={ attributes.caption || '' }
						onChange={ ( value ) =>
							setAttributes( { caption: value } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Caption tag', 'sgs-blocks' ) }
						value={ attributes.captionTag || 'figcaption' }
						options={ [
							{
								label: __(
									'Figure caption (figcaption)',
									'sgs-blocks'
								),
								value: 'figcaption',
							},
							{ label: __( 'Div', 'sgs-blocks' ), value: 'div' },
						] }
						onChange={ ( value ) =>
							setAttributes( { captionTag: value } )
						}
						__nextHasNoMarginBottom
					/>
					{ isImage && (
						<SgsLinkControl
							label={ __( 'Link', 'sgs-blocks' ) }
							help={ __(
								'Search your site or paste a URL to wrap the image in a link. Leave empty for no link.',
								'sgs-blocks'
							) }
							value={ {
								url: attributes.linkUrl || '',
								opensInNewTab: !! attributes.linkOpensNewTab,
								rel: attributes.linkRel || '',
							} }
							onChange={ ( next ) => {
								setAttributes( {
									linkUrl: next.url || '',
									linkOpensNewTab: !! next.opensInNewTab,
									linkRel: next.rel || '',
								} );
							} }
						/>
					) }
				</PanelBody>
			) }

			{ /* SVG controls */ }
			{ isSvg && (
				<PanelBody
					title={ __( 'SVG / Animation', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<p className="components-base-control__help">
						{ __(
							'Paste SVG markup to render it as a foreground content element. Animations use pure CSS — no JavaScript required.',
							'sgs-blocks'
						) }
					</p>
					<TextareaControl
						label={ __( 'SVG code', 'sgs-blocks' ) }
						value={ svgContent || '' }
						onChange={ ( value ) =>
							setAttributes( { svgContent: value } )
						}
						help={ __(
							'Paste your <svg>…</svg> markup here.',
							'sgs-blocks'
						) }
						rows={ 8 }
					/>
					<SelectControl
						label={ __( 'Animation', 'sgs-blocks' ) }
						value={ svgAnimation || 'none' }
						options={ [
							{
								label: __( 'None', 'sgs-blocks' ),
								value: 'none',
							},
							{
								label: __( 'Pulse', 'sgs-blocks' ),
								value: 'pulse',
							},
							{
								label: __( 'Float', 'sgs-blocks' ),
								value: 'float',
							},
							{
								label: __( 'Wave', 'sgs-blocks' ),
								value: 'wave',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { svgAnimation: value } )
						}
						__nextHasNoMarginBottom
					/>
					{ svgAnimation && 'none' !== svgAnimation && (
						<SelectControl
							label={ __( 'Animation speed', 'sgs-blocks' ) }
							value={ svgAnimationSpeed || 'medium' }
							options={ [
								{
									label: __( 'Slow', 'sgs-blocks' ),
									value: 'slow',
								},
								{
									label: __( 'Medium', 'sgs-blocks' ),
									value: 'medium',
								},
								{
									label: __( 'Fast', 'sgs-blocks' ),
									value: 'fast',
								},
							] }
							onChange={ ( value ) =>
								setAttributes( { svgAnimationSpeed: value } )
							}
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>
			) }

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
					<SelectControl
						label={ __( 'Video Source', 'sgs-blocks' ) }
						value={ videoSource || 'external' }
						options={ [
							{
								label: __(
									'External URL (YouTube, Vimeo, MP4)',
									'sgs-blocks'
								),
								value: 'external',
							},
							{
								label: __(
									'WordPress Media Library',
									'sgs-blocks'
								),
								value: 'internal',
							},
						] }
						onChange={ ( value ) =>
							setAttributes( { videoSource: value } )
						}
					/>

					{ 'external' === ( videoSource || 'external' ) && (
						<TextControl
							label={ __( 'Video URL', 'sgs-blocks' ) }
							help={ __(
								'YouTube, Vimeo, or direct MP4/WebM URL. Watch URLs are converted to embed URLs automatically.',
								'sgs-blocks'
							) }
							value={ videoUrl || '' }
							onChange={ ( value ) =>
								setAttributes( { videoUrl: value } )
							}
						/>
					) }

					{ 'internal' === videoSource && (
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectVideo }
								allowedTypes={ [ 'video' ] }
								value={ attributes.videoId }
								render={ ( { open } ) => (
									<Button
										variant="secondary"
										onClick={ open }
									>
										{ attributes.videoId
											? __(
													'Replace Video',
													'sgs-blocks'
											  )
											: __(
													'Select Video',
													'sgs-blocks'
											  ) }
									</Button>
								) }
							/>
						</MediaUploadCheck>
					) }

					{ /* Thumbnail image */ }
					<PanelBody
						title={ __( 'Thumbnail', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<p className="components-base-control__help">
							{ __(
								'Shown before the video plays. Recommended for external embeds.',
								'sgs-blocks'
							) }
						</p>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ onSelectPoster }
								allowedTypes={ [ 'image' ] }
								value={ thumbnailId }
								render={ ( { open } ) => (
									<>
										{ thumbnail && (
											<img
												src={ thumbnail }
												alt={ __(
													'Video thumbnail',
													'sgs-blocks'
												) }
												style={ {
													maxWidth: '100%',
													marginBottom: '8px',
													display: 'block',
												} }
											/>
										) }
										<Button
											variant="secondary"
											onClick={ open }
										>
											{ thumbnail
												? __(
														'Replace Thumbnail',
														'sgs-blocks'
												  )
												: __(
														'Select Thumbnail',
														'sgs-blocks'
												  ) }
										</Button>
										{ thumbnail && (
											<Button
												variant="link"
												isDestructive
												onClick={ () =>
													setAttributes( {
														thumbnailId: null,
														thumbnail: '',
													} )
												}
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

					{ /* Playback options — ToolsPanel (dense-panel-candidate, Spec 35
					     wave-B T-item-2): 6 independent booleans, all with a clear
					     block.json default. Autoplay/Muted/Show-Controls stay
					     isShownByDefault — the background-video pattern (autoplay +
					     muted together) and controls-visibility are the settings
					     operators touch most; Loop/Plays-Inline/Lazy-Load are
					     usually left at their sensible defaults. */ }
					<ToolsPanel
						label={ __( 'Playback Options', 'sgs-blocks' ) }
						resetAll={ () => {
							// Driven off PLAYBACK_TIER_MAP rather than a hand-listed
							// wall of 18 keys, so a new playback boolean cannot be
							// added to the panel and silently forgotten by reset.
							// The map is also the canonical breakpoint-map idiom
							// ({ desktop, tablet, mobile }) that check-control-ux.js
							// recognises as a compliant responsive family — a
							// hand-listed reset reads to that gate as 12 unwrapped
							// direct controls, which is what it flagged before.
							const reset = {};
							PLAYBACK_TIERS.forEach( ( { map, desktopDefault } ) => {
								reset[ map.desktop ] = desktopDefault;
								reset[ map.tablet ] = null;
								reset[ map.mobile ] = null;
							} );
							setAttributes( reset );
						} }
					>
						{ /* Each item is a single BooleanResponsiveControl (Desktop
						     toggle + Tablet/Mobile Inherit/On/Off) rather than 3
						     loose ToggleControls per setting — 6 rows in the panel,
						     not 18, per the design brief's inspector-usability
						     requirement. "It's easy to mute something on a PC... but
						     on mobile people often want mute by default" is exactly
						     the per-device product decision these tiers exist for. */ }
						<ToolsPanelItem
							label={ __( 'Autoplay', 'sgs-blocks' ) }
							hasValue={ () =>
								!! videoAutoplay ||
								null !==
									( attributes.videoAutoplayTablet ??
										null ) ||
								null !==
									( attributes.videoAutoplayMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoAutoplay: false,
									videoAutoplayTablet: null,
									videoAutoplayMobile: null,
								} )
							}
							isShownByDefault
						>
							<BooleanResponsiveControl
								label={ __( 'Autoplay', 'sgs-blocks' ) }
								help={ __(
									'Autoplay requires Muted to be enabled on most browsers — turning Autoplay on for a tier automatically mutes that tier too.',
									'sgs-blocks'
								) }
								attrBase="videoAutoplay"
								attrTablet="videoAutoplayTablet"
								attrMobile="videoAutoplayMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Loop', 'sgs-blocks' ) }
							hasValue={ () =>
								!! videoLoop ||
								null !==
									( attributes.videoLoopTablet ?? null ) ||
								null !== ( attributes.videoLoopMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoLoop: false,
									videoLoopTablet: null,
									videoLoopMobile: null,
								} )
							}
						>
							<BooleanResponsiveControl
								label={ __( 'Loop', 'sgs-blocks' ) }
								attrBase="videoLoop"
								attrTablet="videoLoopTablet"
								attrMobile="videoLoopMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Muted', 'sgs-blocks' ) }
							hasValue={ () =>
								videoMuted === false ||
								null !==
									( attributes.videoMutedTablet ?? null ) ||
								null !== ( attributes.videoMutedMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoMuted: true,
									videoMutedTablet: null,
									videoMutedMobile: null,
								} )
							}
							isShownByDefault
						>
							<BooleanResponsiveControl
								label={ __( 'Muted', 'sgs-blocks' ) }
								help={ __(
									'It’s easy to unmute on a PC — but on mobile, visitors often expect audio off by default, like social-media video. Set it per device here.',
									'sgs-blocks'
								) }
								attrBase="videoMuted"
								attrTablet="videoMutedTablet"
								attrMobile="videoMutedMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Show Controls', 'sgs-blocks' ) }
							hasValue={ () =>
								videoControls === false ||
								null !==
									( attributes.videoControlsTablet ??
										null ) ||
								null !==
									( attributes.videoControlsMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoControls: true,
									videoControlsTablet: null,
									videoControlsMobile: null,
								} )
							}
							isShownByDefault
						>
							<BooleanResponsiveControl
								label={ __( 'Show Controls', 'sgs-blocks' ) }
								attrBase="videoControls"
								attrTablet="videoControlsTablet"
								attrMobile="videoControlsMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Plays Inline (iOS)', 'sgs-blocks' ) }
							hasValue={ () =>
								videoPlaysInline === false ||
								null !==
									( attributes.videoPlaysInlineTablet ??
										null ) ||
								null !==
									( attributes.videoPlaysInlineMobile ??
										null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoPlaysInline: true,
									videoPlaysInlineTablet: null,
									videoPlaysInlineMobile: null,
								} )
							}
						>
							<BooleanResponsiveControl
								label={ __(
									'Plays Inline (iOS)',
									'sgs-blocks'
								) }
								help={ __(
									'Prevents iOS from opening the video in full screen automatically.',
									'sgs-blocks'
								) }
								attrBase="videoPlaysInline"
								attrTablet="videoPlaysInlineTablet"
								attrMobile="videoPlaysInlineMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Lazy Load', 'sgs-blocks' ) }
							hasValue={ () =>
								videoLazyLoad === false ||
								null !==
									( attributes.videoLazyLoadTablet ??
										null ) ||
								null !==
									( attributes.videoLazyLoadMobile ?? null )
							}
							onDeselect={ () =>
								setAttributes( {
									videoLazyLoad: true,
									videoLazyLoadTablet: null,
									videoLazyLoadMobile: null,
								} )
							}
						>
							<BooleanResponsiveControl
								label={ __( 'Lazy Load', 'sgs-blocks' ) }
								help={ __(
									'Load video only when scrolled into view.',
									'sgs-blocks'
								) }
								attrBase="videoLazyLoad"
								attrTablet="videoLazyLoadTablet"
								attrMobile="videoLazyLoadMobile"
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>
					</ToolsPanel>
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
				<img
					src={ imageUrl }
					alt={ imageIsDecorative ? '' : imageAlt }
					aria-hidden={ imageIsDecorative ? 'true' : undefined }
					className="sgs-media__img"
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
