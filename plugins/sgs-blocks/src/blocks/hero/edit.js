import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	TextControl,
	TextareaControl,
	ToggleControl,
	Notice,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	ResponsiveControl,
	ResponsiveOverride,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	ShadowControl,
} from '../../components';
import MediaPicker from '../../components/MediaPicker';
import { resolveShadowPreview } from '../../utils';
// No-inline migration (2026-07-09): hero no longer uses the default
// <ContainerWrapperControls> aggregator — its unconditional "Content band" /
// per-grid-area panels write to LEGACY FLAT attrs, which would become dead
// controls once contentBandPadding / contentPadding / mediaPadding become box
// objects. Import the individual panels still needed instead (mirrors
// sgs/container's own edit.js, which took the same approach); hero rolls its
// own "Content band" / "Content area" / "Media area" panels below using
// ResponsiveBoxControl bound to the new object attrs.
import {
	WidthPanel,
	LayoutPanel,
	BackgroundPanel,
	ShapeDividersPanel,
	GridItemDefaultsPanel,
} from '../container/components/ContainerWrapperControls';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem, UnitControl } from '../../components/primitives';

// ── Phase 1 constant options ─────────────────────────────────────────────────

const BORDER_STYLE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
];

const IMAGE_FIT_OPTIONS = [
	{ label: __( 'Cover', 'sgs-blocks' ), value: 'cover' },
	{ label: __( 'Contain', 'sgs-blocks' ), value: 'contain' },
	{ label: __( 'Fill', 'sgs-blocks' ), value: 'fill' },
	{ label: __( 'Match height', 'sgs-blocks' ), value: 'match-height' },
	{ label: __( 'Match width', 'sgs-blocks' ), value: 'match-width' },
	{ label: __( 'Custom (explicit width/height)', 'sgs-blocks' ), value: 'custom' },
];

const UNIT_PX_PCT = [
	{ label: 'px', value: 'px' },
	{ label: '%', value: '%' },
];

const UNIT_PX_EM_REM = [
	{ label: 'px', value: 'px' },
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
];

const VERTICAL_ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'bottom' },
];

const COLUMN_RATIO_PRESETS = [
	{ label: __( '1:1 Equal', 'sgs-blocks' ), value: '1fr 1fr' },
	{ label: __( '2:1', 'sgs-blocks' ), value: '2fr 1fr' },
	{ label: __( '1:2', 'sgs-blocks' ), value: '1fr 2fr' },
	{ label: __( '3:2', 'sgs-blocks' ), value: '3fr 2fr' },
	{ label: __( '2:3', 'sgs-blocks' ), value: '2fr 3fr' },
	{ label: __( '60:40', 'sgs-blocks' ), value: '60% 40%' },
	{ label: __( '70:30', 'sgs-blocks' ), value: '70% 30%' },
	{ label: __( '40:60', 'sgs-blocks' ), value: '40% 60%' },
	{ label: __( '30:70', 'sgs-blocks' ), value: '30% 70%' },
	{ label: __( 'Custom...', 'sgs-blocks' ), value: 'custom' },
];

const MOBILE_ORDER_OPTIONS = [
	{ label: __( 'Media first (image on top)', 'sgs-blocks' ), value: 'media-first' },
	{ label: __( 'Content first (text on top)', 'sgs-blocks' ), value: 'content-first' },
];

// Desktop/tablet column order (Spec 35 Track 1b Phase 1.4c — promoted from the
// mobile-only splitContentOrderMobile orphan to a full responsive triple).
// Desktop/tablet decide LEFT/RIGHT column order (the split is a 2-col grid at
// >=768px); mobile decides ABOVE/BELOW because mobile always stacks. Same
// underlying values ('' / 'content-first' / 'media-first') as
// MOBILE_ORDER_OPTIONS — only the labels change per tier so a non-technical
// client understands which axis they're setting.
const DESKTOP_ORDER_OPTIONS = [
	{ label: __( 'Content left, image right (default)', 'sgs-blocks' ), value: '' },
	{ label: __( 'Image left, content right', 'sgs-blocks' ), value: 'media-first' },
];

const TABLET_ORDER_OPTIONS = [
	{ label: __( 'Same as desktop', 'sgs-blocks' ), value: '' },
	{ label: __( 'Content first (left if side-by-side, top if stacked)', 'sgs-blocks' ), value: 'content-first' },
	{ label: __( 'Image first (left if side-by-side, top if stacked)', 'sgs-blocks' ), value: 'media-first' },
];

/**
 * Responsive RangeControl helper.
 * Renders a RangeControl wrapped in ResponsiveControl, mapping
 * attrDesktop/Tablet/Mobile attribute names automatically.
 */
function RRangeControl( { label, attrDesktop, attrTablet, attrMobile, attributes, setAttributes, min = 0, max = 200, step = 1, nullOnZero = true } ) {
	return (
		<ResponsiveControl label={ label }>
			{ ( bp ) => {
				const key = { desktop: attrDesktop, tablet: attrTablet, mobile: attrMobile }[ bp ];
				const val = attributes[ key ] || 0;
				return (
					<RangeControl
						value={ val }
						onChange={ ( v ) => setAttributes( { [ key ]: nullOnZero ? ( v || null ) : v } ) }
						min={ min }
						max={ max }
						step={ step }
						__nextHasNoMarginBottom
					/>
				);
			} }
		</ResponsiveControl>
	);
}

/**
 * FR-22-6: full content column template.
 * Produces: eyebrow label → headline (h1) → sub-headline paragraph → CTA buttons.
 * Converter supplies sgs/label + sgs/heading + sgs/text + sgs/multi-button.
 */
const HERO_CONTENT_TEMPLATE = [
	[ 'sgs/label', { className: 'sgs-hero__label', text: __( 'Eyebrow label', 'sgs-blocks' ) } ],
	[ 'sgs/heading', { level: 'h1', className: 'sgs-hero__headline', content: __( 'Your hero headline', 'sgs-blocks' ) } ],
	[ 'sgs/text', { className: 'sgs-hero__subheadline', text: __( 'Supporting sub-headline text goes here.', 'sgs-blocks' ) } ],
	[ 'sgs/multi-button', {}, [
		[ 'sgs/button', { inheritStyle: 'primary', label: __( 'Primary Action', 'sgs-blocks' ) } ],
		[ 'sgs/button', { inheritStyle: 'secondary', label: __( 'Secondary Action', 'sgs-blocks' ) } ],
	] ],
];

