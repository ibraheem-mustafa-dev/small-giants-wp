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
	BoxControl,
	ToggleControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveControl, ResponsiveOverride, ResponsiveBoxControl, ShadowControl, shadowAttrKeys, GradientOverlayControl, gradientOverlayAttrKeys, BOX_UNITS, normaliseResponsiveBox, SgsColourPanel, SgsBorderControl, resolveColourToken, TypographyControls, SgsBoxControl } from '../../components';
import {
	HeroSplitMediaSourceSection,
	HeroSplitMediaStylingSection,
} from '../../components/media/HeroSplitMediaPanelLayout.js';
import MediaElementPanel from '../../components/MediaElementPanel.js';
import {
	elementScopeClass,
	elementCustomProperties,
} from '../../components/media/canvasStyle.js';
import {
	resolveShadowPreview,
	colourVar,
	resolveBackgroundPaintPreviewStyle,
	textPaintPreview,
	backgroundPaintPreview,
	resolveResponsiveTier,
} from '../../utils';
// No-inline migration: hero no longer uses the default
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
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { sanitiseSvg, svgBackgroundPreview, backgroundPreview } from '../../utils';

// ── Phase 1 constant options ─────────────────────────────────────────────────
// BORDER_STYLE_OPTIONS (the local 4-option none/solid/dashed/dotted list) was removed
// 2026-08-30 -- its only consumer, the bespoke splitMedia <SelectControl>, was replaced
// by a consolidated <SgsBorderControl> mount (which owns its own style options via
// GradientCapableColourControl's BorderStyleControl); see migrate-colour-picker-to-panel.py.

// IMAGE_FIT_OPTIONS (cover/contain/fill/custom) was removed 2026-09-01 — the
// hand-rolled "Object fit" SelectControl it fed was replaced by the shared
// object-fit atom's own ObjectFitField (HeroSplitMediaStylingSection). The
// 'custom' sizing-mode sentinel is no longer a SelectControl option; it is
// now toggled via that section's dedicated "Custom sizing" ToggleControl.

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

