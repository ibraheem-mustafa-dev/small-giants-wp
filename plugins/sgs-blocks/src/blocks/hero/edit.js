import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	TextControl,
} from '@wordpress/components';
import { ResponsiveControl, ResponsiveOverride, ResponsiveBoxControl, ShadowControl, shadowAttrKeys, GradientOverlayControl, gradientOverlayAttrKeys, BOX_UNITS, normaliseResponsiveBox, SgsColourPanel, SgsBorderControl, resolveColourToken, TypographyControls, SgsBoxControl, SgsLengthControl } from '../../components';

const CONTENT_GAP_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
];
import MediaElementPanel from '../../components/MediaElementPanel.js';
import BackgroundLayers from '../../components/media/BackgroundLayers';
import mediaPreview from '../../components/media/mediaPreview.js';
import { resolveTierSource, useActiveDevice } from '../../components/media/deviceValues.js';
import { hasFile } from '../../components/media/mediaSlotWrites.js';
import {
	resolveShadowPreviewComposed,
	resolveBackgroundPaintPreviewStyle,
	textPaintPreview,
	resolveResponsiveTier,
	flattenPresetSetting,
	usePreviewTier,
	textIndentPreviewCss,
	sgsBorderPreview,
} from '../../utils';
// No-inline migration: hero no longer uses the default
// <ContainerWrapperControls> aggregator — its unconditional "Content band" /
// per-grid-area panels write to LEGACY FLAT attrs, which would become dead
// controls once contentPadding becomes a box
// objects. Import the individual panels still needed instead (mirrors
// sgs/container's own edit.js, which took the same approach); hero rolls its
// own "Content band" / "Content area" / "Media area" panels below using
// ResponsiveBoxControl bound to the new object attrs.
import {
	WidthPanel,
	ShapeDividersPanel,
} from '../container/components/ContainerWrapperControls';
import { BackgroundPanel } from '../container/components/BackgroundPanel';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { sanitiseSvg, svgBackgroundPreview, backgroundMediaPreview, wrapperToneClass, surfaceBackdropPreview } from '../../utils';
import { heroCanvasPreview } from './canvas-preview';
import metadata from './block.json';
import { motionNamesBand } from '../extensions/motion/canvas/resolve-target';
import { getBlockType } from '@wordpress/blocks';

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

// Alignment & grid panel (gap 1, 2026-09-02) — option lists match hero's own
// block.json enums exactly (NOT copied verbatim from sgs/site-footer-row,
// whose flexDirection enum also carries row-reverse/column-reverse — hero's
// enum is only '' | 'row' | 'column').
const FLEX_DIRECTION_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Row', 'sgs-blocks' ), value: 'row' },
	{ label: __( 'Column', 'sgs-blocks' ), value: 'column' },
];

const FLEX_WRAP_OPTIONS = [
	{ label: __( 'Wrap', 'sgs-blocks' ), value: 'wrap' },
	{ label: __( 'No wrap', 'sgs-blocks' ), value: 'nowrap' },
];

