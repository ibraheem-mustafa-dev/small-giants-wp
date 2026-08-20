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
	BoxControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	ResponsiveControl,
	ResponsiveOverride,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
	ShadowControl,
	GradientOverlayControl,
	FocalPositionField,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../components';
import MediaPicker from '../../components/MediaPicker';
import {
	resolveShadowPreview,
	colourVar,
} from '../../utils';
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
	BackgroundPanel,
	ShapeDividersPanel,
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
						__next40pxDefaultSize
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
];

const TEMPLATE_MODE_OPTIONS = [
	{ label: __( 'Free (no restrictions)', 'sgs-blocks' ), value: 'free' },
	{ label: __( 'Grid section', 'sgs-blocks' ), value: 'grid-section' },
	{ label: __( 'Card grid', 'sgs-blocks' ), value: 'card-grid' },
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

export default function Edit( { attributes, setAttributes, name } ) {
	const {
		variant,
		splitImageBleed,
		// Split-media motion (2026-08-13) — mirrors the section's own
		// bgParallax/bgKenBurns/bgAnimationDuration pair, scoped to the
		// FOREGROUND media column, never the section background.
		mediaParallax,
		mediaKenBurns,
		mediaAnimationDuration = 20,
		alignment,
		backgroundImage,
		backgroundOverlayColour,
		overlayGradient,
		splitImage,
		splitImageTablet,
		splitImageMobile,
		// Per-device split-media TYPE (2026-08-13) — declared + render-consumed
		// but had no editor control until now (dead controls: splitMediaType,
		// splitVideo, splitSvg families, all 9 attrs). '' on the tablet/mobile
		// tier means "inherit the next widest tier that has a value".
		splitMediaType,
		splitMediaTypeTablet,
		splitMediaTypeMobile,
		splitVideo,
		splitVideoTablet,
		splitVideoMobile,
		splitSvg,
		splitSvgTablet,
		splitSvgMobile,
		// minHeight is a TIER OBJECT {desktop,tablet,mobile} as of Spec 35 pass 3b
		// (2026-08-11) — the minHeightTablet/minHeightMobile siblings no longer exist.
		minHeight,
		shadow,
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
		imageBorderColourGradient,
		imagePadding,
		imagePaddingTablet,
		imagePaddingMobile,
		contentBackground,
		contentBackgroundGradient,
		// contentPadding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile} (Spec 35
		// box-tier migration, 2026-08-11) — the contentPaddingTablet/Mobile sibling
		// attrs no longer exist in this block's schema.
		contentPadding,
		mediaPadding,
		mediaPaddingTablet,
		mediaPaddingMobile,
		// contentBandPadding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile}
		// (Spec 35 box-tier pass, 2026-08-11) — the contentBandPaddingTablet/
		// Mobile sibling attrs no longer exist in this block's schema.
		contentBandPadding,
		// Phase 1 — layout grid. splitColumnRatio* retired (Step 6, 2026-06-11);
		// render.php now reads gridTemplateColumns* for the split variant.
		gridTemplateColumns,
		// splitContentOrder is a TIER OBJECT {desktop,tablet,mobile} as of Spec 35
		// pass 3b — the *Tablet/*Mobile siblings no longer exist.
		splitContentOrder,
		// Phase 1 — vertical alignment.
		verticalAlignment,
		// HC2 — per-breakpoint text alignment on .sgs-hero__content.
		textAlignDesktop,
		textAlignTablet,
		textAlignMobile,
		templateMode = 'free',
	} = attributes;

	const isSplit = variant === 'split';

	const wrapperStyle = {};
	if ( ! isSplit && backgroundImage?.url ) {
		wrapperStyle.backgroundImage = `url(${ backgroundImage.url })`;
		wrapperStyle.backgroundSize = 'cover';
		wrapperStyle.backgroundPosition = 'center';
	}
	if ( minHeight?.desktop ) {
		wrapperStyle.minHeight = minHeight.desktop;
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
	// Column/stacking order preview — mirrors render.php's desktop-tier swap
	// (render.php:497-499) so the canvas doesn't silently disagree with the
	// frontend. Desktop tier only, matching the media preview above (the
	// per-tier order is what WP's own device switcher provides — tablet/
	// mobile order isn't previewed here any more than tablet/mobile column
	// ratio is). Blank/'content-first' = natural DOM order (content column
	// renders first in markup), so no override needed; only 'media-first'
	// swaps the order.
	const isMediaFirstDesktop = 'media-first' === splitContentOrder?.desktop;
	if ( isMediaFirstDesktop ) {
		contentPreviewStyle.order = 2;
	}

	// Box-object interface contract §1 helper (mirrors the same local
	// boxShorthand() already used by button/heading/text/quote/etc. edit.js —
	// see src/blocks/button/edit.js:247) — builds a CSS shorthand string from
	// a {top,right,bottom,left} object, matching render.php's
	// sgs_box_shorthand() so the canvas preview agrees with the frontend.
	const boxShorthand = ( box, keys ) => {
		if ( ! box || 'object' !== typeof box ) return undefined;
		if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
		return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
	};

	// Content-band (Layer 2 __inner) preview — mirrors
	// class-sgs-container-wrapper.php's `.$uid>.sgs-container__inner` band.
	// Split forces `wrap_inner=false` at render.php:1258 ("a stray contentWidth
	// can never inject an __inner div that would sit between the section grid
	// and its __content/__media grid items") so the band never renders for the
	// split variant — the standard variant is the only one where the wrapper
	// actually emits `.sgs-container__inner` around the content, matching
	// `$has_band_props` (class-sgs-container-wrapper.php:713-719) being driven
	// by band padding (this desktop-tier preview) or contentWidth (not yet
	// previewed here — out of scope for this fix). Desktop tier only, matching
	// every other preview builder in this file.
	const bandPaddingPreview = boxShorthand(
		contentBandPadding?.desktop,
		[ 'top', 'right', 'bottom', 'left' ]
	);
	const showContentBand = ! isSplit && !! bandPaddingPreview;

	// Split-image preview style — mirrors render.php's scoped `.sgs-hero__split-image`
	// CSS builder (render.php:576-626, 561-573) for the Phase-1 image-display
	// attributes so the editor canvas stops silently disagreeing with the
	// frontend. Desktop tier only, matching every other preview builder in
	// this file (imageWidthTablet/imageWidthMobile stay editor-only-inert
	// here, same as the other *Tablet/*Mobile pairs above).
	const imagePreviewStyle = {};
	// object-fit — render.php:577-580 (gated OFF when imageObjectFit==='custom',
	// which switches to explicit width/height below instead).
	if ( 'custom' !== imageObjectFit ) {
		imagePreviewStyle.objectFit = imageObjectFit || 'cover';
	}
	// width — render.php:597-599, gated behind imageObjectFit==='custom'.
	// imageWidth itself has no dedicated ticket item here, but imageWidthUnit
	// is meaningless without it (same CSS declaration), so both are applied
	// together, desktop tier only.
	if ( 'custom' === imageObjectFit && imageWidth ) {
		imagePreviewStyle.width = `${ imageWidth }${ imageWidthUnit || '%' }`;
	}
	// height — render.php:618-619, deliberately UNGATED (not tied to
	// imageObjectFit==='custom' — see render.php's "UNGATED reach" comment
	// at line 609-615).
	if ( imageHeight?.desktop ) {
		imagePreviewStyle.height = `${ imageHeight.desktop }${ imageHeightUnit || 'px' }`;
	}
	// border style/width/colour — render.php:561-573 (box-object family,
	// base only, no tiers). Entry condition matches render.php exactly:
	// emit when style isn't 'none' OR a width is set.
	const imageBorderWidthPreview = boxShorthand( imageBorderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( 'none' !== imageBorderStyle || imageBorderWidthPreview ) {
		imagePreviewStyle.borderStyle = imageBorderStyle;
		if ( imageBorderWidthPreview ) {
			imagePreviewStyle.borderWidth = imageBorderWidthPreview;
		}
		if ( imageBorderColour ) {
			imagePreviewStyle.borderColor = imageBorderColour;
		}
	}

	// Media-wrapper (`.sgs-hero__media`) class + style preview — mirrors
	// render.php:1141-1161 (`sgs-hero__media--bleed` / `--ken-burns` modifier
	// classes + the ken-burns duration custom property) and the split-image
	// element's own `--bleed` modifier (render.php:1129-1132). mediaKenBurns
	// is mutually exclusive with mediaParallax, matching render.php:686's
	// `$media_ken_burns = ! empty( $attributes['mediaKenBurns'] ) && ! $media_parallax;`
	const mediaKenBurnsActive = !! mediaKenBurns && ! mediaParallax;
	const mediaWrapperClassName = [
		'sgs-hero__media',
		splitImageBleed ? 'sgs-hero__media--bleed' : null,
		mediaKenBurnsActive ? 'sgs-hero__media--ken-burns' : null,
	]
		.filter( Boolean )
		.join( ' ' );
	const mediaWrapperStyle = {};
	if ( isMediaFirstDesktop ) {
		mediaWrapperStyle.order = 1;
	}
	if ( mediaKenBurnsActive ) {
		mediaWrapperStyle[ '--sgs-hero-media-ken-burns-duration' ] = `${ mediaAnimationDuration }s`;
	}
	const splitImageClassName = [
		'sgs-hero__split-image',
		splitImageBleed ? 'sgs-hero__split-image--bleed' : null,
	]
		.filter( Boolean )
		.join( ' ' );

	const className = [
		'sgs-hero',
		`sgs-hero--${ variant }`,
		`sgs-hero--align-${ alignment }`,
		// splitImageBleed root modifier — mirrors render.php:775-777
		// ($classes[] = 'sgs-hero--split-bleed').
		splitImageBleed ? 'sgs-hero--split-bleed' : null,
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( { className, style: wrapperStyle } );

	// Template mode — allowed children restriction, mirroring sgs/container's
	// own TEMPLATE_MODE_ALLOWED pattern. The content column is unrestricted by
	// default ("free" — same as its behaviour before templateMode existed:
	// no allowedBlocks was ever set here), so this is purely additive and
	// never a regression for existing hero content.
	const TEMPLATE_MODE_ALLOWED = {
		'grid-section': [
			'sgs/container',
			'sgs/label',
			'sgs/heading',
			'sgs/text',
			'sgs/button',
			'sgs/multi-button',
			'sgs/media',
		],
		'card-grid': [
			'sgs/info-box',
			'sgs/card-grid',
			'sgs/container',
		],
	};
	const allowedBlocks =
		'free' !== templateMode
			? TEMPLATE_MODE_ALLOWED[ templateMode ] ?? undefined
			: undefined;

	// FR-22-6: content column uses InnerBlocks (label + heading + text + buttons).
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-hero__content', style: contentPreviewStyle },
		{
			template: HERO_CONTENT_TEMPLATE,
			templateLock: false,
			allowedBlocks,
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
						__next40pxDefaultSize
					/>
				</PanelBody>

				{/* Template mode — allowed children restriction for the content
				   column, mirroring sgs/container. */}
				<PanelBody
					title={ __( 'Template mode', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Allowed children', 'sgs-blocks' ) }
						value={ templateMode }
						options={ TEMPLATE_MODE_OPTIONS }
						onChange={ ( val ) => setAttributes( { templateMode: val } ) }
						help={ __(
							'Grid section and Card grid restrict which block types can be inserted directly inside this hero’s content column. Free (default) imposes no restrictions.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{/* ── Split image (SPLIT VARIANT ONLY — its own media source, not covered by
				   the shared Background panel on the Styles tab). Unified 2026-08-11: the
				   standard-variant background image and the background-video picker that
				   used to live here were REMOVED — they duplicated the Styles tab's
				   Background panel (Image/Video tabs), which is a strict superset (it also
				   handles tablet/mobile art-direction). One media-selection UI per
				   attribute, not two.
				   Title renamed from "Image" to "Split image" (media-panel consolidation
				   task) so it reads honestly as split-only — the standard variant's
				   background media, overlay colour/gradient, and Parallax/Ken Burns effects
				   all live in the shared "Background" panel on the Styles tab, which is
				   reachable for BOTH variants (see that panel for why). ── */}
				{ isSplit && (
					<PanelBody title={ __( 'Split image', 'sgs-blocks' ) } initialOpen={ false }>
						<>
							{ /* ⛔ The "Split media source" picker (attribute `splitMedia`) was
							     DELETED here 2026-08-13. It was the pre-typed unified
							     image-or-video slot, and it left the client looking at TWO media
							     pickers for one slot — "Split media source" and "Split image" —
							     that wrote different attributes and had to be kept in sync by
							     hand. The typed families replace it outright: splitImage* /
							     splitVideo* / splitSvg*, selected per tier by splitMediaType*.
							     No deprecation and no fallback: the framework is pre-production
							     (D270), and render.php no longer reads `splitMedia` at all, so
							     leaving the control would have been a dead control writing an
							     attribute nothing renders. */ }

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

							{ /* Media TYPE per device (2026-08-13). splitMediaType/Tablet/Mobile
							     + splitVideo/Tablet/Mobile + splitSvg/Tablet/Mobile were all
							     declared in block.json and read in render.php, but had no editor
							     control at all — so the split media column could only ever be an
							     image, on every device, no matter what a client picked here.
							     Gated on the base split media existing (rule: a per-device override
							     for media that is not there is a dead control). Desktop defaults to
							     'image' (the block.json default); tablet/mobile default to '' —
							     "inherit the next widest tier that has a value", same fall-back-UP
							     rule as every other tier family on this block. */ }
							{ splitImage?.url && (
								<ResponsiveControl label={ __( 'Media type', 'sgs-blocks' ) }>
									{ ( bp ) => {
										const typeKey = {
											desktop: 'splitMediaType',
											tablet: 'splitMediaTypeTablet',
											mobile: 'splitMediaTypeMobile',
										}[ bp ];
										const videoKey = {
											desktop: 'splitVideo',
											tablet: 'splitVideoTablet',
											mobile: 'splitVideoMobile',
										}[ bp ];
										const svgKey = {
											desktop: 'splitSvg',
											tablet: 'splitSvgTablet',
											mobile: 'splitSvgMobile',
										}[ bp ];
										const currentType = attributes[ typeKey ] || '';
										const options =
											'desktop' === bp
												? [
														{ label: __( 'Image', 'sgs-blocks' ), value: 'image' },
														{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
														{ label: __( 'SVG', 'sgs-blocks' ), value: 'svg' },
												  ]
												: [
														{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
														{ label: __( 'Image', 'sgs-blocks' ), value: 'image' },
														{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
														{ label: __( 'SVG', 'sgs-blocks' ), value: 'svg' },
												  ];
										return (
											<>
												<SelectControl
													label={
														'desktop' === bp
															? __( 'Media type', 'sgs-blocks' )
															: __( 'Media type for this screen size', 'sgs-blocks' )
													}
													value={ currentType }
													options={ options }
													onChange={ ( value ) =>
														setAttributes( { [ typeKey ]: value } )
													}
													__nextHasNoMarginBottom
													__next40pxDefaultSize
												/>
												{ 'image' === currentType && (
													<p style={ { margin: 0, fontStyle: 'italic' } }>
														{ __(
															'Set the image above in "Split image".',
															'sgs-blocks'
														) }
													</p>
												) }
												{ 'video' === currentType && (
													<>
														<MediaUploadCheck>
															<MediaUpload
																onSelect={ ( media ) =>
																	setAttributes( {
																		[ videoKey ]: {
																			id: media.id || 0,
																			url: media.url,
																		},
																	} )
																}
																allowedTypes={ [ 'video' ] }
																value={ attributes[ videoKey ]?.id }
																render={ ( { open } ) => (
																	<Button variant="secondary" onClick={ open }>
																		{ attributes[ videoKey ]?.url
																			? __( 'Replace video', 'sgs-blocks' )
																			: __( 'Select video', 'sgs-blocks' ) }
																	</Button>
																) }
															/>
														</MediaUploadCheck>
														{ attributes[ videoKey ]?.url && (
															<Button
																variant="link"
																isDestructive
																onClick={ () =>
																	setAttributes( { [ videoKey ]: undefined } )
																}
																style={ { marginTop: '8px', display: 'block' } }
															>
																{ 'desktop' === bp
																	? __( 'Remove video', 'sgs-blocks' )
																	: __( 'Use the main media here', 'sgs-blocks' ) }
															</Button>
														) }
													</>
												) }
												{ 'svg' === currentType && (
													<>
														<TextareaControl
															label={ __( 'SVG code', 'sgs-blocks' ) }
															value={ attributes[ svgKey ] || '' }
															onChange={ ( value ) =>
																setAttributes( { [ svgKey ]: value } )
															}
															help={ __(
																'Paste your <svg>…</svg> markup here.',
																'sgs-blocks'
															) }
															rows={ 6 }
														/>
														{ attributes[ svgKey ] && 'desktop' !== bp && (
															<Button
																variant="link"
																isDestructive
																onClick={ () =>
																	setAttributes( { [ svgKey ]: '' } )
																}
																style={ { display: 'block' } }
															>
																{ __( 'Use the main media here', 'sgs-blocks' ) }
															</Button>
														) }
													</>
												) }
												{ '' === currentType && 'desktop' !== bp && (
													<p style={ { margin: 0, fontStyle: 'italic' } }>
														{ __(
															'Inherits the media from the next widest screen size.',
															'sgs-blocks'
														) }
													</p>
												) }
											</>
										);
									} }
								</ResponsiveControl>
							) }

							{ /* Media overlay — a SEPARATE decorative layer on TOP of the split
							     media, distinct from the "Background" colour set via the
							     mediaBackground* family in the "Image styling" panel below (that
							     one paints BEHIND an object-fit:cover image and is invisible
							     whenever media is present). Mirrors the section overlay's own
							     GradientOverlayControl usage 1:1, scoped to mediaOverlay*. */ }
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Overlay', 'sgs-blocks' ) }</p>
							<GradientOverlayControl
								attributes={ attributes }
								setAttributes={ setAttributes }
								attrNames={ {
									gradient: 'mediaOverlayGradient',
									solid: 'mediaOverlayColour',
								} }
								solidLabel={ __( 'Media overlay colour', 'sgs-blocks' ) }
							/>

							{ /* Media motion (2026-08-13) — a SEPARATE toggle pair from the
							     section's own "Ken-burns zoom"/"Parallax scroll" controls in
							     the "Container / Entire Block" panel below (which animate the
							     SECTION BACKGROUND). These animate the foreground split-media
							     column itself. Labelled "Media …" throughout so an operator
							     with both panels open never confuses which element a toggle
							     affects. Same mutual-exclusion pattern as the section's pair
							     (ContainerWrapperControls.js) — turning one on clears the
							     other. */ }
							<hr style={ { margin: '16px 0' } } />
							<p className="components-base-control__help">
								{ __( 'Media Ken-burns and parallax are mutually exclusive — Ken-burns takes priority.', 'sgs-blocks' ) }
							</p>
							<ToggleControl
								label={ __( 'Media Ken-burns zoom', 'sgs-blocks' ) }
								help={ __( 'Slow zoom animation on the split media (image, video, or SVG), not the section background.', 'sgs-blocks' ) }
								checked={ !! mediaKenBurns }
								onChange={ ( val ) =>
									setAttributes( { mediaKenBurns: val, mediaParallax: val ? false : mediaParallax } )
								}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Media parallax scroll', 'sgs-blocks' ) }
								help={ __( 'The split media drifts gently as the visitor scrolls, for a subtle sense of depth.', 'sgs-blocks' ) }
								checked={ !! mediaParallax }
								onChange={ ( val ) =>
									setAttributes( { mediaParallax: val, mediaKenBurns: val ? false : mediaKenBurns } )
								}
								__nextHasNoMarginBottom
							/>
							{ mediaKenBurns && (
								<RangeControl
									label={ __( 'Media animation duration (seconds)', 'sgs-blocks' ) }
									value={ mediaAnimationDuration }
									onChange={ ( val ) => setAttributes( { mediaAnimationDuration: val } ) }
									min={ 5 }
									max={ 60 }
									step={ 1 }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</>
					</PanelBody>
				) }
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
				     splitContentOrderMobile='media-first', splitImageBleed=true (flipped 2026-08-13 — full-bleed
				     is now the default per Bean; most real split-hero designs want the image flush to the
				     block edge, not inset). Text/vertical alignment are
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
								minHeight: { mobile: '360px' },
								contentBackground: '',
								contentPadding: { desktop: {} },
								...( isSplit && {
									gridTemplateColumns: '',
									splitContentOrder: { mobile: 'media-first' },
									splitImageBleed: true,
								} ),
							} );
						} }
					>
						<ToolsPanelItem
							label={ __( 'Content fill', 'sgs-blocks' ) }
							hasValue={ () => alignment !== 'left' }
							onDeselect={ () => setAttributes( { alignment: 'left' } ) }
							isShownByDefault
						>
							<ToggleGroupControl
								label={ __( 'Content fill', 'sgs-blocks' ) }
								value={ alignment }
								onChange={ ( val ) =>
									setAttributes( { alignment: val } )
								}
								isBlock
								__nextHasNoMarginBottom
								__next40pxDefaultSize
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
								__next40pxDefaultSize
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
											__next40pxDefaultSize
										/>
									);
								} }
							</ResponsiveControl>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Min height', 'sgs-blocks' ) }
							hasValue={ () =>
								!! minHeight?.desktop ||
								!! minHeight?.tablet ||
								( minHeight?.mobile ?? '360px' ) !== '360px'
							}
							onDeselect={ () =>
								setAttributes( { minHeight: { mobile: '360px' } } )
							}
						>
							{ /* minHeight is a TIER OBJECT {desktop,tablet,mobile}
							     (Spec 35 pass 3b) — ONE attr, bound directly via
							     <ResponsiveOverride> (mirrors gridTemplateColumns
							     above). Blank on tablet inherits the desktop rule
							     (render.php emits no @media override); blank on
							     mobile falls back to render.php's own "360px"
							     default, matching block.json's declared default. */ }
							<ResponsiveOverride
								label={ __( 'Min height', 'sgs-blocks' ) }
								value={ minHeight }
								onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
							>
								{ ( { ownValue, setOwnValue } ) => (
									<SelectControl
										value={ ownValue ?? '' }
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
										onChange={ ( val ) => setOwnValue( val ) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								) }
							</ResponsiveOverride>
						</ToolsPanelItem>

						{ /* Media background/padding controls live in the "Image" panel's
						     "Outer padding" section below (mediaBackground/mediaPadding*
						     box-object attrs) — the legacy mediaBackgroundColour control
						     was removed (one control per setting); the former deprecated.js v7
						     migrates the legacy value. */ }

						<ToolsPanelItem
							label={ __( 'Content area', 'sgs-blocks' ) }
							hasValue={ () =>
								!! contentBackground ||
								!! contentBackgroundGradient ||
								Object.keys( contentPadding?.desktop ?? {} ).length > 0 ||
								Object.keys( contentPadding?.tablet ?? {} ).length > 0 ||
								Object.keys( contentPadding?.mobile ?? {} ).length > 0
							}
							onDeselect={ () =>
								setAttributes( {
									contentBackground: '',
									// String since the D636 collapse — resetting it to
									// boolean `false` wrote a non-string into a string
									// attr on every "reset all" (D643).
									contentBackgroundGradient: '',
									contentPadding: { desktop: {} },
								} )
							}
						>
							<p style={ { fontWeight: 600, margin: '0 0 4px' } }>{ __( 'Content area', 'sgs-blocks' ) }</p>
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Background', 'sgs-blocks' ) }</p>
							<GradientOverlayControl
								attributes={ attributes }
								setAttributes={ setAttributes }
								attrNames={ {
									gradient: 'contentBackgroundGradient',
									solid: 'contentBackground',
								} }
								solidLabel={ __( 'Content background colour', 'sgs-blocks' ) }
							/>
							{ /* contentPadding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile}
							     (Spec 35 box-tier migration) — ONE attr; each tier holds the
							     4-side box, unchanged in shape from the old sibling attrs. */ }
							<ResponsiveBoxControl
								label={ __( 'Content padding', 'sgs-blocks' ) }
								values={ {
									base: contentPadding?.desktop ?? {},
									tablet: contentPadding?.tablet ?? {},
									mobile: contentPadding?.mobile ?? {},
								} }
								onChange={ ( tier, next ) => {
									const tierKey = {
										base: 'desktop',
										tablet: 'tablet',
										mobile: 'mobile',
									}[ tier ];
									setAttributes( {
										contentPadding: { ...contentPadding, [ tierKey ]: next },
									} );
								} }
							/>
						</ToolsPanelItem>

						{ isSplit && (
							<ToolsPanelItem
								label={ __( 'Split layout grid', 'sgs-blocks' ) }
								hasValue={ () =>
									!! gridTemplateColumns ||
										!! splitContentOrder?.desktop ||
									!! splitContentOrder?.tablet ||
									( splitContentOrder?.mobile ?? 'media-first' ) !== 'media-first' ||
									false === splitImageBleed
								}
								onDeselect={ () =>
									setAttributes( {
										gridTemplateColumns: '',
										splitContentOrder: { mobile: 'media-first' },
										splitImageBleed: true,
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
														__next40pxDefaultSize
													/>
													{ isCustom && (
														<TextControl
															label={ __( 'Custom ratio', 'sgs-blocks' ) }
															help={ __( 'CSS grid-template-columns (e.g. "3fr 2fr").', 'sgs-blocks' ) }
															value={ ownValue || '' }
															onChange={ ( val ) => setOwnValue( val ) }
															__nextHasNoMarginBottom
															__next40pxDefaultSize
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
												__next40pxDefaultSize
											/>
										);
									} }
								</ResponsiveOverride>
								{ /* Column gap de-duped 2026-07-06 — the split grid gap is
								     the container gap, controlled by the shared "Gap" control
								     (ContainerWrapperControls, gap/gapTablet/gapMobile). The
								     bespoke splitGap* "Column gap" control was a duplicate. */ }
								{ /* splitContentOrder is a TIER OBJECT {desktop,tablet,mobile}
								     (Spec 35 pass 3b) — ONE attr, bound via
								     <ResponsiveOverride> (mirrors gridTemplateColumns above).
								     Per-tier option lists/labels/help still vary, so the
								     render-prop's `tier` selects them exactly as the old
								     breakpoint-keyed maps did. */ }
								<ResponsiveOverride
									label={ __( 'Column / stacking order', 'sgs-blocks' ) }
									value={ splitContentOrder }
									onChange={ ( obj ) => setAttributes( { splitContentOrder: obj } ) }
								>
									{ ( { ownValue, setOwnValue, tier } ) => {
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
										// Mobile has no blank/inherit option (MOBILE_ORDER_OPTIONS
										// mirrors render.php's own 'media-first' fallback default);
										// desktop/tablet keep the blank = inherit convention.
										const value = 'mobile' === tier ? ( ownValue || 'media-first' ) : ( ownValue || '' );
										return (
											<SelectControl
												label={ orderLabelMap[ tier ] }
												value={ value }
												options={ orderOptionsMap[ tier ] }
												help={ orderHelpMap[ tier ] }
												onChange={ ( val ) => setOwnValue( val ) }
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										);
									} }
								</ResponsiveOverride>
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
					{ [ 'nav', 'aside' ].includes( attributes.tagName ) && (
						<TextControl
							label={ __( 'Landmark label', 'sgs-blocks' ) }
							value={ attributes.ariaLabel || '' }
							onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
							help={ __( 'Required when a page has more than one Nav or Aside — lets screen readers tell them apart (e.g. "Primary", "Footer links", "Related articles").', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					) }
				</PanelBody>

				{/* ── 4. Split image styling (SPLIT VARIANT ONLY — appearance for the split
				   media column; media SELECTION for this image lives in the "Split image"
				   panel on the Settings tab).
				   Media-panel consolidation (this task): this panel used to also carry
				   !isSplit-only content — a legacy "Overlay colour" control writing the
				   deleted `overlayColour` attribute, and duplicate "Parallax scroll"/
				   "Ken Burns animation" toggles. Both are REMOVED, not moved: the shared
				   <BackgroundPanel> mounted further down this same Styles tab (see the
				   "Background" panel below) already provides the canonical overlay
				   colour/gradient control (writing `backgroundOverlayColour`) and the
				   canonical Parallax/Ken Burns toggles (writing `bgParallax`/`bgKenBurns`)
				   — and that panel is UNGATED, so it was always reachable on both variants,
				   including split (which the deleted local toggles here never were — they
				   were `!isSplit`-only, so a split hero could only reach Parallax/Ken Burns
				   through the shared panel anyway). Keeping both would have shown the
				   client two knobs for the same setting; the shared panel is the one that
				   already covers every variant, so it is the one that stays. This panel is
				   now entirely split-specific, so it is gated + retitled to say so. */ }
				{ isSplit && (
					<PanelBody title={ __( 'Split image styling', 'sgs-blocks' ) } initialOpen={ false }>
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
							<SelectControl label={ __( 'Object fit', 'sgs-blocks' ) } value={ imageObjectFit } options={ IMAGE_FIT_OPTIONS } onChange={ ( val ) => setAttributes( { imageObjectFit: val } ) } __nextHasNoMarginBottom __next40pxDefaultSize />
							{ /* Upgraded from a free-text "center 20%" TextControl to a
							     crosshair 2026-08-11 (Spec 35 capability-routing doctrine,
							     Part 9) — this control was the ONLY known-good, already-
							     responsive object-position path in the whole framework, so
							     the tier structure (desktop/tablet/mobile, three distinct
							     attrs) is kept exactly as-is; only the INPUT WIDGET changes.
							     Conversion is via the shared objectPositionToFocalPoint /
							     focalPointToObjectPosition maths (src/utils/objectPosition.js),
							     same rounding contract as the universal imageControls
							     extension's PHP side, so a legacy free-text value round-trips
							     losslessly the first time the crosshair is touched. */ }
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
										desktop: __( 'Drag the crosshair to control which part of the image stays visible when it is cropped. Applies to tablet too unless overridden below.', 'sgs-blocks' ),
										tablet: __( 'Leave centred to inherit the desktop position above.', 'sgs-blocks' ),
										mobile: __( 'Only used when a separate mobile image is set above.', 'sgs-blocks' ),
									};
									const posValue = attributes[ posKey ];
									// Tablet's "blank = inherit desktop" contract can't be
									// expressed by a crosshair (it has no empty state) — an
									// unset tablet override is shown at the desktop position
									// so dragging it always starts from what's actually
									// rendering, and is written explicitly the moment it's
									// touched (same as every other breakpoint here).
									const effectiveValue =
										'tablet' === breakpoint && ! posValue
											? attributes.imageObjectPosition ?? posDefault
											: posValue ?? posDefault;
									return (
										<FocalPositionField
											format="css-string"
											help={ posHelpMap[ breakpoint ] }
											url={ splitImage?.url || '' }
											value={ effectiveValue }
											onChange={ ( val ) =>
												setAttributes( { [ posKey ]: val } )
											}
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
										__next40pxDefaultSize
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
												__next40pxDefaultSize
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
										__next40pxDefaultSize
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
							<SelectControl label={ __( 'Border style', 'sgs-blocks' ) } value={ imageBorderStyle } options={ BORDER_STYLE_OPTIONS } onChange={ ( val ) => setAttributes( { imageBorderStyle: val } ) } __nextHasNoMarginBottom __next40pxDefaultSize />
							{ imageBorderStyle !== 'none' && (
								<>
									<ResponsiveBoxControl
										label={ __( 'Border width', 'sgs-blocks' ) }
										values={ { base: imageBorderWidth ?? {} } }
										showResponsive={ false }
										onChange={ ( tier, next ) => setAttributes( { imageBorderWidth: next } ) }
									/>
									<DesignTokenPicker
										label={ __( 'Border colour', 'sgs-blocks' ) }
										states={ [
											{
												key: 'normal',
												label: __( 'Normal', 'sgs-blocks' ),
												value: imageBorderColour,
												onChange: ( val ) => setAttributes( { imageBorderColour: val } ),
												gradientValue: imageBorderColourGradient,
												onGradientChange: ( val ) =>
													setAttributes( { imageBorderColourGradient: val ?? '' } ),
											},
										] }
									/>
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

							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Background', 'sgs-blocks' ) }</p>
							<GradientOverlayControl
								attributes={ attributes }
								setAttributes={ setAttributes }
								attrNames={ {
									gradient: 'mediaBackgroundGradient',
									solid: 'mediaBackground',
								} }
								solidLabel={ __( 'Media background colour', 'sgs-blocks' ) }
							/>
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Outer padding (around the whole media wrapper)', 'sgs-blocks' ) }</p>
							<p style={ { fontSize: '12px', color: '#757575', margin: '0 0 8px' } }>{ __( 'Affects the gap between the wrapper and the surrounding section.', 'sgs-blocks' ) }</p>
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
					</PanelBody>
				) }

				{ /* WS-4: mirrored sgs/container wrapper controls (section KIND).
				   Overlay colour/gradient + Parallax/Ken Burns for BOTH variants now live
				   solely in the shared "Background" panel (<BackgroundPanel>, mounted
				   further down this Styles tab) — see the "Split image styling" panel's
				   comment above for why the old local duplicates were removed rather than
				   repointed. This "Section (outer)" panel only ever wrote width/max-width,
				   unrelated to overlay.
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
					{ /* ⛔ "Band background colour" (contentBandBackground) REMOVED
						2026-08-12, attribute retired framework-wide — a background
						fills its CONTAINER's max-width and is never clipped to the
						inner content layer (Bean-ruled). Use the hero's own
						media/content background controls instead. Do NOT re-add a
						band-scoped background. */ }
					{ /* contentBandPadding is a TIER OBJECT — ONE attr holding
						{desktop,tablet,mobile}, each tier itself a
						{top,right,bottom,left} box (Spec 35 box-shaped pass,
						2026-08-11). Uses ResponsiveOverride, not the flat-sibling
						ResponsiveBoxControl — contentBandPaddingTablet/Mobile are
						no longer declared by block.json, so writing through the
						old attrMap would silently discard both tiers (D338).
						Mirrors sgs/container's own edit.js. */ }
					{ /* ⛔ NO `label` on the wrapper, and NO `hideLabelFromVision` on the
					     BoxControl — core's BoxControl ignores that prop and always renders its
					     own label, so both painted (sentence case + WP's uppercase). Keep
					     BoxControl's; BaseControl associates it with the inputs. Full reasoning
					     at components/ResponsiveBoxControls.js. */ }
					<ResponsiveOverride
						value={ contentBandPadding }
						onChange={ ( obj ) => setAttributes( { contentBandPadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<BoxControl
								label={ __( 'Band padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								splitOnAxis={ false }
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
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

				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />

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
				{ /* Mirrors hero/render.php's overlay gate + gradient/solid branch
				   (D5 + the 2026-08-11 gradient-render bug fix) — a colour or
				   gradient with no background media now renders too, and the
				   editor preview must agree with the frontend. */ }
				{ ( () => {
					// Raw (undefaulted) — decides WHETHER an overlay was explicitly
					// set. 'text' below is a PAINT default only, applied once the
					// span already exists for another reason (media present); it
					// must never itself trigger the span.
					const resolvedColourRaw = backgroundOverlayColour || '';
					// `overlayGradient` IS the complete CSS gradient string since the
					// D636 storage collapse (837f7c97) — no angle/from/to scalars to
					// rebuild from. This previously gated on `overlayGradientFrom`, an
					// attribute that commit deleted, so the gradient branch could never
					// be reached and the (also-deleted) builder it called was dead.
					// Fixed 2026-08-16 (D643).
					const hasOverlayColour = !! resolvedColourRaw || !! overlayGradient;
					const showsOverlay =
						( ! isSplit && !! backgroundImage?.url ) ||
						hasOverlayColour;
					if ( ! showsOverlay ) {
						return null;
					}
					return (
						<span
							className="sgs-hero__overlay"
							style={
								overlayGradient
									? { backgroundImage: overlayGradient }
									: { backgroundColor: resolvedColourRaw || colourVar( 'text' ) }
							}
							aria-hidden="true"
						/>
					);
				} )() }

				{ /* FR-22-6: content column is the InnerBlocks slot (label + heading + text + buttons).
				   Standard variant only: wrapped in the content-band preview (mirrors the
				   frontend's `.sgs-container__inner`) whenever Content band padding is set —
				   see the `showContentBand` derivation above for why split never wraps. */ }
				{ showContentBand ? (
					<div className="sgs-container__inner" style={ { padding: bandPaddingPreview } }>
						<div { ...innerBlocksProps } />
					</div>
				) : (
					<div { ...innerBlocksProps } />
				) }

				{ /* Canvas preview of the split column. Reads the TYPED families, the
				     same ones render.php resolves, so the editor and the front end
				     cannot disagree about what this slot holds. Desktop tier only —
				     the per-tier preview is what WP's own device switcher provides.
				     The old `splitMedia?.type === 'video'` branch was removed with
				     that attribute (2026-08-13). */ }
				{ isSplit &&
					( splitImage?.url ||
						splitVideo?.url ||
						splitSvg ) && (
						<div
							className={ mediaWrapperClassName }
							style={
								Object.keys( mediaWrapperStyle ).length
									? mediaWrapperStyle
									: undefined
							}
						>
							{ splitMediaType === 'video' && splitVideo?.url && (
								<video
									src={ splitVideo.url }
									className={ splitImageClassName }
									style={ imagePreviewStyle }
									autoPlay
									muted
									loop
									playsInline
								/>
							) }
							{ splitMediaType === 'svg' && splitSvg && (
								/* Editor-only preview of the operator's own pasted markup,
								   identical in mechanism and purpose to media/edit.js:1538.
								   The SERVER is the security boundary: render.php passes every
								   SVG tier through wp_kses( ..., sgs_allowed_svg_tags() ), so
								   nothing unsanitised reaches a visitor. aria-hidden matches
								   media's treatment — the preview is decorative. */
								/* eslint-disable-next-line react/no-danger */
								<div
									className={ splitImageClassName }
									style={ imagePreviewStyle }
									aria-hidden="true"
									dangerouslySetInnerHTML={ {
										__html: splitSvg,
									} }
								/>
							) }
							{ splitMediaType !== 'video' &&
								splitMediaType !== 'svg' &&
								splitImage?.url && (
									<img
										src={ splitImage.url }
										alt={ splitImage.alt || '' }
										className={ splitImageClassName }
										style={ imagePreviewStyle }
									/>
								) }
						</div>
					) }
			</div>
		</>
	);
}