export default function Edit( { attributes, setAttributes, name, clientId } ) {
	const {
		variant,
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
		// splitImage/splitVideo/splitSvg (legacy shapes) and their Tablet/
		// Mobile siblings, plus the hand-rolled "Split image" picker + media-
		// type SelectControl that used to read them, were removed 2026-09-01
		// (HeroSplitMediaSourceSection now owns that UI). No legacy fallback
		// is read here — Bean-locked (2026-09-02), see the resolution
		// comment below for the full reasoning.
		//
		// Wave 6 (2026-09-01) — the `source` atom's own canonical shape
		// (prefix 'split'), written by the new picker in
		// HeroSplitMediaSourceSection. Desktop tier only here, matching every
		// other canvas-preview resolution in this file; render.php resolves
		// all three tiers.
		splitImageId,
		splitImageUrl,
		splitImageAlt,
		// Decorative-image toggle (finding 18, 2026-09-02) — when true, render.php
		// blanks the alt text and sets aria-hidden on the split-media wrapper
		// regardless of media type (image/video/svg), so a screen reader skips it.
		splitMediaDecorative,
		splitVideoId,
		splitVideoUrl,
		splitSvgContent,
		splitMediaType,
		// minHeight is a TIER OBJECT {desktop,tablet,mobile} as of Spec 35 pass 3b
		// (2026-08-11) — the minHeightTablet/minHeightMobile siblings no longer exist.
		minHeight,
		shadow,
		// Phase 1 — image display.
		splitMediaObjectFit,
		splitMediaObjectPosition,
		splitMediaObjectPositionTablet,
		splitMediaObjectPositionMobile,
		splitMediaWidth,
		splitMediaWidthTablet,
		splitMediaWidthMobile,
		splitMediaWidthUnit,
		// splitMediaHeight is a TIER OBJECT {desktop,tablet,mobile} as of 2026-08-10 —
		// the splitMediaHeightTablet/splitMediaHeightMobile siblings no longer exist.
		splitMediaHeight,
		splitMediaHeightUnit,
		// Box-object families (contract §B, 2026-07-09).
		splitMediaBorderRadius,
		splitMediaBorderRadiusTablet,
		splitMediaBorderRadiusMobile,
		splitMediaBorderStyle,
		splitMediaBorderWidth,
		splitMediaBorderColour,
		splitMediaBorderColourGradient,
		// D701 — resting (non-hover) border-colour gradient. Sibling to the
		// WP-native __experimentalBorder.color support (attributes.style.border.color),
		// wins over it at render time when set. `borderColourHover`/
		// `borderColourHoverGradient` gained their own "Hover" tab in the same
		// SgsBorderControl popover on 2026-09-02 (gap 2 fix) — see this file's
		// destructure block below for those two attrs.
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
		splitMediaPadding,
		splitMediaPaddingTablet,
		splitMediaPaddingMobile,
		// C19 item 3 (2026-09-04) — box-shape atom's remaining bases, only used
		// for this ToolsPanelItem's hasValue()/onDeselect() below; the control
		// UI itself reads/writes via MediaElementPanel's own atom composition.
		splitMediaMediaSizing,
		splitMediaShape,
		splitMediaAspectRatio,
		splitMediaMinHeight,
		splitMediaMaxWidth,
		splitMediaMaxWidthUnit,
		splitMediaMaxHeight,
		splitMediaMaxHeightUnit,
		splitMediaMaxWidthPercent,
		contentBackground,
		contentBackgroundGradient,
		// contentPadding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile} (Spec 35
		// box-tier migration, 2026-08-11) — the contentPaddingTablet/Mobile sibling
		// attrs no longer exist in this block's schema.
		contentPadding,
		mediaBackground,
		mediaBackgroundGradient,
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
	// and mediaBackground/mediaBackgroundGradient canvas previews below, same
	// hook sgs/container's edit.js uses for the identical purpose.
	const [ colourPalette ] = useSettings( 'color.palette' );

	// Wave 6 — resolve the split-media SOURCE from the `source` atom's own
	// Id/Url pair ONLY (the picker in HeroSplitMediaSourceSection writes
	// there). No legacy `splitImage`/`splitVideo`/`splitSvg` fallback —
	// Bean-locked (2026-09-02): R-31-14 bans exactly the
	// `if ( empty($new) && !empty($legacy) )` shape, and this block's own
	// render.php already carries a 2026-08-13 precedent of deleting an
	// identically-shaped bridge for the same reason ("no legacy elements as
	// fallbacks; the framework is pre-production"). An already-published hero
	// instance that only has the legacy shape shows an empty split-media slot
	// until re-uploaded through the new picker — a deliberate, accepted
	// consequence of the strict reading, not an oversight. Desktop tier
	// only — matches every other preview resolution in this file.
	const resolvedSplitImage = splitImageUrl
		? { id: splitImageId || 0, url: splitImageUrl, alt: splitImageAlt || '' }
		: null;
	const resolvedSplitVideo = splitVideoUrl ? { id: splitVideoId || 0, url: splitVideoUrl } : null;
	const resolvedSplitSvg = splitSvgContent || '';

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
		bgSvgAnimation: attributes.bgSvgAnimation,
		bgSvgAnimationSpeed: attributes.bgSvgAnimationSpeed,
		bgSvgOpacity: attributes.bgSvgOpacity,
		bgSvgMinHeight: attributes.bgSvgMinHeight,
		bgSvgTextShadow: attributes.bgSvgTextShadow,
	} );

	// Background media (backgroundRepeat/backgroundAttachment) — editor mirror,
	// CHECK A findings 2026-09-05. Narrower than container's own backgroundPreview()
	// call on purpose: hero already renders its OWN hand-built overlay <span>
	// further down (mirrors render.php's overlay markup exactly) and its OWN
	// split-media ken-burns/parallax (mediaKenBurns/mediaParallax — a SEPARATE
	// attribute family scoped to the foreground media column, see
	// mediaWrapperStyle above). Passing backgroundOverlayColour/overlayGradient/
	// bgKenBurns/bgParallax into backgroundPreview() here would mount a SECOND,
	// overlapping preview mechanism (its own `::after` overlay / ken-burns
	// custom-property layer) for effects this file already previews by hand —
	// two overlapping previews for one setting is unfalsifiable (prove-the-
	// cause-before-fix), so only the fields hero previews NOWHERE else
	// (backgroundImage/backgroundSize/backgroundPosition/backgroundRepeat/
	// backgroundAttachment/bgVideo) are passed. `[]` stands in for the colour
	// palette — none of those fields resolve a colour token, so a real palette
	// is not needed here (verified: resolveColourToken() short-circuits on an
	// empty/undefined value before ever touching the palette argument).
	//
	// ⚠ Gated to the SPLIT variant only, deliberately — a verified frontend fact,
	// not a style choice. render.php NULLS `backgroundImage` before it ever
	// reaches SGS_Container_Wrapper for the STANDARD variant (render.php
	// ~:1549-1562: standard paints its own private LCP <img> instead), so
	// backgroundRepeat/backgroundAttachment have ZERO effect on a standard hero
	// — an <img> has no tiling or fixed-attachment concept. Only the split
	// variant hands backgroundImage through to the wrapper's CSS `::before`
	// layer (class-sgs-container-wrapper.php ~:1232/:1240), which is the ONLY
	// place these two properties actually paint. Applying this preview
	// unconditionally would make the canvas show a repeating/fixed background
	// on a standard hero that the frontend never renders — the exact class of
	// mismatch CHECK A exists to close, just inverted.
	const bgMediaPreview = backgroundPreview( {
		backgroundImage: attributes.backgroundImage,
		bgVideo: attributes.bgVideo,
		backgroundSize: attributes.backgroundSize,
		backgroundPosition: attributes.backgroundPosition,
		backgroundRepeat: attributes.backgroundRepeat,
		backgroundAttachment: attributes.backgroundAttachment,
	}, [] );

	const wrapperStyle = {
		...svgPreview.style,
		...( isSplit ? bgMediaPreview.style : {} ),
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
	if ( textAlign?.desktop ) {
		contentPreviewStyle.textAlign = textAlign.desktop;
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

	// Root border preview — previously entirely absent from the canvas (only
	// wired into SgsBorderControl's InspectorControls binding, never applied
	// to wrapperStyle, unlike splitMedia's own border a few lines below which
	// DOES preview). Same box-object family, base only, no tiers. Mirrors
	// splitMedia's raw colour pass-through (no token resolution) rather than
	// introducing a different mechanism into this file.
	const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( borderStyle && 'none' !== borderStyle ) {
		wrapperStyle.borderStyle = borderStyle;
		if ( borderWidthPreview ) {
			wrapperStyle.borderWidth = borderWidthPreview;
		}
		if ( borderColour ) {
			wrapperStyle.borderColor = borderColour;
		}
		// A gradient border renders frontend as a masked ::before ring, which cannot
		// be reproduced in a plain inline style — approximate it with the gradient as
		// a border-image so the canvas at least shows that a gradient is applied.
		if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
			wrapperStyle.borderImage = `${ borderColourGradient } 1`;
		}
	}

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
	// this file (splitMediaWidthTablet/splitMediaWidthMobile stay editor-only-inert
	// here, same as the other *Tablet/*Mobile pairs above).
	const imagePreviewStyle = {
		// Wave 6 — object-fit + focal-point (+ tablet/mobile) now come from
		// the shared atom's own custom-property VALUES (prefix 'splitMedia'),
		// consumed by the shared `.sgs-media-el` stylesheet via the
		// `sgs-media-el` marker class applied below — the same mechanism
		// `sgs/media`'s own edit.js canvas uses. This REPLACES the old direct
		// `imagePreviewStyle.objectFit = splitMediaObjectFit || 'cover'`
		// assignment; the atom's own CSS (`object-fit.css`) already falls
		// back to 'cover' via `var(--sgs-media-object-fit, cover)`, so an
		// unset value renders identically. Gated off entirely while
		// `splitMediaObjectFit === 'custom'` — see `object-fit.js`'s own
		// `validate()`, which rejects 'custom' to '' and therefore emits no
		// custom property, leaving the explicit width/height below in sole
		// control, matching render.php's gate.
		...elementCustomProperties( {
			attributes,
			prefix: 'splitMedia',
			blockSlug: 'sgs/hero',
			atoms: [ 'object-fit', 'focal-point' ],
		} ),
	};
	// width — render.php:597-599, gated behind splitMediaObjectFit==='custom'.
	// splitMediaWidth itself has no dedicated ticket item here, but splitMediaWidthUnit
	// is meaningless without it (same CSS declaration), so both are applied
	// together, desktop tier only.
	if ( 'custom' === splitMediaObjectFit && splitMediaWidth ) {
		imagePreviewStyle.width = `${ splitMediaWidth }${ splitMediaWidthUnit || '%' }`;
	}
	// height — render.php:618-619, deliberately UNGATED (not tied to
	// splitMediaObjectFit==='custom' — see render.php's "UNGATED reach" comment
	// at line 609-615).
	if ( splitMediaHeight?.desktop ) {
		imagePreviewStyle.height = `${ splitMediaHeight.desktop }${ splitMediaHeightUnit || 'px' }`;
	}
	// border style/width/colour — render.php:561-573 (box-object family,
	// base only, no tiers). Entry condition matches render.php exactly:
	// emit when style isn't 'none' OR a width is set.
	const splitMediaBorderWidthPreview = boxShorthand( splitMediaBorderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( 'none' !== splitMediaBorderStyle || splitMediaBorderWidthPreview ) {
		imagePreviewStyle.borderStyle = splitMediaBorderStyle;
		if ( splitMediaBorderWidthPreview ) {
			imagePreviewStyle.borderWidth = splitMediaBorderWidthPreview;
		}
		if ( splitMediaBorderColour ) {
			imagePreviewStyle.borderColor = splitMediaBorderColour;
		}
	}

	// Media-wrapper (`.sgs-hero__media`) class + style preview — mirrors
	// render.php's `--ken-burns` modifier class + the ken-burns duration
	// custom property. mediaKenBurns
	// is mutually exclusive with mediaParallax, matching render.php:686's
	// `$media_ken_burns = ! empty( $attributes['mediaKenBurns'] ) && ! $media_parallax;`
	const mediaKenBurnsActive = !! mediaKenBurns && ! mediaParallax;
	// Wave 6 — the overlay atom (prefix 'media', attachesTo: 'box') paints via
	// `.sgs-media-box::after`, so `.sgs-hero__media` (the wrapper this atom's
	// "box" IS) carries the universal `sgs-media-box` marker + this element's
	// own scope class. This is what lets the SAME shared `overlay.css` the
	// other adopting blocks use paint here too — no hero-specific overlay CSS.
	const mediaBoxScopeClass = elementScopeClass( clientId, 'media' );
	const mediaWrapperClassName = [
		'sgs-hero__media',
		'sgs-media-box',
		mediaBoxScopeClass,
		mediaKenBurnsActive ? 'sgs-hero__media--ken-burns' : null,
	]
		.filter( Boolean )
		.join( ' ' );
	const mediaWrapperStyle = {
		// Wave 6 — overlay colour/gradient/opacity/blend-mode + hover pair,
		// consumed by the shared `.sgs-media-box::after` rule via the marker
		// class above. Replaces the old hand-rolled `$media_overlay_html`
		// span's frontend-only preview gap — the canvas previously showed NO
		// overlay preview at all; it now matches the frontend exactly.
		...elementCustomProperties( {
			attributes,
			prefix: 'media',
			blockSlug: 'sgs/hero',
			atoms: [ 'overlay' ],
		} ),
		// CHECK A (2026-09-05) — mediaBackground/mediaBackgroundGradient paint
		// `.sgs-hero__media` (render.php:819-826), and this style object is
		// ONLY ever applied to the JSX node rendered when isSplit (the media
		// wrapper markup itself is entirely inside render.php's `if ($is_split)`
		// branch — the wrapper does not exist for the standard variant), so no
		// extra isSplit gate is needed here.
		...backgroundPaintPreview( mediaBackground, mediaBackgroundGradient, colourPalette ),
	};
	// mediaPadding/mediaPaddingTablet/mediaPaddingMobile — outer padding on
	// `.sgs-hero__media` (render.php:799-810, sgs_box_object_shorthand()).
	// Desktop tier only, matching every other box preview in this file
	// (borderWidthPreview, bandPaddingPreview, splitMediaBorderWidthPreview
	// above all resolve the desktop/base tier only).
	const mediaPaddingPreview = boxShorthand( mediaPadding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( mediaPaddingPreview ) {
		mediaWrapperStyle.padding = mediaPaddingPreview;
	}
	if ( isMediaFirstDesktop ) {
		mediaWrapperStyle.order = 1;
	}
	if ( mediaKenBurnsActive ) {
		mediaWrapperStyle[ '--sgs-hero-media-ken-burns-duration' ] = `${ mediaAnimationDuration }s`;
	}
	// Wave 6 — object-fit + focal-point (prefix 'splitMedia', attachesTo:
	// 'element') target `.sgs-media-el` directly, so this element carries the
	// universal marker + its own scope class. Motion is DELIBERATELY NOT
	// routed through this marker — see the "judgement calls" section of this
	// migration's task report: hero's existing ken-burns/parallax CSS
	// (style.css, ~line 495 onward) has a subtle clipping interaction with
	// its own hover-zoom rule (a compound-selector specificity fight) that
	// this migration did not risk reproducing under the shared `.sgs-media-el`
	// mechanism without a live canary to verify against. The motion atom's
	// EDITOR CONTROL is still fully adopted (HeroSplitMediaSourceSection) and
	// writes to the SAME mediaParallax/mediaKenBurns/mediaAnimationDuration
	// attributes hero's own render.php already reads — only the CSS
	// consumption mechanism stays hero-private.
	const splitMediaScopeClass = elementScopeClass( clientId, 'splitMedia' );
	const splitImageClassName = [
		'sgs-hero__split-image',
		'sgs-media-el',
		splitMediaScopeClass,
	]
		.filter( Boolean )
		.join( ' ' );

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
	// and render.php has always emitted it (see its own comment at :914-933,
	// which records the same defect being found on the live Mama's homepage).
	// The gradient case needs only the inline paint — same property, so it does
	// override — but the COLOUR case needs both.
	const hasBackgroundPaint =
		!! backgroundColour ||
		!! backgroundColourGradient ||
		!! backgroundOverlayColour ||
		!! overlayGradient;

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
	// bgMediaPreview.className is the OPPOSITE shape — backgroundPreview()
	// returns className as a single STRING (e.g. "sgs-ed-has-bg-media"), not an
	// array, so it is wrapped in `[ ... ]` (one element) rather than spread with
	// `...` — spreading a string here would explode it into one array entry per
	// CHARACTER. Only merged when `isSplit`, matching the same gate the style
	// spread above uses (see bgMediaPreview's own comment for why).
	const className = [
		'sgs-hero',
		`sgs-hero--${ variant }`,
		`sgs-hero--align-${ alignment }`,
		hasBackgroundPaint ? 'has-background' : null,
		...svgPreview.className,
		...( isSplit ? [ bgMediaPreview.className ] : [] ),
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
						{ /* Wave 6 (2026-09-01) — media-type + source + overlay + motion now
						     route through the shared media-atom system (media-type/source
						     atoms, prefix 'split'; overlay/motion atoms, prefix 'media' —
						     see HeroSplitMediaPanelLayout.js for why three different prefixes
						     are correct here, not an inconsistency). This REPLACES the
						     hand-rolled "Split image" MediaPicker, the splitImage?.url-gated
						     media-type SelectControl (closing that gating bug — the type tabs
						     are now always reachable), the per-type video/SVG MediaUpload/
						     TextareaControl combo, the hand-rolled GradientOverlayControl
						     media-overlay span, and the hand-rolled Ken-burns/parallax
						     ToggleControl pair + RangeControl. */ }
						<HeroSplitMediaSourceSection
							attributes={ attributes }
							setAttributes={ setAttributes }
						/>
						{ /* Decorative-image toggle (finding 18, 2026-09-02, WCAG 2.1 AA 1.1.1).
						     Only the split-media element gets this — it is the only real
						     <img>/<video>/svg the block renders; backgroundImage paints via CSS
						     background-image and is never exposed to assistive tech, so it needs
						     no toggle. The alt-text field itself lives inside
						     HeroSplitMediaSourceSection (HeroSplitMediaPanelLayout.js), a shared
						     component this task does not touch — render.php is the single source
						     of truth and blanks alt / sets aria-hidden whenever this is on,
						     regardless of what the alt field still shows in the editor. */ }
						<ToggleControl
							label={ __( 'Split image is decorative', 'sgs-blocks' ) }
							checked={ !! splitMediaDecorative }
							onChange={ ( val ) =>
								setAttributes( { splitMediaDecorative: val } )
							}
							help={ __(
								'Turn on when this image/video is decoration rather than information — screen readers will skip it instead of reading the alt text.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					{ /* Gap 2 (2026-09-02) — colourValue/onColourChange (single-state
					   form) replaced with colourStates (multi-state Normal/Hover
					   form) so borderColourHover/borderColourHoverGradient (declared,
					   read by render.php:221-223, previously no editor control) gain
					   a "Hover" tab in the same popover — mirrors sgs/container's and
					   sgs/quote's identically-shaped colourStates wiring. */ }
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

				{ /* ── Hover (gap 2, 2026-09-02) — transitionDuration/
				   transitionEasing are declared and consumed by
				   sgs_transition_vars() (render.php) but had no editor control.
				   Mirrors sgs/quote's identically-shaped "Hover" panel controls
				   (edit.js:849-870) — scale/shadow-on-hover controls are NOT
				   added here, hero declares no scaleHover/boxShadowHover attrs,
				   only the transition pair is in scope for this fix. */ }
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
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						showLetterSpacing
						showTransform
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
								attrNames={ gradientOverlayAttrKeys( 'contentBackground', { solid: 'contentBackground' } ) }
								solidLabel={ __( 'Content background colour', 'sgs-blocks' ) }
							/>
							{ /* contentPadding is a TIER-OF-BOXES OBJECT {desktop,tablet,mobile}
							     (Spec 35 box-tier migration) — ONE attr; each tier holds the
							     4-side box, unchanged in shape from the old sibling attrs. */ }
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
					</ToolsPanel>
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
					<ToolsPanel
						label={ __( 'Split image styling', 'sgs-blocks' ) }
						resetAll={ () =>
							setAttributes( {
								splitMediaObjectFit: 'cover',
								splitMediaObjectPosition: 'center center',
								splitMediaObjectPositionTablet: '',
								splitMediaObjectPositionMobile: 'center 20%',
								splitMediaWidth: undefined,
								splitMediaWidthTablet: undefined,
								splitMediaWidthMobile: undefined,
								splitMediaWidthUnit: '%',
								splitMediaHeight: {},
								splitMediaHeightUnit: 'px',
								splitMediaMediaSizing: undefined,
								splitMediaShape: 'none',
								splitMediaAspectRatio: '',
								splitMediaMinHeight: {},
								splitMediaMaxWidth: {},
								splitMediaMaxWidthUnit: 'px',
								splitMediaMaxHeight: {},
								splitMediaMaxHeightUnit: 'px',
								splitMediaMaxWidthPercent: undefined,
								splitMediaBorderRadius: {},
								splitMediaBorderRadiusTablet: {},
								splitMediaBorderRadiusMobile: {},
								splitMediaBorderStyle: 'none',
								splitMediaBorderWidth: {},
								splitMediaBorderColour: '',
								splitMediaBorderColourGradient: '',
								splitMediaPadding: {},
								splitMediaPaddingTablet: {},
								splitMediaPaddingMobile: {},
								mediaBackground: '',
								mediaBackgroundGradient: '',
								mediaPadding: {},
								mediaPaddingTablet: {},
								mediaPaddingMobile: {},
							} )
						}
					>
						{ /* The "Split image height" control was REMOVED 2026-08-10. It wrote
							     the splitImageHeight/…Tablet/splitImageMobileHeight trio, which set
							     `height` on `.sgs-hero__split-image` — the SAME property on the SAME
							     element as the "Height" control further down this panel. Two controls
							     for one setting is the duplicate-control class this framework bans, and
							     at equal CSS specificity the later-emitted rule won, so this one was
							     already the loser whenever both were set. The surviving control is the
							     Height control below, which carries a unit picker instead of hardcoding
							     px. Its render is now UNGATED so it keeps this control's reach. */ }
							{ /* Wave 6 (2026-09-01) — object-fit + focal-point now route
							     through the shared media-atom system (prefix 'splitMedia',
							     reproducing splitMediaObjectFit/splitMediaObjectPosition*
							     exactly — see HeroSplitMediaPanelLayout.js). This REPLACES the
							     hand-rolled "Object fit" SelectControl and the
							     ResponsiveControl+FocalPositionField "Object position" combo.
							     The "Custom sizing" toggle inside the new section is a
							     hero-specific bridge into the `custom` sizing-mode sentinel
							     (object-fit's own vocabulary never includes it) — see that
							     component's own docblock. */ }
						<ToolsPanelItem
							label={ __( 'Split media styling', 'sgs-blocks' ) }
							hasValue={ () =>
								splitMediaObjectFit !== 'cover' ||
								splitMediaObjectPosition !== 'center center' ||
								splitMediaObjectPositionTablet !== '' ||
								splitMediaObjectPositionMobile !== 'center 20%' ||
								splitMediaWidth ||
								splitMediaWidthTablet ||
								splitMediaWidthMobile ||
								splitMediaWidthUnit !== '%' ||
								Object.keys( splitMediaHeight ?? {} ).length > 0 ||
								splitMediaHeightUnit !== 'px'
							}
							onDeselect={ () =>
								setAttributes( {
									splitMediaObjectFit: 'cover',
									splitMediaObjectPosition: 'center center',
									splitMediaObjectPositionTablet: '',
									splitMediaObjectPositionMobile: 'center 20%',
									splitMediaWidth: undefined,
									splitMediaWidthTablet: undefined,
									splitMediaWidthMobile: undefined,
									splitMediaWidthUnit: '%',
									splitMediaHeight: {},
									splitMediaHeightUnit: 'px',
								} )
							}
							isShownByDefault
						>
							<HeroSplitMediaStylingSection
								attributes={ attributes }
								setAttributes={ setAttributes }
							/>
						</ToolsPanelItem>

						{ /* C19 item 3 (2026-09-04) — replaces the old bespoke "Custom
						     dimensions" width/height sub-section above plus the separate
						     "Border" and "Inner padding" ToolsPanelItems below with ONE
						     mount of the shared box-shape + media-padding atoms, giving
						     hero the same shape -> fit -> position chain as sgs/media
						     (MediaBoxShapeControls: sizing mode / named shape / height /
						     ratio / min-height / width / max-width / max-height /
						     max-width-percent / border, plus a padding row). Prefix
						     'splitMedia' resolves to hero's EXISTING splitMediaWidth/
						     Height/BorderRadius/BorderWidth/BorderStyle/BorderColour/
						     Padding attrs (mediaStoredAttrName has no STORED_AS entry for
						     sgs/hero, so the canonical splitMedia+Base naming already
						     matches — zero renames) plus the NEW splitMediaMediaSizing/
						     Shape/AspectRatio/MinHeight/MaxWidth/MaxHeight/
						     MaxWidthPercent attrs hand-declared in block.json. The
						     'custom' sizing-mode sentinel written by the "Custom sizing"
						     toggle above (HeroSplitMediaStylingSection) still works
						     unchanged: box-shape's own resolveSizingMode() resolves an
						     unset MediaSizing + objectFit==='custom' to mode 'height'. */ }
						<ToolsPanelItem
							label={ __( 'Split media box & border', 'sgs-blocks' ) }
							hasValue={ () =>
								!! splitMediaMediaSizing ||
								splitMediaShape !== 'none' ||
								!! splitMediaAspectRatio ||
								!! splitMediaWidth ||
								!! splitMediaWidthTablet ||
								!! splitMediaWidthMobile ||
								splitMediaWidthUnit !== '%' ||
								Object.keys( splitMediaHeight ?? {} ).length > 0 ||
								splitMediaHeightUnit !== 'px' ||
								Object.keys( splitMediaMinHeight ?? {} ).length > 0 ||
								Object.keys( splitMediaMaxWidth ?? {} ).length > 0 ||
								splitMediaMaxWidthUnit !== 'px' ||
								Object.keys( splitMediaMaxHeight ?? {} ).length > 0 ||
								splitMediaMaxHeightUnit !== 'px' ||
								!! splitMediaMaxWidthPercent ||
								Object.keys( splitMediaBorderWidth ?? {} ).length > 0 ||
								splitMediaBorderStyle !== 'none' ||
								splitMediaBorderColour !== '' ||
								splitMediaBorderColourGradient !== '' ||
								Object.keys( splitMediaBorderRadius ?? {} ).length > 0 ||
								Object.keys( splitMediaBorderRadiusTablet ?? {} ).length > 0 ||
								Object.keys( splitMediaBorderRadiusMobile ?? {} ).length > 0 ||
								Object.keys( splitMediaPadding ?? {} ).length > 0 ||
								Object.keys( splitMediaPaddingTablet ?? {} ).length > 0 ||
								Object.keys( splitMediaPaddingMobile ?? {} ).length > 0
							}
							onDeselect={ () =>
								setAttributes( {
									splitMediaMediaSizing: undefined,
									splitMediaShape: 'none',
									splitMediaAspectRatio: '',
									splitMediaWidth: undefined,
									splitMediaWidthTablet: undefined,
									splitMediaWidthMobile: undefined,
									splitMediaWidthUnit: '%',
									splitMediaHeight: {},
									splitMediaHeightUnit: 'px',
									splitMediaMinHeight: {},
									splitMediaMaxWidth: {},
									splitMediaMaxWidthUnit: 'px',
									splitMediaMaxHeight: {},
									splitMediaMaxHeightUnit: 'px',
									splitMediaMaxWidthPercent: undefined,
									splitMediaBorderRadius: {},
									splitMediaBorderRadiusTablet: {},
									splitMediaBorderRadiusMobile: {},
									splitMediaBorderStyle: 'none',
									splitMediaBorderWidth: {},
									splitMediaBorderColour: '',
									splitMediaBorderColourGradient: '',
									splitMediaPadding: {},
									splitMediaPaddingTablet: {},
									splitMediaPaddingMobile: {},
								} )
							}
							isShownByDefault
						>
							<MediaElementPanel
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="splitMedia"
								blockSlug="sgs/hero"
								insertion="element"
								atoms={ [ 'box-shape', 'media-padding' ] }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Background', 'sgs-blocks' ) }
							hasValue={ () => !! mediaBackground || !! mediaBackgroundGradient }
							onDeselect={ () =>
								setAttributes( {
									mediaBackground: '',
									mediaBackgroundGradient: '',
								} )
							}
						>
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Background', 'sgs-blocks' ) }</p>
							<GradientOverlayControl
								attributes={ attributes }
								setAttributes={ setAttributes }
								attrNames={ gradientOverlayAttrKeys( 'mediaBackground', { solid: 'mediaBackground' } ) }
								solidLabel={ __( 'Media background colour', 'sgs-blocks' ) }
							/>
						</ToolsPanelItem>

						<ToolsPanelItem
							label={ __( 'Outer padding', 'sgs-blocks' ) }
							hasValue={ () =>
								Object.keys( mediaPadding ?? {} ).length > 0 ||
								Object.keys( mediaPaddingTablet ?? {} ).length > 0 ||
								Object.keys( mediaPaddingMobile ?? {} ).length > 0
							}
							onDeselect={ () =>
								setAttributes( {
									mediaPadding: {},
									mediaPaddingTablet: {},
									mediaPaddingMobile: {},
								} )
							}
						>
							<p style={ { fontWeight: 600, margin: '16px 0 4px' } }>{ __( 'Outer padding (around the whole media wrapper)', 'sgs-blocks' ) }</p>
							<p style={ { fontSize: '12px', color: '#757575', margin: '0 0 8px' } }>{ __( 'Affects the gap between the wrapper and the surrounding section.', 'sgs-blocks' ) }</p>
							<ResponsiveBoxControl
								label={ __( 'Media padding', 'sgs-blocks' ) }
								presets
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
						</ToolsPanelItem>
					</ToolsPanel>
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
				{ svgLayer }
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
					// rebuild from.
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
					( resolvedSplitImage?.url ||
						resolvedSplitVideo?.url ||
						resolvedSplitSvg ) && (
						<div
							className={ mediaWrapperClassName }
							style={
								Object.keys( mediaWrapperStyle ).length
									? mediaWrapperStyle
									: undefined
							}
						>
							{ splitMediaType === 'video' && resolvedSplitVideo?.url && (
								<video
									src={ resolvedSplitVideo.url }
									className={ splitImageClassName }
									style={ imagePreviewStyle }
									autoPlay
									muted
									loop
									playsInline
								/>
							) }
							{ splitMediaType === 'svg' && resolvedSplitSvg && (
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
										__html: sanitiseSvg( resolvedSplitSvg ),
									} }
								/>
							) }
							{ splitMediaType !== 'video' &&
								splitMediaType !== 'svg' &&
								resolvedSplitImage?.url && (
									<img
										src={ resolvedSplitImage.url }
										alt={ resolvedSplitImage.alt || '' }
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