const JUSTIFY_CONTENT_OPTIONS = [
	{ label: __( '— default —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Flex start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Flex end', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
	{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
];

// Grid-only: align-content. block.json's enum includes 'stretch' as its
// default member — 'stretch' IS the reset value (mirrors sgs/site-footer-row's
// identically-shaped constant).
const ALIGN_CONTENT_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Space between', 'sgs-blocks' ), value: 'space-between' },
	{ label: __( 'Space around', 'sgs-blocks' ), value: 'space-around' },
	{ label: __( 'Space evenly', 'sgs-blocks' ), value: 'space-evenly' },
];

/**
 * FR-22-6: full content column template.
 * Produces: eyebrow label → headline (h1) → sub-headline paragraph → CTA buttons.
 * Converter supplies sgs/label + sgs/heading + sgs/text + sgs/multi-button.
 */
const SPLIT_ENTRY = metadata.supports.sgs.mediaElements.find( ( e ) => 'split' === e.prefix );
const SPLIT_SLOT = { prefix: 'split', kinds: SPLIT_ENTRY.kinds, context: SPLIT_ENTRY.context };

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

const ALIGN_OPTIONS = [
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
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

/**
 * The media element one device shows in the split column (the editor's twin of the renderer's picture, video and SVG).
 *
 * @param {Object} props
 * @param {Object} props.shown The source at the previewed device.
 * @param {string} props.alt   Its alt text.
 * @return {JSX.Element|null} The element.
 */
function SplitMediaElement( { shown, alt } ) {
	if ( 'video' === shown.kind ) {
		return (
			<span className="sgs-media-stack">
				{ shown.poster?.url && <img className="sgs-media-el sgs-media-cover" src={ shown.poster.url } alt="" /> }
				{ shown.url && <video className="sgs-media-el sgs-media-video" src={ shown.url } poster={ shown.poster?.url || undefined } muted loop autoPlay playsInline /> }
			</span>
		);
	}
	if ( 'svg' === shown.kind && shown.markup ) {
		// Editor preview of the operator's own markup, through the same allowlist the server uses.
		return <span className="sgs-media-el sgs-media-svg" aria-hidden="true" dangerouslySetInnerHTML={ { __html: sanitiseSvg( shown.markup ) } } />; // eslint-disable-line react/no-danger
	}
	if ( shown.url ) {
		return <img className="sgs-media-el" src={ shown.url } width={ shown.width || undefined } height={ shown.height || undefined } alt={ alt } />;
	}
	return null;
}

export default function Edit( { attributes, setAttributes, name, clientId } ) {
	const previewTier = usePreviewTier();
	const indentPreviewCss = textIndentPreviewCss( attributes, '', `#block-${ clientId }`, previewTier );
	const {
		variant,
		alignment,
		backgroundOverlayColour,
		backgroundOverlayGradient,
		// minHeight is a TIER OBJECT {desktop,tablet,mobile}: the minHeightTablet/minHeightMobile siblings no longer exist.
		minHeight,
		shadow,
		borderColourGradient,
		borderColour,
		borderWidth,
		borderStyle,
		// D702 — root background/text colour, resting + hover pairs. Mirrors
		// sgs/testimonial-slider's `slider` element (backgroundColour/textColour
		// + Hover siblings) — TWO states per row (normal + hover),
		// gradient-capable on both rows.
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		textColour,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
		contentBackground,
		contentBackgroundGradient,
		// contentPadding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile} —
		// ONE attr; each tier is a {top,right,bottom,left} box.
		contentPadding,
		// Phase 1 — layout grid. splitColumnRatio* retired (Step 6, 2026-06-11);
		// render.php now reads gridTemplateColumns* for the split variant.
		gridTemplateColumns,
		// splitContentOrder is a TIER OBJECT {desktop,tablet,mobile} as of Spec 35
		// pass 3b — the *Tablet/*Mobile siblings no longer exist.
		splitContentOrder,
		// Phase 1 — vertical alignment.
		verticalAlignment,
		// HC2 — per-breakpoint text alignment on .sgs-hero__content. TIER OBJECT
		// (D777/S2 fix, 2026-09-04) — {desktop,tablet,mobile}, mirrors
		// gridTemplateColumns/splitContentOrder just above.
		textAlign,
		// Alignment & grid (gap 1, 2026-09-02) — the shared wrapper's `inner`
		// grid/flex layout element (class-sgs-container-wrapper.php:3057-3068)
		// consumes all 7 of these; none had an editor control until now. `layout`
		// is the grid-vs-flex discriminator, mirroring sgs/site-footer-row's own
		// `isGrid = 'grid' === layout`.
		layout,
		alignContent,
		justifyContent,
		flexDirection,
		flexWrap,
		gridAutoRows,
		gridTemplateRows,
		justifyItems,
		// Hover-state border colour + transition (gap 2, 2026-09-02) — declared
		// and read directly by render.php (borderColourHover/
		// borderColourHoverGradient at render.php:221-223; transitionDuration/
		// transitionEasing consumed by sgs_transition_vars()), previously no
		// editor control existed for any of the four.
		borderColourHover,
		borderColourHoverGradient,
		transitionDuration,
		transitionEasing,
	} = attributes;

	const isGrid = 'grid' === layout;

	const isSplit = variant === 'split';

	// CHECK A (2026-09-05) — colour palette for textColour/textColourGradient
	// canvas previews below, same
	// hook sgs/container's edit.js uses for the identical purpose.
	const [ colourPalette ] = useSettings( 'color.palette' );
	// The theme's gradient presets, normalised by flattenPresetSetting() —
	// useSettings() returns a flat array or an origin-keyed object depending on
	// the feature — so wrapperToneClass() can resolve a preset SLUG in
	// backgroundColourGradient to its CSS stops for the sgs-on-dark/sgs-on-light check.
	const [ rawGradientPresets ] = useSettings( 'color.gradients' );
	const gradientPresets = flattenPresetSetting( rawGradientPresets );

	// The canvas styles and the split column's media at the previewed device tier.
	const heroPreview = heroCanvasPreview( attributes, { tier: previewTier, palette: colourPalette, isSplit } );

	// Root background paint (backgroundColour / backgroundColourGradient).
	// Spread FIRST so the background-image branch below still wins when a media
	// image is set — mirroring render.php's documented precedence ("the image
	// always paints over the colour", render.php:914-933).
	//
	// Without this the canvas painted the `:where()` fallback in style.css
	// (`:where(.sgs-hero):not(.has-background)`) no matter what the client
	// picked, because NOTHING here consumed the attribute — proven live in the
	// canary editor 2026-08-28 by setting backgroundColour to #00FF00 and
	// measuring the canvas unchanged at rgb(197,106,122). The fallback is
	// de-specified to (0,0,0), so an inline paint is sufficient on its own:
	// no `has-background` class and no editor.css change are needed, and adding
	// either would be a second overlapping fix for an already-fixed cause.
	// Decorative SVG background layer — editor mirror. Legitimate as of
	// 2026-09-05: render.php no longer nulls `bgSvgContent` before the wrapper
	// call, so the shared wrapper now paints this layer on hero exactly as it
	// does on the other eight adopting blocks. Before that it painted nothing,
	// and mirroring it here would have made the canvas show an SVG the page
	// would never render.
	//
	// Attributes enumerated explicitly, not passed wholesale: CHECK A resolves
	// an attribute as canvas-reflected only when its NAME appears outside the
	// Inspector panels.
	const svgPreview = svgBackgroundPreview( {
		bgSvgContent: attributes.bgSvgContent,
		bgSvgPosition: attributes.bgSvgPosition,
		bgSvgOpacity: attributes.bgSvgOpacity,
		bgSvgMinHeight: attributes.bgSvgMinHeight,
		bgSvgTextShadow: attributes.bgSvgTextShadow,
	} );

	// The background's canvas layers and the tier-aware paint around them, as the shared Background panel and the
	// container preview them (`backgroundMediaPreview`, `BackgroundLayers`: the same two nodes the page prints).
	const bgPreview = backgroundMediaPreview( attributes, colourPalette, gradientPresets, previewTier );

	const wrapperStyle = {
		...heroPreview.root,
		...svgPreview.style,
		...surfaceBackdropPreview( { surfaceBlur: attributes.surfaceBlur, surfaceSaturate: attributes.surfaceSaturate } ),
		...bgPreview.style,
		...resolveBackgroundPaintPreviewStyle(
			backgroundColour,
			backgroundColourGradient
		),
		// CHECK A (2026-09-05) — textColour/textColourGradient paint the
		// root `.{uid}` selector (render.php:384-390, sgs_resolve_text_colour_or_gradient()
		// + sgs_text_colour_decl()), not the content column — mirrors that here
		// so InnerBlocks text inherits the same `color`/gradient-clip preview
		// the frontend renders. hoverColour siblings stay unmirrored, matching
		// every other hover-only pair in this file (hover has no canvas state).
		...textPaintPreview( textColour, textColourGradient, colourPalette ),
	};
	// Grid-track (split) / flex-axis (standard) canvas preview — 2026-09-05,
	// mirrors render.php's own gating exactly (added in the same fix) now that
	// the frontend genuinely paints these 7 attributes. Previously exempted as
	// dead; that was true until render.php was fixed, so this closes the
	// resulting editor-canvas gap rather than leaving it re-opened.
	if ( isSplit ) {
		if ( justifyItems && justifyItems !== 'stretch' ) {
			wrapperStyle.justifyItems = justifyItems;
		}
		if ( alignContent && alignContent !== 'stretch' ) {
			wrapperStyle.alignContent = alignContent;
		}
		if ( gridAutoRows ) {
			wrapperStyle.gridAutoRows = gridAutoRows;
		}
		const gridRowsDesktop = resolveResponsiveTier( gridTemplateRows, 'desktop' )?.value;
		if ( gridRowsDesktop ) {
			wrapperStyle.gridTemplateRows = gridRowsDesktop;
		}
	} else {
		if ( flexDirection ) {
			wrapperStyle.flexDirection = flexDirection;
		}
		if ( justifyContent ) {
			wrapperStyle.justifyContent = justifyContent;
		}
		if ( flexWrap && flexWrap !== 'wrap' ) {
			wrapperStyle.flexWrap = flexWrap;
		}
	}
	if ( shadow ) {
		wrapperStyle.boxShadow = resolveShadowPreviewComposed( shadow, attributes.shadowColour );
	}
	const contentPreviewStyle = heroPreview.content;

	// Root border preview — previously entirely absent from the canvas (only
	// wired into SgsBorderControl's InspectorControls binding, never applied
	// to wrapperStyle, unlike splitMedia's own border a few lines below which
	// DOES preview). Same box-object family, base only, no tiers. Mirrors
	// splitMedia's raw colour pass-through (no token resolution) rather than
	// introducing a different mechanism into this file.
	Object.assign( wrapperStyle, sgsBorderPreview( { widthValues: borderWidth, styleValue: borderStyle, colourValue: borderColour, colourGradientValue: borderColourGradient }, previewTier, colourPalette ) );

	// Content band (`.sgs-container__inner`): standard variant only; split passes wrap_inner=false.
	const { hasBandProps: bandFromProps, bandStyle: contentBandStyle } = heroPreview.band;
	// A motion layer on the band part (`content-band`, `inner`; Spec 38A §6.2) forces the band, as
	// `Sgs_Motion_Targets::names_band()` does on the page; split passes wrap_inner=false there too.
	const showContentBand = bandFromProps || ( ! isSplit && motionNamesBand( attributes, 'sgs/hero', getBlockType( 'sgs/hero' )?.supports?.sgs?.elements || {} ) );

	// The split media: the shared slot preview (the editor's twin of `SGS_Media_Element::render()`), the media element of
	// the device being edited, inside the hero's own grid cell (`.sgs-hero__media`, where column order applies).
	const activeDevice = useActiveDevice();
	const splitUid = 'sgs-hero-' + clientId.slice( 0, 8 );
	const splitPreview = mediaPreview( SPLIT_SLOT, attributes, splitUid );
	const splitShown = resolveTierSource( attributes.splitSource, activeDevice, hasFile ).value;
	const splitAlt = attributes.splitDecorative ? '' : splitShown?.alt || attributes.splitAlt || '';
	const mediaWrapperStyle = heroPreview.media;

	// `has-background` suppression flag — mirrors render.php:934-938.
	//
	// ⛔ NOT redundant with the inline paint above, and the reason is a CSS fact
	// that is easy to get wrong (it was, on the first pass at this fix). The
	// inline `background-color` beats the `:where()` fallback in style.css only
	// where they COMPETE — and they do not. style.css's fallback is a
	// `background-image` gradient; a colour and an image are DIFFERENT
	// properties, so they stack rather than override, and the gradient paints
	// OVER the client's colour. Verified live in the canary editor: with
	// backgroundColour '#00FF00' the element carried
	// `background-color: rgb(0,255,0)` AND still computed
	// `background-image: linear-gradient(135deg, rgb(197,106,122)…)`.
	//
	// This class is what disengages `:where(.sgs-hero):not(.has-background)`,
	// and render.php has always emitted it (see its own comment there on the same defect).
	// The gradient case needs only the inline paint — same property, so it does
	// override — but the COLOUR case needs both.
	const hasBackgroundPaint =
		!! backgroundColour ||
		!! backgroundColourGradient ||
		!! backgroundOverlayColour ||
		!! backgroundOverlayGradient;

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the hero's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const heroBorderContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	// NOTE the SPREAD on svgPreview.className — it returns a string ARRAY, and
	// passing it unspread to .join(' ') stringifies it with COMMAS, silently
	// killing all four SVG classes. Same trap fixed on container 2026-09-05.
	//
	const className = [
		'sgs-hero',
		`sgs-hero--${ variant }`,
		`sgs-hero--align-${ alignment }`,
		hasBackgroundPaint ? 'has-background' : null,
		...svgPreview.className,
		bgPreview.className,
		wrapperToneClass( {
			backgroundOverlayColour: attributes.backgroundOverlayColour,
			overlayGradient: attributes.backgroundOverlayGradient,
			backgroundOverlayOpacity: attributes.backgroundOverlayOpacity,
			// The tone judge only asks whether a photo is there (it never samples one).
			backgroundImage: bgPreview.media ? { url: bgPreview.media.url || 'photo' } : null,
			backgroundColourGradient,
			backgroundColour,
			surfaceTone: attributes.surfaceTone,
		}, colourPalette, gradientPresets ),
		heroPreview.layoutClass,
	]
		.filter( Boolean )
		.join( ' ' );

	// Mirrors class-sgs-container-wrapper.php:2794-2798. `pointer-events:none`
	// is editor-only insurance so the decorative layer cannot swallow a click.
	const svgLayer = svgPreview.hasSvg ? (
		<div
			className="sgs-container__svg-bg"
			aria-hidden="true"
			style={ { pointerEvents: 'none' } }
			dangerouslySetInnerHTML={ { __html: svgPreview.markup } }
		/>
	) : null;

	const blockProps = useBlockProps( { className, style: wrapperStyle } );

	// FR-22-6: content column uses InnerBlocks (label + heading + text + buttons).
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-hero__content', style: contentPreviewStyle },
		{
			template: HERO_CONTENT_TEMPLATE,
			templateLock: attributes.templateLock || false,
		}
	);

	return (
		<>
			{ /* D702 — ONE grouped, SGS-OWNED colour panel for the root element,
			   rendered FIRST (SgsColourPanel's own contract: it must mount
			   before any other same-group `<InspectorControls group="styles">`
			   Fill in this file, since WordPress concatenates same-group Fills
			   in mount order — the "Section (outer)" panel further down also
			   uses group="styles"). Mirrors sgs/testimonial-slider's `slider`
			   element and sgs/button's own top-level SgsColourPanel: TWO states
			   per row (normal + hover), both gradient-capable. Background uses
			   the in-row per-state gradient shape (DesignTokenPicker's own
			   `gradientValue`/`onGradientChange`); text uses the row-level
			   `gradientCapable: true` shape (GradientCapableColourControl's
			   `gradientValue`/`onGradientChange`) since text-colour gradients
			   paint via `background-clip: text`, matching sgs/heading. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
								gradientValue: backgroundColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						// Contrast check against the root section background.
						// `contrastAgainst` only accepts a FLAT colour/token —
						// when `backgroundColourGradient` is also set, the gradient
						// (not the flat colour) is what actually paints, so the
						// check is skipped in that case rather than comparing
						// against a surface that isn't rendered.
						contrastAgainst:
							backgroundColour && ! backgroundColourGradient
								? backgroundColour
								: '',
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) => setAttributes( { textColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
								gradientValue: textColourHoverGradient,
								onGradientChange: ( val ) => setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
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

				{ /* The split media (SPLIT VARIANT ONLY): the shared media panels for the `split` slot, which own its source per
				     device, alt and decorative, fit and focal point, size and crop, padding, background, border and shape,
				     shadow and overlay. Column order and the content column's own settings stay in the hero's panels below. */ }
				{ isSplit && (
					<MediaElementPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix="split"
						blockSlug={ name }
						blockName={ name }
						context={ SPLIT_ENTRY.context }
						kinds={ SPLIT_ENTRY.kinds }
					/>
				) }
			</InspectorControls>

			{/* ── Styles tab — appearance: colour, spacing, borders, shadows,
			   layout/grid geometry, hover/effects. ── */}
			<InspectorControls group="styles">
				{/* Typography — replaces the old WP-native supports.typography
				    (fontSize/lineHeight/letterSpacing/textTransform/fontWeight/
				    fontStyle) with the shared TypographyControls component +
				    sgs_typography_css_rule() render.php helper (D971/D972
				    full-replacement track). Root prefix "" — the wrapper element,
				    matching block.json's corrected `selectors.typography` (the
				    root `.wp-block-sgs-hero`, not the never-emitted
				    `.sgs-hero__headline`). showLetterSpacing/showTransform are
				    enabled because the native support being replaced actually
				    declared and rendered both. */}
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls fontSizePresets showFontFamily showDecoration showTextAlign showTextWrap showTextStroke showTextColumns showTextIndent showWritingMode
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						showLetterSpacing
						showTransform
					/>
				</PanelBody>

				{ /* ── Border (gap 2, 2026-09-02) — moved from the Settings tab to the
				   Styles tab 2026-09-07: border colour/gradient/radius and transition
				   duration/easing are pure styling, not settings. Gap 2's own
				   colourStates rationale (Normal/Hover tabs for
				   borderColourHover/borderColourHoverGradient) is unchanged. */ }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: borderColour,
								onChange: ( val ) => setAttributes( { borderColour: val ?? '' } ),
								linked: true,
								gradientValue: borderColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						] }
						contrastAgainst={ heroBorderContrastAgainst }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>

				{ /* ── Hover (gap 2, 2026-09-02) — moved from the Settings tab to the
				   Styles tab 2026-09-07, adjacent to Border: transitionDuration/
				   transitionEasing are declared and consumed by
				   sgs_transition_vars() (render.php) and are pure styling. Mirrors
				   sgs/quote's identically-shaped "Hover" panel controls —
				   scale/shadow-on-hover controls are NOT added here, hero declares
				   no scaleHover/boxShadowHover attrs, only the transition pair is
				   in scope for this fix. */ }
				<PanelBody title={ __( 'Hover', 'sgs-blocks' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ parseInt( transitionDuration, 10 ) || 300 }
						onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
						min={ 0 }
						max={ 1000 }
						step={ 50 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ transitionEasing }
						options={ [
							{ label: 'ease-in-out', value: 'ease-in-out' },
							{ label: 'ease', value: 'ease' },
							{ label: 'ease-in', value: 'ease-in' },
							{ label: 'ease-out', value: 'ease-out' },
							{ label: 'linear', value: 'linear' },
						] }
						onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				{/* ── 2. Container / Entire Block ── */}
				{ /* Converted to ToolsPanel/ToolsPanelItem (Spec 35 T4.1 tail, audit-inspector-conformance
				     dense-panel-candidate — 14 control-like elements). hasValue/onDeselect check against
				     the DECLARED block.json defaults (D328): alignment='left', verticalAlignment='center',
				     textAlign{Desktop,Tablet,Mobile}='', minHeight='' / minHeightTablet='' / minHeightMobile='360px',
				     contentBackground='', contentPadding{,Tablet,Mobile}={}, gridTemplateColumns{,Tablet,Mobile}='',
				     splitContentOrderMobile='media-first'. Text/vertical alignment are
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
								textAlign: {},
								minHeight: { mobile: '360px' },
								contentBackground: '',
								contentPadding: { desktop: {} },
								...( isSplit && {
									gridTemplateColumns: '',
									splitContentOrder: { mobile: 'media-first' },
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
						    Empty = inherit the variant's own alignment. textAlign is a
						    TIER OBJECT {desktop,tablet,mobile} (D777/S2 fix,
						    2026-09-04) — ONE attr, bound directly via
						    <ResponsiveOverride> (mirrors minHeight/gridTemplateColumns
						    above), replacing the old three-flat-attr attrMap. */}
						<ToolsPanelItem
							label={ __( 'Content text align', 'sgs-blocks' ) }
							hasValue={ () =>
								!! textAlign?.desktop || !! textAlign?.tablet || !! textAlign?.mobile
							}
							onDeselect={ () => setAttributes( { textAlign: {} } ) }
						>
							<ResponsiveOverride
								label={ __( 'Content text align', 'sgs-blocks' ) }
								value={ textAlign }
								onChange={ ( obj ) => setAttributes( { textAlign: obj } ) }
							>
								{ ( { ownValue, setOwnValue } ) => (
									<SelectControl
										value={ ownValue ?? '' }
										options={ TEXT_ALIGN_OPTIONS }
										onChange={ setOwnValue }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								) }
							</ResponsiveOverride>
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

						<ToolsPanelItem
							label={ __( 'Content stack gap', 'sgs-blocks' ) }
							hasValue={ () =>
								!! attributes.contentGap?.desktop ||
								!! attributes.contentGap?.tablet ||
								!! attributes.contentGap?.mobile
							}
							onDeselect={ () => setAttributes( { contentGap: {} } ) }
						>
							<ResponsiveOverride
								label={ __( 'Space between content items', 'sgs-blocks' ) }
								value={ attributes.contentGap }
								onChange={ ( obj ) => setAttributes( { contentGap: obj } ) }
							>
								{ ( { ownValue, setOwnValue } ) => (
									<SgsLengthControl
										presets={ false }
										scale="spacing"
										label={ __( 'Space between content items', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ ownValue || '' }
										units={ CONTENT_GAP_UNITS }
										onChange={ ( val ) => setOwnValue( val || '' ) }
									/>
								) }
							</ResponsiveOverride>
						</ToolsPanelItem>

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
								attrNames={ gradientOverlayAttrKeys( 'contentBackground', { solid: 'contentBackground' } ) }
								solidLabel={ __( 'Content background colour', 'sgs-blocks' ) }
							/>
							{ /* contentPadding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile}
							     ONE attr; each tier holds the 4-side box. */ }
							<ResponsiveBoxControl
								label={ __( 'Content padding', 'sgs-blocks' ) }
								presets
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

				{ /* ── Alignment & grid (gap 1, 2026-09-02, appendix to the
				   21-render-without-control detector's findings against
				   sgs/hero). Mirrors sgs/site-footer-row's identically-titled
				   ToolsPanel (edit.js:510-707) — same shape, hero's own
				   7-attribute subset (no gridTemplateColumns/alignItems: the
				   former is the UNRELATED split-media column-ratio control
				   above, the latter is genuinely dead on this block per grep of
				   render.php and is deliberately not given a control here).
				   Governs the shared wrapper's `inner` GRID layer
				   (class-sgs-container-wrapper.php:3057-3068), a separate
				   element from the "Container / Entire Block" panel above
				   (which governs the OUTER wrapper). */ }
				<PanelBody title={ __( 'Alignment & grid', 'sgs-blocks' ) } initialOpen={ false }>
					{ /* The ToolsPanel label deliberately does NOT repeat the PanelBody
					   title above it (rule 29 / Spec 35 Part A5 — mirrors the
					   "Container / Entire Block" panel's own comment a few hundred
					   lines up this file). A nested ToolsPanel names the CLUSTER it
					   resets, not its parent. */ }
					<ToolsPanel
						label={ __( 'Grid & flex settings', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								alignContent: 'stretch',
								justifyContent: '',
								flexDirection: '',
								flexWrap: 'wrap',
								gridAutoRows: '',
								gridTemplateRows: {},
								justifyItems: 'stretch',
							} )
						}
					>
						{ ! isGrid && (
							<ToolsPanelItem
								label={ __( 'Flex direction', 'sgs-blocks' ) }
								hasValue={ () => flexDirection !== '' }
								onDeselect={ () => setAttributes( { flexDirection: '' } ) }
								isShownByDefault
							>
								<ToggleGroupControl
									label={ __( 'Flex direction', 'sgs-blocks' ) }
									value={ flexDirection || '' }
									onChange={ ( val ) =>
										setAttributes( { flexDirection: val } )
									}
									help={ __(
										'Reverses or stacks the content and media columns instead of the normal left-to-right order.',
										'sgs-blocks'
									) }
									isBlock
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								>
									{ FLEX_DIRECTION_OPTIONS.map( ( opt ) => (
										<ToggleGroupControlOption
											key={ opt.value }
											value={ opt.value }
											label={ opt.label }
										/>
									) ) }
								</ToggleGroupControl>
							</ToolsPanelItem>
						) }
						{ ! isGrid && (
							<ToolsPanelItem
								label={ __( 'Flex wrap', 'sgs-blocks' ) }
								hasValue={ () => ( flexWrap || 'wrap' ) !== 'wrap' }
								onDeselect={ () => setAttributes( { flexWrap: 'wrap' } ) }
							>
								<SelectControl
									label={ __( 'Flex wrap', 'sgs-blocks' ) }
									value={ flexWrap || 'wrap' }
									options={ FLEX_WRAP_OPTIONS }
									onChange={ ( val ) =>
										setAttributes( { flexWrap: val } )
									}
									help={ __(
										'Whether the content and media columns are allowed to wrap onto a new line.',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }
						{ ! isGrid && (
							<ToolsPanelItem
								label={ __( 'Justify content', 'sgs-blocks' ) }
								hasValue={ () => justifyContent !== '' }
								onDeselect={ () => setAttributes( { justifyContent: '' } ) }
							>
								<SelectControl
									label={ __( 'Justify content', 'sgs-blocks' ) }
									value={ justifyContent || '' }
									options={ JUSTIFY_CONTENT_OPTIONS }
									onChange={ ( val ) =>
										setAttributes( { justifyContent: val } )
									}
									help={ __(
										'How the content and media columns are spaced along the row when they do not fill it.',
										'sgs-blocks'
									) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
						) }
						{ isGrid && (
							<>
								<ToolsPanelItem
									label={ __( 'Justify items', 'sgs-blocks' ) }
									hasValue={ () => ( justifyItems || 'stretch' ) !== 'stretch' }
									onDeselect={ () => setAttributes( { justifyItems: 'stretch' } ) }
									isShownByDefault
								>
									<ToggleGroupControl
										label={ __( 'Justify items', 'sgs-blocks' ) }
										help={ __(
											'How each grid item sits inside its own column when narrower than the column.',
											'sgs-blocks'
										) }
										value={ justifyItems || 'stretch' }
										onChange={ ( val ) =>
											setAttributes( { justifyItems: val || 'stretch' } )
										}
										isBlock
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									>
										<ToggleGroupControlOption value="stretch" label={ __( 'Stretch', 'sgs-blocks' ) } />
										<ToggleGroupControlOption value="start" label={ __( 'Start', 'sgs-blocks' ) } />
										<ToggleGroupControlOption value="center" label={ __( 'Centre', 'sgs-blocks' ) } />
										<ToggleGroupControlOption value="end" label={ __( 'End', 'sgs-blocks' ) } />
									</ToggleGroupControl>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Align content', 'sgs-blocks' ) }
									hasValue={ () => ( alignContent || 'stretch' ) !== 'stretch' }
									onDeselect={ () => setAttributes( { alignContent: 'stretch' } ) }
								>
									<SelectControl
										label={ __( 'Align content', 'sgs-blocks' ) }
										value={ alignContent || 'stretch' }
										options={ ALIGN_CONTENT_OPTIONS }
										onChange={ ( val ) =>
											setAttributes( { alignContent: val } )
										}
										help={ __(
											'Spacing between grid rows when this section has more than one row.',
											'sgs-blocks'
										) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Row template', 'sgs-blocks' ) }
									hasValue={ () => !! gridTemplateRows?.desktop || !! gridTemplateRows?.tablet || !! gridTemplateRows?.mobile }
									onDeselect={ () => setAttributes( { gridTemplateRows: {} } ) }
								>
									<ResponsiveOverride
										label={ __( 'Row template', 'sgs-blocks' ) }
										value={ gridTemplateRows }
										onChange={ ( obj ) =>
											setAttributes( { gridTemplateRows: obj } )
										}
									>
										{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
											<TextControl
												value={ ownValue }
												onChange={ setOwnValue }
												placeholder={
													inherited ? effectiveValue : ''
												}
												help={ __(
													"CSS grid-template-rows, e.g. 'auto 1fr'. Leave blank for the browser default.",
													'sgs-blocks'
												) }
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										) }
									</ResponsiveOverride>
								</ToolsPanelItem>
								<ToolsPanelItem
									label={ __( 'Auto rows', 'sgs-blocks' ) }
									hasValue={ () => gridAutoRows !== '' }
									onDeselect={ () => setAttributes( { gridAutoRows: '' } ) }
								>
									<TextControl
										label={ __( 'Auto rows', 'sgs-blocks' ) }
										value={ gridAutoRows || '' }
										onChange={ ( val ) =>
											setAttributes( { gridAutoRows: val } )
										}
										help={ __(
											"Sets grid-auto-rows, e.g. '1fr' for equal-height rows or 'minmax(100px,auto)'.",
											'sgs-blocks'
										) }
										__nextHasNoMarginBottom
										__next40pxDefaultSize
									/>
								</ToolsPanelItem>
							</>
						) }
						{ isSplit && (
							<ToolsPanelItem
								label={ __( 'Split layout grid', 'sgs-blocks' ) }
								hasValue={ () =>
									!! gridTemplateColumns ||
										!! splitContentOrder?.desktop ||
									!! splitContentOrder?.tablet ||
									( splitContentOrder?.mobile ?? 'media-first' ) !== 'media-first'
								}
								onDeselect={ () =>
									setAttributes( {
										gridTemplateColumns: '',
										splitContentOrder: { mobile: 'media-first' },
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
							</ToolsPanelItem>
						) }
					</ToolsPanel>
				</PanelBody>

				{ /* WS-4: mirrored sgs/container wrapper controls (section KIND).
				   Background media, overlay and Parallax/Ken Burns for BOTH variants live
				   solely in the shared "Background" panel (<BackgroundPanel>, mounted
				   further down this Styles tab). This "Section (outer)" panel only ever
				   wrote width/max-width, unrelated to overlay.
				   No-inline migration (2026-07-09): the default <ContainerWrapperControls>
				   aggregator is no longer used (see the import comment above) — its
				   "Content band" + per-grid-area panels wrote to legacy FLAT attrs
				   that no longer exist. Individual panels still needed are composed
				   directly; the min-height duplicate ("Section (outer)") is dropped
				   since hero already has its own min-height ResponsiveControl above. */ }
				<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) } initialOpen={ false }>
					<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />

				</PanelBody>


				{ /* Root padding & margin — box-object interface contract (mirrors
					sgs/container). `padding` and `margin` are each
					ONE tier-of-boxes object attr {desktop,tablet,mobile}, each tier a
					{top,right,bottom,left} box; the shared wrapper reads the tiers at
					@media breakpoints. */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ attributes.padding }
						onChange={ ( obj ) => setAttributes( { padding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride
						value={ attributes.margin }
						onChange={ ( obj ) => setAttributes( { margin: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />

				{ /* Shadow — legacy string token attr (sm/md/lg/glow OR a raw box-shadow
					CSS string built by ShadowControl), resolved by sgs_shadow_value()
					(Spec 35 T2.2b). */ }
				<PanelBody title={ __( 'Shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'shadow',
							colour: 'shadowColour',
							hoverColour: 'shadowColourHover',
						} }
					/>
				</PanelBody>

				<ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />
			</InspectorControls>

			<div { ...blockProps }>
				{ indentPreviewCss && <style>{ indentPreviewCss }</style> }
				<BackgroundLayers media={ bgPreview.media } overlay={ bgPreview.overlay } />
				{ svgLayer }

				{ /* FR-22-6: content column is the InnerBlocks slot (label + heading + text + buttons).
				   Standard variant only: wrapped in the content-band preview (mirrors the
				   frontend's `.sgs-container__inner`) whenever Content band padding is set —
				   see the `showContentBand` derivation above for why split never wraps. */ }
				{ showContentBand ? (
					<div className="sgs-container__inner sgs-hero__content-band" style={ contentBandStyle }>
						<div { ...innerBlocksProps } />
					</div>
				) : (
					<div { ...innerBlocksProps } />
				) }

				{ /* The split media: the shared slot preview inside the hero's grid cell, as render.php prints it. */ }
				{ isSplit && splitShown && ( hasFile( splitShown ) || splitShown.markup ) && (
					<div className="sgs-hero__media" style={ Object.keys( mediaWrapperStyle ).length ? mediaWrapperStyle : undefined }>
						{ splitPreview.css && <style>{ splitPreview.css }</style> }
						<span className={ [ 'sgs-media', 'sgs-media--renderer', 'sgs-hero__split-media', splitPreview.className ].join( ' ' ) }>
							<SplitMediaElement shown={ splitShown } alt={ splitAlt } />
						</span>
					</div>
				) }
			</div>
		</>
	);
}