const VARIANT_OPTIONS = [
	{ label: __( 'Standard', 'sgs-blocks' ), value: 'standard' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
	{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
	{ label: __( 'SVG Animated', 'sgs-blocks' ), value: 'svg-animated' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'centre' },
];

// HC2: per-breakpoint content text-align. Values are raw CSS text-align values
// (consumed by render.php on .sgs-hero__content). Empty = inherit variant default.
const TEXT_ALIGN_OPTIONS = [
	{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

const CTA_STYLE_OPTIONS = [
	{ label: __( 'Accent', 'sgs-blocks' ), value: 'accent' },
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		variant,
		splitImageBleed,
		alignment,
		backgroundImage,
		overlayColour,
		overlayOpacity,
		splitImage,
		splitImageTablet,
		splitImageMobile,
		splitMedia,
		svgContent,
		minHeight,
		shadow,
		headlineMarginBottom,
		headlineMarginBottomMobile,
		subHeadlineMaxWidth,
		subHeadlineMarginBottom,
		subHeadlineMarginBottomMobile,
		bgParallax,
		bgKenBurns,
		bgVideo,
		bgVideoMobile,
		// Phase 1 — image display.
		imageObjectFit,
		imageWidth,
		imageWidthTablet,
		imageWidthMobile,
		imageWidthUnit,
		// imageHeight is a TIER OBJECT {desktop,tablet,mobile} as of 2026-08-10 —
		// the imageHeightTablet/imageHeightMobile siblings no longer exist.
		imageHeight,
		imageHeightUnit,
		// Box-object families (contract §B, 2026-07-09).
		imageBorderRadius,
		imageBorderRadiusTablet,
		imageBorderRadiusMobile,
		imageBorderStyle,
		imageBorderWidth,
		imageBorderColour,
		imagePadding,
		imagePaddingTablet,
		imagePaddingMobile,
		contentBackground,
		contentPadding,
		contentPaddingTablet,
		contentPaddingMobile,
		mediaBackground,
		mediaPadding,
		mediaPaddingTablet,
		mediaPaddingMobile,
		contentBandBackground,
		contentBandPadding,
		contentBandPaddingTablet,
		contentBandPaddingMobile,
		// Phase 1 — layout grid. splitColumnRatio* retired (Step 6, 2026-06-11);
		// render.php now reads gridTemplateColumns* for the split variant.
		gridTemplateColumns,
		splitContentOrderMobile,
		splitContentOrder,
		splitContentOrderTablet,
		// Phase 1 — vertical alignment.
		verticalAlignment,
		// HC2 — per-breakpoint text alignment on .sgs-hero__content.
		textAlignDesktop,
		textAlignTablet,
		textAlignMobile,
	} = attributes;

	const isSplit = variant === 'split';
	const isVideo = variant === 'video';
	const isSvgAnimated = variant === 'svg-animated';

	const wrapperStyle = {};
	if ( ! isSplit && ! isVideo && ! isSvgAnimated && backgroundImage?.url ) {
		wrapperStyle.backgroundImage = `url(${ backgroundImage.url })`;
		wrapperStyle.backgroundSize = 'cover';
		wrapperStyle.backgroundPosition = 'center';
	}
	if ( minHeight ) {
		wrapperStyle.minHeight = minHeight;
	}
	if ( shadow ) {
		wrapperStyle.boxShadow = resolveShadowPreview( shadow );
	}
	// HC2: desktop text-align preview for the content column.
	// Also preview contentBackground when set.
	const contentPreviewStyle = {};
	if ( textAlignDesktop ) {
		contentPreviewStyle.textAlign = textAlignDesktop;
	}
	if ( contentBackground ) {
		contentPreviewStyle.backgroundColor = contentBackground;
	}

	const className = [
		'sgs-hero',
		`sgs-hero--${ variant }`,
		`sgs-hero--align-${ alignment }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className, style: wrapperStyle } );

	// FR-22-6: content column uses InnerBlocks (label + heading + text + buttons).
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-hero__content', style: contentPreviewStyle },
		{
			template: HERO_CONTENT_TEMPLATE,
			templateLock: false,
		}
	);

	return (
		<>
			{/* ── Settings tab (default InspectorControls group) — behaviour: variant,
			   media selection/data-source, content. ── */}
			<InspectorControls>
				{/* ── 1. Hero Settings (variant only) ── */}
				<PanelBody title={ __( 'Hero Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Variant', 'sgs-blocks' ) }
						value={ variant }
						options={ VARIANT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { variant: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{/* ── Image (media selection only — appearance/styling controls for
				   the same image live in the "Image" panel on the Styles tab). ── */}
				<PanelBody title={ __( 'Image', 'sgs-blocks' ) } initialOpen={ false }>
					{ ! isSplit && ! isVideo && ! isSvgAnimated && (
						<>
							<p style={ { fontWeight: 600, margin: '0 0 4px' } }>{ __( 'Background image', 'sgs-blocks' ) }</p>
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ ( media ) =>
										setAttributes( {
											backgroundImage: {
												id: media.id,
												url: media.url,
												alt: media.alt,
											},
										} )
									}
									allowedTypes={ [ 'image' ] }
									value={ backgroundImage?.id }
									render={ ( { open } ) => (
										<div>
											{ backgroundImage?.url ? (
												<>
													<img
														src={ backgroundImage.url }
														alt=""
														style={ {
															maxWidth: '100%',
															marginBottom: '8px',
														} }
													/>
													<Button
														variant="secondary"
														onClick={ () =>
															setAttributes( {
																backgroundImage:
																	undefined,
															} )
														}
														isDestructive
													>
														{ __(
															'Remove image',
															'sgs-blocks'
														) }
													</Button>
												</>
											) : (
												<Button
													variant="secondary"
													onClick={ open }
												>
													{ __(
														'Select background image',
														'sgs-blocks'
													) }
												</Button>
											) }
										</div>
									) }
								/>
							</MediaUploadCheck>
						</>
					) }

					{ isSplit && (
						<>
							<p style={ { fontWeight: 600, margin: '0 0 4px' } }>{ __( 'Split media source', 'sgs-blocks' ) }</p>
							<MediaPicker
								value={
									splitMedia ||
									( splitImage?.url
										? {
												url: splitImage.url,
												type: 'image',
												id: splitImage.id || 0,
												alt: splitImage.alt || '',
												mime: '',
										  }
										: null )
								}
								onChange={ ( media ) =>
									setAttributes( {
										splitMedia: media,
										splitImage:
											media && media.type === 'image'
												? {
														id: media.id,
														url: media.url,
														alt: media.alt,
												  }
												: undefined,
									} )
								}
								onRemove={ () =>
									setAttributes( {
										splitMedia: null,
										splitImage: undefined,
									} )
								}
								label={ __( 'Select hero media', 'sgs-blocks' ) }
								instructionsImage={ __( 'Choose an image or video for the hero', 'sgs-blocks' ) }
							/>

							{ /* Art direction. `splitImageMobile` was render-consumed and
							     `splitImageTablet` was declared-but-dead, and NEITHER had an editor
							     control — so only the cloning pipeline could set them and a client
							     could not crop their own hero for narrow screens. One device-switched
							     control rather than three stacked pickers: that is the SGS canonical
							     shape, and `check-control-ux` enforces it (it flagged the stacked
							     version as RESPONSIVE-FAMILY-WITHOUT-SWITCHER). The switcher also
							     drives WP's native canvas preview, so the picker and the preview
							     always agree about which tier you are editing. */ }
							<ResponsiveControl label={ __( 'Split image', 'sgs-blocks' ) }>
								{ ( bp ) => {
									const key = {
										desktop: 'splitImage',
										tablet: 'splitImageTablet',
										mobile: 'splitImageMobile',
									}[ bp ];
									const current = attributes[ key ];
									return (
										<MediaPicker
											value={
												current?.url
													? { ...current, type: 'image' }
													: null
											}
											onChange={ ( media ) =>
												setAttributes( {
													[ key ]:
														media && media.url
															? {
																	id: media.id || 0,
																	url: media.url,
																	alt: media.alt || '',
															  }
															: undefined,
												} )
											}
											onRemove={ () =>
												setAttributes( { [ key ]: undefined } )
											}
											label={
												'desktop' === bp
													? __( 'Main image', 'sgs-blocks' )
													: __( 'Override for this screen size', 'sgs-blocks' )
											}
											instructionsImage={
												'desktop' === bp
													? __( 'The image used unless a narrower size overrides it.', 'sgs-blocks' )
													: __( 'Optional. Leave empty to use the main image at this size.', 'sgs-blocks' )
											}
										/>
									);
								} }
							</ResponsiveControl>
						</>
					) }

					{ ! isSplit && ! isVideo && ! isSvgAnimated && (
						<ResponsiveControl label={ __( 'Background video', 'sgs-blocks' ) }>
							{ ( breakpoint ) => {
								const isDesktop = breakpoint !== 'mobile';
								const videoAttr   = isDesktop ? bgVideo   : bgVideoMobile;
								const attrKey     = isDesktop ? 'bgVideo' : 'bgVideoMobile';
								return (
									<MediaUploadCheck>
										<MediaUpload
											onSelect={ ( media ) =>
												setAttributes( {
													[ attrKey ]: { id: media.id, url: media.url },
												} )
											}
											allowedTypes={ [ 'video' ] }
											value={ videoAttr?.id }
											render={ ( { open } ) => (
												<div>
													{ videoAttr?.url ? (
														<>
															<p style={ { fontSize: '12px', margin: '0 0 4px' } }>
																{ videoAttr.url.split( '/' ).pop() }
															</p>
															<Button
																variant="secondary"
																isDestructive
																onClick={ () =>
																	setAttributes( { [ attrKey ]: undefined } )
																}
															>
																{ __( 'Remove', 'sgs-blocks' ) }
															</Button>
														</>
													) : (
														<Button variant="secondary" onClick={ open }>
															{ isDesktop
																? __( 'Select video', 'sgs-blocks' )
																: __( 'Select mobile video', 'sgs-blocks' ) }
														</Button>
													) }
												</div>
											) }
										/>
									</MediaUploadCheck>
								);
							} }
						</ResponsiveControl>
					) }
				</PanelBody>

				{/* ── Video Background (video variant only — media selection) ── */}
				{ isVideo && (
					<PanelBody
						title={ __( 'Background Video', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={ ( media ) =>
									setAttributes( {
										bgVideo: {
											id: media.id,
											url: media.url,
										},
									} )
								}
								allowedTypes={ [ 'video' ] }
								value={ bgVideo?.id }
								render={ ( { open } ) => (
									<div>
										{ bgVideo?.url ? (
											<>
												<video
													src={ bgVideo.url }
													controls
													style={ {
														maxWidth: '100%',
														marginBottom: '8px',
													} }
												/>
												<Button
													variant="secondary"
													onClick={ () =>
														setAttributes( {
															bgVideo:
																undefined,
														} )
													}
													isDestructive
												>
													{ __(
														'Remove video',
														'sgs-blocks'
													) }
												</Button>
											</>
										) : (
											<Button
												variant="secondary"
												onClick={ open }
											>
												{ __(
													'Select background video (MP4/WebM)',
													'sgs-blocks'
												) }
											</Button>
										) }
									</div>
								) }
							/>
						</MediaUploadCheck>
					</PanelBody>
				) }

				{/* ── SVG Background (svg-animated variant only — content markup) ── */}
				{ isSvgAnimated && (
					<PanelBody
						title={ __( 'SVG Background', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<TextareaControl
							label={ __( 'SVG markup', 'sgs-blocks' ) }
							value={ svgContent || '' }
							onChange={ ( val ) =>
								setAttributes( { svgContent: val } )
							}
							rows={ 10 }
							help={ __(
								'Paste your SVG code here. Animation will be handled by the SVG itself.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{/* ── Buttons ── */}
				<PanelBody
					title={ __( 'Buttons', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<Notice status="info" isDismissible={ false }>
						{ __( 'Buttons are now managed using the SGS Button Group block inside the hero. Click on a button in the editor to configure its style, colour, and link.', 'sgs-blocks' ) }
					</Notice>
				</PanelBody>
			</InspectorControls>

			{/* ── Styles tab — appearance: colour, spacing, borders, shadows,
			   layout/grid geometry, hover/effects. ── */}
			<InspectorControls group="styles">
				{/* ── 2. Container / Entire Block ── */}
				{ /* Converted to ToolsPanel/ToolsPanelItem (Spec 35 T4.1 tail, audit-inspector-conformance
				     dense-panel-candidate — 14 control-like elements). hasValue/onDeselect check against
				     the DECLARED block.json defaults (D328): alignment='left', verticalAlignment='center',
				     textAlign{Desktop,Tablet,Mobile}='', minHeight='' / minHeightTablet='' / minHeightMobile='360px',
				     contentBackground='', contentPadding{,Tablet,Mobile}={}, gridTemplateColumns{,Tablet,Mobile}='',
				     splitContentOrderMobile='media-first', splitImageBleed=false. Text/vertical alignment are
				     isShownByDefault (touched on nearly every hero instance); the rest are opt-in via the "+" menu. */ }
				<PanelBody title={ __( 'Container / Entire Block', 'sgs-blocks' ) }>
					{ /* The ToolsPanel label deliberately does NOT repeat the
					     PanelBody title above it. It did until 2026-08-08, which
					     rendered the same words twice in a row in the sidebar and
					     read to a client as two panels rather than one. A nested
					     ToolsPanel names the CLUSTER it resets, not its parent. */ }
					<ToolsPanel
						label={ __( 'Alignment & split layout', 'sgs-blocks' ) }
						resetAll={ () => {
							setAttributes( {
								alignment: 'left',
								verticalAlignment: 'center',
								textAlignDesktop: '',
								textAlignTablet: '',
								textAlignMobile: '',
								minHeight: '',
								minHeightTablet: '',
								minHeightMobile: '360px',
								contentBackground: '',
								contentPadding: {},
								contentPaddingTablet: {},
								contentPaddingMobile: {},
								...( isSplit && {
									gridTemplateColumns: '',
									splitContentOrder: '',
									splitContentOrderTablet: '',
									splitContentOrderMobile: 'media-first',
									splitImageBleed: false,
								} ),
							} );
						} }
					>
						<ToolsPanelItem
							label={ __( 'Text alignment', 'sgs-blocks' ) }
							hasValue={ () => alignment !== 'left' }
							onDeselect={ () => setAttributes( { alignment: 'left' } ) }
							isShownByDefault
						>
							<ToggleGroupControl
								label={ __( 'Text alignment', 'sgs-blocks' ) }
								value={ alignment }
								onChange={ ( val ) =>
									setAttributes( { alignment: val } )
								}
								isBlock
								__nextHasNoMarginBottom
							>
								{ ALIGN_OPTIONS.map( ( opt ) => (
									<ToggleGroupControlOption
										key={ opt.value }
										value={ opt.value }
										label={ opt.label }
									/>
								) ) }
							</ToggleGroupControl>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Vertical alignment', 'sgs-blocks' ) }
							hasValue={ () => verticalAlignment !== 'center' }
							onDeselect={ () => setAttributes( { verticalAlignment: 'center' } ) }
							isShownByDefault
						>
							<SelectControl
								label={ __( 'Vertical alignment', 'sgs-blocks' ) }
								value={ verticalAlignment }
								options={ VERTICAL_ALIGN_OPTIONS }
								onChange={ ( val ) => setAttributes( { verticalAlignment: val } ) }
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>

						{/* HC2: per-breakpoint text-align on the content column.
						    Empty = inherit the variant's own alignment. */}
						<ToolsPanelItem
							label={ __( 'Content text align', 'sgs-blocks' ) }
							hasValue={ () =>
								!! textAlignDesktop || !! textAlignTablet || !! textAlignMobile
							}
							onDeselect={ () =>
								setAttributes( {
									textAlignDesktop: '',
									textAlignTablet: '',
									textAlignMobile: '',
								} )
							}
						>
							<ResponsiveControl
								label={ __( 'Content text align', 'sgs-blocks' ) }
							>
								{ ( breakpoint ) => {
									const attrMap = {
										desktop: 'textAlignDesktop',
										tablet: 'textAlignTablet',
										mobile: 'textAlignMobile',
									};
									return (
										<SelectControl
											value={ attributes[ attrMap[ breakpoint ] ] || '' }
											options={ TEXT_ALIGN_OPTIONS }
											onChange={ ( val ) =>
												setAttributes( {
													[ attrMap[ breakpoint ] ]: val,
												} )
											}
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Min height', 'sgs-blocks' ) }
							hasValue={ () =>
								!! minHeight ||
								!! attributes.minHeightTablet ||
								attributes.minHeightMobile !== '360px'
							}
							onDeselect={ () =>
								setAttributes( {
									minHeight: '',
									minHeightTablet: '',
									minHeightMobile: '360px',
								} )
							}
						>
							<ResponsiveControl
								label={ __( 'Min height', 'sgs-blocks' ) }
							>
								{ ( breakpoint ) => {
									const attrMap = {
										desktop: 'minHeight',
										tablet: 'minHeightTablet',
										mobile: 'minHeightMobile',
									};
									return (
										<SelectControl
											value={
												attributes[
													attrMap[ breakpoint ]
												]
											}
											// ⚑ DELIBERATE divergence from the shared MIN_HEIGHT_OPTIONS
											// (container/components/ContainerWrapperControls.js) — decided,
											// not an oversight (Spec 35 Track 1b Phase 1.4c). Kept because:
											// (1) minHeightMobile's own declared default is "360px"
											// (block.json), which isn't in the shared list at all — aligning
											// would make the block's own default unselectable in its dropdown.
											// (2) A hero is a full-bleed section; 80vh/520px are realistic
											// hero heights the shared list (built for generic containers,
											// which top out lower) doesn't offer. (3) The shared list's
											// "closed" set is already not authoritative elsewhere —
											// sgs/physics-canvas defaults minHeight to "480px", a value in
											// NEITHER list, so a hero-specific list matching a hero-specific
											// default is the more honest approach, not the odd one out.
											options={ [
												{ label: __( 'Auto (fit content)', 'sgs-blocks' ), value: '' },
												{ label: '50vh',  value: '50vh'  },
												{ label: '75vh',  value: '75vh'  },
												{ label: '80vh',  value: '80vh'  },
												{ label: '100vh', value: '100vh' },
												{ label: '360px', value: '360px' },
												{ label: '400px', value: '400px' },
												{ label: '520px', value: '520px' },
												{ label: '600px', value: '600px' },
											] }
											onChange={ ( val ) =>
												setAttributes( {
													[ attrMap[ breakpoint ] ]:
														val,
												} )
											}
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>
						</ToolsPanelItem>

						{ /* Media background/padding controls live in the "Image" panel's
						     "Outer padding" section below (mediaBackground/mediaPadding*
						     box-object attrs) — the legacy mediaBackgroundColour control
						     was removed (one control per setting); deprecated.js v7
						     migrates the legacy value. */ }

						<ToolsPanelItem
							label={ __( 'Content area', 'sgs-blocks' ) }
							hasValue={ () =>
								!! contentBackground ||
								Object.keys( contentPadding ?? {} ).length > 0 ||
								Object.keys( contentPaddingTablet ?? {} ).length > 0 ||
								Object.keys( contentPaddingMobile ?? {} ).length > 0
							}
							onDeselect={ () =>
								setAttributes( {
									contentBackground: '',
									contentPadding: {},
									contentPaddingTablet: {},
									contentPaddingMobile: {},
								} )
							}
						>
							<p style={ { fontWeight: 600, margin: '0 0 4px' } }>{ __( 'Content area', 'sgs-blocks' ) }</p>
							<DesignTokenPicker
								label={ __( 'Content background colour', 'sgs-blocks' ) }
								value={ contentBackground || '' }
								onChange={ ( val ) => setAttributes( { contentBackground: val } ) }
							/>
							<ResponsiveBoxControl
								label={ __( 'Content padding', 'sgs-blocks' ) }
								values={ {
									base: contentPadding ?? {},
									tablet: contentPaddingTablet ?? {},
									mobile: contentPaddingMobile ?? {},
								} }
								onChange={ ( tier, next ) => {
									const attrMap = {
										base: 'contentPadding',
										tablet: 'contentPaddingTablet',
										mobile: 'contentPaddingMobile',
									};
									setAttributes( { [ attrMap[ tier ] ]: next } );
								} }
							/>
						</ToolsPanelItem>

						{ isSplit && (
							<ToolsPanelItem
								label={ __( 'Split layout grid', 'sgs-blocks' ) }
								hasValue={ () =>
									!! gridTemplateColumns ||
										!! splitContentOrder ||
									!! splitContentOrderTablet ||
									splitContentOrderMobile !== 'media-first' ||
									!! splitImageBleed
								}
								onDeselect={ () =>
									setAttributes( {
										gridTemplateColumns: '',
										splitContentOrder: '',
										splitContentOrderTablet: '',
										splitContentOrderMobile: 'media-first',
										splitImageBleed: false,
									} )
								}
							>
								<p style={ { fontWeight: 600, margin: '0 0 4px' } }>{ __( 'Split layout grid', 'sgs-blocks' ) }</p>
								{ /*
								     `gridTemplateColumns` is a TIER OBJECT (Spec 35 pass 3a) —
								     ONE attr holding {desktop,tablet,mobile}. ResponsiveOverride
								     owns the active tier, so the old per-tier attr map is gone;
								     the desktop PRESET picker is preserved by keying it on the
								     desktop tier's own value rather than on a separate attr.
								*/ }
								<ResponsiveOverride
									label={ __( 'Column ratio', 'sgs-blocks' ) }
									value={ gridTemplateColumns }
									onChange={ ( obj ) => setAttributes( { gridTemplateColumns: obj } ) }
								>
									{ ( { ownValue, effectiveValue, inherited, setOwnValue, tier } ) => {
										// The preset picker is a DESKTOP affordance: the presets are
										// whole-layout ratios, while a tablet/mobile override is a
										// free-text refinement of the inherited desktop choice.
										// `tier` comes straight from ResponsiveOverride's render-prop
										// payload (ResponsiveOverride.js:116) — the active tier from
										// the ONE global device toggle.
										if ( 'desktop' === tier ) {
											const isCustom = ! COLUMN_RATIO_PRESETS.some(
												( p ) => p.value !== 'custom' && p.value === ownValue
											);
											return (
												<>
													<SelectControl
														label={ __( 'Preset', 'sgs-blocks' ) }
														value={ isCustom ? 'custom' : ownValue }
														options={ COLUMN_RATIO_PRESETS }
														onChange={ ( val ) => { if ( val !== 'custom' ) { setOwnValue( val ); } } }
														__nextHasNoMarginBottom
													/>
													{ isCustom && (
														<TextControl
															label={ __( 'Custom ratio', 'sgs-blocks' ) }
															help={ __( 'CSS grid-template-columns (e.g. "3fr 2fr").', 'sgs-blocks' ) }
															value={ ownValue || '' }
															onChange={ ( val ) => setOwnValue( val ) }
															__nextHasNoMarginBottom
														/>
													) }
												</>
											);
										}
										return (
											<TextControl
												help={ __( 'Blank = inherit the tier above.', 'sgs-blocks' ) }
												value={ ownValue || '' }
												placeholder={ inherited ? effectiveValue || '' : '' }
												onChange={ ( val ) => setOwnValue( val ) }
												__nextHasNoMarginBottom
											/>
										);
									} }
								</ResponsiveOverride>
								{ /* Column gap de-duped 2026-07-06 — the split grid gap is
								     the container gap, controlled by the shared "Gap" control
								     (ContainerWrapperControls, gap/gapTablet/gapMobile). The
								     bespoke splitGap* "Column gap" control was a duplicate. */ }
								<ResponsiveControl label={ __( 'Column / stacking order', 'sgs-blocks' ) }>
									{ ( breakpoint ) => {
										const orderAttrMap = {
											desktop: 'splitContentOrder',
											tablet: 'splitContentOrderTablet',
											mobile: 'splitContentOrderMobile',
										};
										const orderOptionsMap = {
											desktop: DESKTOP_ORDER_OPTIONS,
											tablet: TABLET_ORDER_OPTIONS,
											mobile: MOBILE_ORDER_OPTIONS,
										};
										const orderLabelMap = {
											desktop: __( 'Desktop order', 'sgs-blocks' ),
											tablet: __( 'Tablet order', 'sgs-blocks' ),
											mobile: __( 'Mobile stacking order', 'sgs-blocks' ),
										};
										const orderHelpMap = {
											desktop: __( 'Which column sits on the left when content and image are side by side.', 'sgs-blocks' ),
											tablet: __( 'Overrides desktop for tablet screens only. If your tablet grid is side by side this sets left/right; if it stacks (single column) this sets top/bottom.', 'sgs-blocks' ),
											mobile: __( 'Mobile always stacks into a single column — this sets which section shows on top.', 'sgs-blocks' ),
										};
										const orderKey = orderAttrMap[ breakpoint ];
										return (
											<SelectControl
												label={ orderLabelMap[ breakpoint ] }
												value={ attributes[ orderKey ] }
												options={ orderOptionsMap[ breakpoint ] }
												help={ orderHelpMap[ breakpoint ] }
												onChange={ ( val ) => setAttributes( { [ orderKey ]: val } ) }
												__nextHasNoMarginBottom
											/>
										);
									} }
								</ResponsiveControl>
								<ToggleControl
									label={ __( 'Image bleed to edge', 'sgs-blocks' ) }
									help={ __( 'Removes border-radius and column padding so the photo fills flush to the container edge.', 'sgs-blocks' ) }
									checked={ !! splitImageBleed }
									onChange={ ( val ) =>
										setAttributes( { splitImageBleed: val } )
									}
									__nextHasNoMarginBottom
								/>
							</ToolsPanelItem>
						) }
					</ToolsPanel>
				</PanelBody>

				{/* ── 4. Headline (h1) ── */}
				<PanelBody title={ __( 'Headline (h1)', 'sgs-blocks' ) } initialOpen={ false }>
					<RRangeControl
						label={ __( 'Margin bottom', 'sgs-blocks' ) }
						attrDesktop="headlineMarginBottom"
						attrTablet="headlineMarginBottom"
						attrMobile="headlineMarginBottomMobile"
						attributes={ attributes }
						setAttributes={ setAttributes }
						min={ 0 }
						max={ 120 }
						step={ 1 }
					/>
					<p style={ { fontSize: '11px', color: '#757575', margin: '-4px 0 8px' } }>
						{ __( '0 = inherit from theme.', 'sgs-blocks' ) }
					</p>
				</PanelBody>

				{/* ── 5. Subheadline ── */}
				<PanelBody title={ __( 'Subheadline', 'sgs-blocks' ) } initialOpen={ false }>
					{/* Font size (desktop + responsive) is owned by the child sgs/text
					    block across all breakpoints. Only max-width / margins remain here. */}
					<RangeControl
						label={ __( 'Max width (px)', 'sgs-blocks' ) }
						help={ __( 'Limits sub-headline width for readability. 0 = no limit.', 'sgs-blocks' ) }
						value={ subHeadlineMaxWidth || 0 }
						onChange={ ( val ) =>
							setAttributes( { subHeadlineMaxWidth: val || null } )
						}
						min={ 0 }
						max={ 1200 }
						step={ 10 }
						__nextHasNoMarginBottom
					/>
					<RRangeControl
						label={ __( 'Margin bottom', 'sgs-blocks' ) }
						attrDesktop="subHeadlineMarginBottom"
						attrTablet="subHeadlineMarginBottom"
						attrMobile="subHeadlineMarginBottomMobile"
						attributes={ attributes }
						setAttributes={ setAttributes }
						min={ 0 }
						max={ 120 }
						step={ 1 }
					/>
					<p style={ { fontSize: '11px', color: '#757575', margin: '-4px 0 8px' } }>
						{ __( '0 = inherit from theme.', 'sgs-blocks' ) }
					</p>
				</PanelBody>

				{/* ── 6. Image styling (appearance only — media SELECTION for this
				   image lives in the "Image" panel on the Settings tab). ── */}
				{ /* SKIP-REASON (Spec 35 T4.1 tail, audit-inspector-conformance dense-panel-candidate):
				     this panel is a MODE-WIZARD, not a flat control set. Its content branches on
				     three mutually-exclusive variant states (!isSplit&&!isVideo&&!isSvgAnimated /
				     isSplit / the shared "Background effects" tail) into entirely different control
				     groups. ToolsPanelItem's contract (one hasValue/onDeselect per independently-
				     resettable "property") doesn't fit a set of controls that only exist under a
				     specific variant. Left as PanelBody per the task's mode-wizard escape hatch —
				     see the original (fuller) rationale preserved on the Settings-tab "Image" panel. */ }
				<PanelBody title={ __( 'Image styling', 'sgs-blocks' ) } initialOpen={ false }>
					{ ! isSplit && ! isVideo && ! isSvgAnimated && (
						<>
							<DesignTokenPicker
								label={ __( 'Overlay colour', 'sgs-blocks' ) }
								value={ overlayColour }
								onChange={ ( val ) =>
									setAttributes( { overlayColour: val } )
								}
							/>
							<RangeControl
								label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
								value={ overlayOpacity }
								onChange={ ( val ) =>
									setAttributes( { overlayOpacity: val } )
								}
								min={ 0 }
								max={ 100 }
								__nextHasNoMarginBottom
							/>
						</>
					) }

					{ isSplit && (
						<>
							{ /* The "Split image height" control was REMOVED 2026-08-10. It wrote
							     the splitImageHeight/…Tablet/splitImageMobileHeight trio, which set
							     `height` on `.sgs-hero__split-image` — the SAME property on the SAME
							     element as the "Height" control further down this panel. Two controls
							     for one setting is the duplicate-control class this framework bans, and
							     at equal CSS specificity the later-emitted rule won, so this one was
							     already the loser whenever both were set. The surviving control is the
							     Height control below, which carries a unit picker instead of hardcoding
							     px. Its render is now UNGATED so it keeps this control's reach. */ }
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Display', 'sgs-blocks' ) }</p>
							<SelectControl label={ __( 'Object fit', 'sgs-blocks' ) } value={ imageObjectFit } options={ IMAGE_FIT_OPTIONS } onChange={ ( val ) => setAttributes( { imageObjectFit: val } ) } __nextHasNoMarginBottom />
							<ResponsiveControl label={ __( 'Object position', 'sgs-blocks' ) }>
								{ ( breakpoint ) => {
									const posAttrMap = {
										desktop: 'imageObjectPosition',
										tablet: 'imageObjectPositionTablet',
										mobile: 'splitImageMobileObjectPosition',
									};
									const posKey = posAttrMap[ breakpoint ];
									const posDefault = {
										desktop: 'center center',
										tablet: '',
										mobile: 'center 20%',
									}[ breakpoint ];
									const posHelpMap = {
										desktop: __( 'CSS object-position (e.g. "center 20%"). Applies to tablet too unless overridden below.', 'sgs-blocks' ),
										tablet: __( 'Blank = inherit the desktop position above.', 'sgs-blocks' ),
										mobile: __( 'Only used when a separate mobile image is set above.', 'sgs-blocks' ),
									};
									return (
										<TextControl
											help={ posHelpMap[ breakpoint ] }
											value={ attributes[ posKey ] ?? posDefault }
											onChange={ ( val ) => setAttributes( { [ posKey ]: val } ) }
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>
							{ imageObjectFit === 'custom' && (
								<>
									<p style={ { fontWeight: 600, margin: '12px 0 4px' } }>{ __( 'Custom dimensions', 'sgs-blocks' ) }</p>
									<RRangeControl label={ __( 'Width', 'sgs-blocks' ) } attrDesktop="imageWidth" attrTablet="imageWidthTablet" attrMobile="imageWidthMobile" attributes={ attributes } setAttributes={ setAttributes } min={ 0 } max={ 1200 } step={ 1 } />
									<UnitControl
										label={ __( 'Width unit', 'sgs-blocks' ) }
										value={ `${ imageWidth || 0 }${ imageWidthUnit || 'px' }` }
										units={ [
											{ value: 'px', label: 'px', default: 0 },
											{ value: '%',  label: '%',  default: 0 },
										] }
										onChange={ ( val ) => {
											const unit = val?.replace( /[\d.]+/, '' ) || 'px';
											setAttributes( { imageWidthUnit: unit } );
										} }
										__nextHasNoMarginBottom
									/>
									{ /* imageHeight is the OBJECT model (Spec 35 / FR-37-16): one attr
									     holding all three tiers, so this uses ResponsiveOverride rather
									     than the flat attrDesktop/attrTablet/attrMobile trio the Width
									     control above still uses. A blank tier INHERITS the tier above.
									     This control also absorbed the removed "Split image height"
									     control — both wrote `height` to `.sgs-hero__split-image`. */ }
									<ResponsiveOverride
										label={ __( 'Height', 'sgs-blocks' ) }
										value={ imageHeight }
										onChange={ ( obj ) => setAttributes( { imageHeight: obj } ) }
									>
										{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
											<RangeControl
												help={ inherited
													? __( 'Inherited. Set a value to override at this device.', 'sgs-blocks' )
													: __( 'Fixed height for the split image. 0 = auto (fits content).', 'sgs-blocks' ) }
												value={ Number( ownValue ?? effectiveValue ) || 0 }
												onChange={ ( val ) => setOwnValue( val || null ) }
												min={ 0 }
												max={ 1200 }
												step={ 1 }
												__nextHasNoMarginBottom
											/>
										) }
									</ResponsiveOverride>
									<UnitControl
										label={ __( 'Height unit', 'sgs-blocks' ) }
										value={ `${ imageHeight?.desktop || 0 }${ imageHeightUnit || 'px' }` }
										units={ [
											{ value: 'px', label: 'px', default: 0 },
											{ value: '%',  label: '%',  default: 0 },
										] }
										onChange={ ( val ) => {
											const unit = val?.replace( /[\d.]+/, '' ) || 'px';
											setAttributes( { imageHeightUnit: unit } );
										} }
										__nextHasNoMarginBottom
									/>
								</>
							) }

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Border radius', 'sgs-blocks' ) }</p>
							<ResponsiveBorderRadiusControl
								label={ __( 'Image border radius', 'sgs-blocks' ) }
								values={ {
									base: imageBorderRadius ?? {},
									tablet: imageBorderRadiusTablet ?? {},
									mobile: imageBorderRadiusMobile ?? {},
								} }
								onChange={ ( tier, next ) => {
									const attrMap = {
										base: 'imageBorderRadius',
										tablet: 'imageBorderRadiusTablet',
										mobile: 'imageBorderRadiusMobile',
									};
									setAttributes( { [ attrMap[ tier ] ]: next } );
								} }
							/>

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Border', 'sgs-blocks' ) }</p>
							<SelectControl label={ __( 'Border style', 'sgs-blocks' ) } value={ imageBorderStyle } options={ BORDER_STYLE_OPTIONS } onChange={ ( val ) => setAttributes( { imageBorderStyle: val } ) } __nextHasNoMarginBottom />
							{ imageBorderStyle !== 'none' && (
								<>
									<ResponsiveBoxControl
										label={ __( 'Border width', 'sgs-blocks' ) }
										values={ { base: imageBorderWidth ?? {} } }
										showResponsive={ false }
										onChange={ ( tier, next ) => setAttributes( { imageBorderWidth: next } ) }
									/>
									<DesignTokenPicker label={ __( 'Border colour', 'sgs-blocks' ) } value={ imageBorderColour } onChange={ ( val ) => setAttributes( { imageBorderColour: val } ) } />
								</>
							) }

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Inner padding (around the image element itself)', 'sgs-blocks' ) }</p>
							<p style={ { fontSize: '12px', color: '#757575', margin: '0 0 8px' } }>{ __( 'Affects the gap between the image and the wrapper border.', 'sgs-blocks' ) }</p>
							<ResponsiveBoxControl
								label={ __( 'Image padding', 'sgs-blocks' ) }
								values={ {
									base: imagePadding ?? {},
									tablet: imagePaddingTablet ?? {},
									mobile: imagePaddingMobile ?? {},
								} }
								onChange={ ( tier, next ) => {
									const attrMap = {
										base: 'imagePadding',
										tablet: 'imagePaddingTablet',
										mobile: 'imagePaddingMobile',
									};
									setAttributes( { [ attrMap[ tier ] ]: next } );
								} }
							/>

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Outer padding (around the whole media wrapper)', 'sgs-blocks' ) }</p>
							<p style={ { fontSize: '12px', color: '#757575', margin: '0 0 8px' } }>{ __( 'Affects the gap between the wrapper and the surrounding section.', 'sgs-blocks' ) }</p>
							<DesignTokenPicker
								label={ __( 'Media background colour', 'sgs-blocks' ) }
								value={ mediaBackground || '' }
								onChange={ ( val ) => setAttributes( { mediaBackground: val } ) }
							/>
							<ResponsiveBoxControl
								label={ __( 'Media padding', 'sgs-blocks' ) }
								values={ {
									base: mediaPadding ?? {},
									tablet: mediaPaddingTablet ?? {},
									mobile: mediaPaddingMobile ?? {},
								} }
								onChange={ ( tier, next ) => {
									const attrMap = {
										base: 'mediaPadding',
										tablet: 'mediaPaddingTablet',
										mobile: 'mediaPaddingMobile',
									};
									setAttributes( { [ attrMap[ tier ] ]: next } );
								} }
							/>
						</>
					) }

					{ ! isSplit && ! isVideo && ! isSvgAnimated && (
						<>
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Background effects', 'sgs-blocks' ) }</p>
							<ToggleControl
								label={ __( 'Parallax scroll', 'sgs-blocks' ) }
								help={ __(
									'Background scrolls slower than content. Disabled automatically on touch devices.',
									'sgs-blocks'
								) }
								checked={ !! bgParallax }
								onChange={ ( val ) =>
									setAttributes( { bgParallax: val } )
								}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Ken Burns animation', 'sgs-blocks' ) }
								help={ __(
									'Slow pan and zoom on the background image. Respects reduced-motion preference.',
									'sgs-blocks'
								) }
								checked={ !! bgKenBurns }
								onChange={ ( val ) =>
									setAttributes( { bgKenBurns: val } )
								}
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				{/* ── Video Background styling (video variant only — overlay
				   appearance; the video FILE selection lives on the Settings tab). ── */}
				{ isVideo && (
					<PanelBody
						title={ __( 'Background Video', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<DesignTokenPicker
							label={ __( 'Overlay colour', 'sgs-blocks' ) }
							value={ overlayColour }
							onChange={ ( val ) =>
								setAttributes( { overlayColour: val } )
							}
						/>
						<RangeControl
							label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
							value={ overlayOpacity }
							onChange={ ( val ) =>
								setAttributes( { overlayOpacity: val } )
							}
							min={ 0 }
							max={ 100 }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{/* ── SVG Background styling (svg-animated variant only — overlay
				   appearance; the SVG markup itself lives on the Settings tab). ── */}
				{ isSvgAnimated && (
					<PanelBody
						title={ __( 'SVG Background', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<DesignTokenPicker
							label={ __( 'Overlay colour', 'sgs-blocks' ) }
							value={ overlayColour }
							onChange={ ( val ) =>
								setAttributes( { overlayColour: val } )
							}
						/>
						<RangeControl
							label={ __( 'Overlay opacity (%)', 'sgs-blocks' ) }
							value={ overlayOpacity }
							onChange={ ( val ) =>
								setAttributes( { overlayOpacity: val } )
							}
							min={ 0 }
							max={ 100 }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* WS-4: mirrored sgs/container wrapper controls (section KIND).
				   Legacy "Overlay colour" control above writes overlayColour; this
				   panel writes backgroundOverlayColour, which render.php prefers
				   (backgroundOverlayColour ?? overlayColour).
				   No-inline migration (2026-07-09): the default <ContainerWrapperControls>
				   aggregator is no longer used (see the import comment above) — its
				   "Content band" + per-grid-area panels wrote to legacy FLAT attrs
				   that no longer exist. Individual panels still needed are composed
				   directly; the min-height duplicate ("Section (outer)") is dropped
				   since hero already has its own min-height ResponsiveControl above. */ }
				<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) } initialOpen={ false }>
					<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
				</PanelBody>

				{ /* Content band (Layer 2 __inner) — box-object family, rendered
				   entirely by SGS_Container_Wrapper (mirrors sgs/container's own
				   local panel; contentBandPadding/Tablet/Mobile). */ }
				<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __( 'Styles the inner content band (the max-width wrapper set by Content width). Only active when Content width is set.', 'sgs-blocks' ) }
					</p>
					<DesignTokenPicker
						label={ __( 'Band background colour', 'sgs-blocks' ) }
						value={ contentBandBackground || '' }
						onChange={ ( val ) => setAttributes( { contentBandBackground: val } ) }
					/>
					<ResponsiveBoxControl
						label={ __( 'Band padding', 'sgs-blocks' ) }
						values={ {
							base: contentBandPadding ?? {},
							tablet: contentBandPaddingTablet ?? {},
							mobile: contentBandPaddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							const attrMap = {
								base: 'contentBandPadding',
								tablet: 'contentBandPaddingTablet',
								mobile: 'contentBandPaddingMobile',
							};
							setAttributes( { [ attrMap[ tier ] ]: next } );
						} }
					/>
				</PanelBody>

				{ /* Root padding & margin — box-object interface contract (mirrors
					sgs/cta-section + sgs/container). Base writes the WP-native
					style.spacing object; tablet/mobile write the paddingTablet/
					paddingMobile + marginTablet/marginMobile object attrs the shared
					wrapper reads at @media tiers. Replaces the legacy
					<ResponsiveSpacingPanel> whose flat paddingTopTablet… attrs the
					wrapper never read (dead controls, R6 2026-07-10). */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, padding: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'paddingTablet' : 'paddingMobile' ]: next,
								} );
							}
						} }
					/>
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						values={ {
							base: attributes.style?.spacing?.margin ?? {},
							tablet: attributes.marginTablet ?? {},
							mobile: attributes.marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							if ( tier === 'base' ) {
								setAttributes( {
									style: {
										...attributes.style,
										spacing: { ...attributes.style?.spacing, margin: next },
									},
								} );
							} else {
								setAttributes( {
									[ tier === 'tablet' ? 'marginTablet' : 'marginMobile' ]: next,
								} );
							}
						} }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<LayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
				</PanelBody>

				<GridItemDefaultsPanel attributes={ attributes } setAttributes={ setAttributes } />

				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* Shadow — legacy string token attr (sm/md/lg/glow OR a raw box-shadow
					CSS string built by ShadowControl), resolved by sgs_shadow_value()
					(Spec 35 T2.2b). */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						value={ attributes.shadow || '' }
						onChange={ ( val ) => setAttributes( { shadow: val } ) }
					/>
				</PanelBody>

				<ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />
			</InspectorControls>

			<div { ...blockProps }>
				{ isVideo && bgVideo?.url && (
					<video
						className="sgs-hero__video-bg"
						src={ bgVideo.url }
						autoPlay
						loop
						muted
						playsInline
						aria-hidden="true"
					/>
				) }

				{ isSvgAnimated && svgContent && (
					<div
						className="sgs-hero__svg-bg"
						dangerouslySetInnerHTML={ { __html: svgContent } }
						aria-hidden="true"
					/>
				) }

				{ ( ! isSplit && ! isVideo && ! isSvgAnimated && backgroundImage?.url ) && (
					<span
						className="sgs-hero__overlay"
						style={ {
							backgroundColor: overlayColour,
							opacity: overlayOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				{ ( isVideo || isSvgAnimated ) && (
					<span
						className="sgs-hero__overlay"
						style={ {
							backgroundColor: overlayColour,
							opacity: overlayOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				{ /* FR-22-6: content column is the InnerBlocks slot (label + heading + text + buttons). */ }
				<div { ...innerBlocksProps } />

				{ isSplit && ( splitMedia?.url || splitImage?.url ) && (
					<div className="sgs-hero__media">
						{ splitMedia?.type === 'video' ? (
							<video
								src={ splitMedia.url }
								className="sgs-hero__split-image"
								autoPlay
								muted
								loop
								playsInline
							/>
						) : (
							<img
								src={ splitMedia?.url || splitImage?.url }
								alt={ splitMedia?.alt || splitImage?.alt || '' }
								className="sgs-hero__split-image"
							/>
						) }
					</div>
				) }
			</div>
		</>
	);
}
