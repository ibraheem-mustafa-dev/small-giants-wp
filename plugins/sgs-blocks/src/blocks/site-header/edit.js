import { __, sprintf } from '@wordpress/i18n';
import { useEffect, useRef, useState } from 'react';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
	useSettings,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	PanelBody,
	SelectControl,
	Notice,
	Button,
	BoxControl,
} from '@wordpress/components';
// sgs/site-header does not use <ContainerWrapperControls>'s
// ResponsiveSpacingPanel: padding and margin are box OBJECT attrs read by
// class-sgs-container-wrapper.php, so this block's own "Padding & margin"
// panel below uses ResponsiveBoxControl bound to those object attrs (as
// sgs/container's and sgs/cta-section's own edit.js do).
import {
	WidthPanel,
	BackgroundPanel,
	MIN_HEIGHT_OPTIONS,
} from '../container/components/ContainerWrapperControls';
import { ResponsiveTriStateControl, ResponsiveBoxControl, ResponsiveOverride, SgsColourPanel, BOX_UNITS, normaliseResponsiveBox, SgsBorderControl, ShadowControl, resolveColourToken, SgsBoxControl, StarterLookPresetControl } from '../../components';
import { NumberControl, ToggleGroupControl, ToggleGroupControlOption, ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import { resolveTier } from '../../utils/responsive';
import { backgroundPaintPreview, backgroundPreview, spacingPreview, isTierBoxEmpty, svgBackgroundPreview, textPaintPreview } from '../../utils';
import { calculateRelativeLuminance, calculateContrastRatio, meetsWCAG_AA } from '../../utils/wcag-contrast';
// Floating ("pill") mode — controls, canvas preview and reset live in their own
// file; this module only mounts them. See FloatControls.js.
import FloatControls from './components/FloatControls';
import { floatPreview, floatResetAttributes } from './float-preview';

/**
 * Does a tri-state {desktop,tablet,mobile} behaviour object resolve 'on' at
 * ANY tier? Mirrors render.php's `sgs_resolve_on_tiers( $raw, 'on', 'off' )`
 * on the JS side, via the same shared `resolveTier()` cascade
 * (ResponsiveTriStateControl and the PHP resolver both already depend on the
 * identical inherit semantics — this just asks the question across all three
 * tiers instead of one).
 *
 * @param {Object} raw Tri-state value, e.g. `attributes.headerSticky`.
 * @return {boolean}
 */
function isOnAtAnyTier( raw ) {
	return [ 'desktop', 'tablet', 'mobile' ].some(
		( tier ) => resolveTier( raw, tier, 'off' ).value === 'on'
	);
}

// FR-37-28 — Layout preset (Centred / Split / Minimal). A preset is a
// convenience action that WRITES the block's EXISTING layout attributes
// (contentWidth + the block's own padding attr) to a documented
// value set — it is never a new stored shape. No preset-name attribute is
// stored; the active preset (if any) is DERIVED from the current attribute
// values each render, so a hand-edited combination correctly shows no
// preset selected rather than lying about which preset produced it.
//
// Attrs available on sgs/site-header itself only (no row or navigation attrs —
// those live on sgs/site-header-row and are out of this block's scope):
//   contentWidth — 'normal' | 'wide' | 'full' | literal (content-band cap)
//   padding — block-owned box object (top/right/bottom/left per tier)
//
// Each preset ALSO re-aligns the primary (middle) row. The header's
// horizontal logo/nav alignment lives on the middle row's justifyContent,
// NOT on the container — so a preset that only set container width/padding
// couldn't actually re-align (the FR-37-28 depth gap). The Edit component
// looks up the middle row (rowSlot:'middle') and the preset writes its
// justifyContent (see PRESET_JUSTIFY) alongside the container attrs.
//
// Centred — content band capped to 'normal' (~1200px), default padding,
//   middle row centred (justifyContent:'center') so the logo/nav cluster
//   sits as a centred group.
// Split   — content band uncapped ('full', the block default), middle row
//   spread edge-to-edge (justifyContent:'space-between'): logo left,
//   nav/icons right. This is the fresh-insert default.
// Minimal — content band capped to 'normal', padding reduced to a slimmer
//   bar height, middle row still edge-to-edge — a stripped-back header.
const MINIMAL_PADDING = { top: '8px', right: '16px', bottom: '8px', left: '16px' };

// Middle-row justifyContent each preset writes (the alignment half of the
// preset). '' would render flex-start; these are the three deliberate looks.
const PRESET_JUSTIFY = {
	centred: 'center',
	split: 'space-between',
	minimal: 'space-between',
};

// `padding` is a tier-of-boxes attr { desktop, tablet, mobile }: a preset owns
// the desktop box, so it matches only when tablet and mobile are empty too.
function paddingMatches( padding, target ) {
	if ( ! padding?.desktop ) {
		return false;
	}
	return (
		isTierBoxEmpty( { tablet: padding.tablet, mobile: padding.mobile } ) &&
		[ 'top', 'right', 'bottom', 'left' ].every(
			( side ) => padding.desktop[ side ] === target[ side ]
		)
	);
}

/**
 * Derive which layout preset (if any) the CURRENT attribute values match.
 * Returns '' when the combination doesn't match a known preset exactly
 * (a hand-tuned/custom combination) — no preset button shows selected.
 *
 * A preset only shows selected when BOTH the container attrs AND the middle
 * row's alignment match it — so a hand-tuned combination (e.g. the right band
 * width but a manually re-aligned row) correctly shows no preset selected.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} rowJustify The middle row's justifyContent ('' if no middle row).
 * @return {string} 'centred' | 'split' | 'minimal' | ''
 */
function getActiveLayoutPreset( attributes, rowJustify = '' ) {
	const { padding } = attributes;
	// `contentWidth` is a tier object ({ desktop, tablet, mobile }); a preset owns
	// the desktop tier.
	const contentWidth = attributes.contentWidth?.desktop ?? 'full';

	// ⚠ EMPTINESS, not falsiness. `padding` is a block-OWNED tier-of-boxes attr
	// whose declared default is `{ desktop: {} }`, which is truthy and has a key,
	// so a `! padding` or key-count test would make Split and Centred
	// undetectable and the preset toggle would permanently show nothing
	// selected — a silent break with no error and a green build.
	const noPadding = isTierBoxEmpty( padding );

	if ( contentWidth === 'full' && noPadding && rowJustify === 'space-between' ) {
		return 'split';
	}
	if ( contentWidth === 'normal' ) {
		if (
			paddingMatches( padding, MINIMAL_PADDING ) &&
			rowJustify === 'space-between'
		) {
			return 'minimal';
		}
		if ( noPadding && rowJustify === 'center' ) {
			return 'centred';
		}
	}
	return '';
}

/**
 * Apply a layout preset by writing to existing attributes only: the
 * container's contentWidth + style.spacing.padding, AND the middle row's
 * justifyContent (the alignment half — see PRESET_JUSTIFY). Never a new
 * stored shape.
 *
 * @param {string}   value                 'centred' | 'split' | 'minimal'
 * @param {Object}   attributes            Current block attributes.
 * @param {Function} setAttributes         Block editor setAttributes.
 * @param {string}   [middleRowClientId]   clientId of the rowSlot:'middle' row, if any.
 * @param {Function} [updateBlockAttributes] core/block-editor updateBlockAttributes dispatch.
 */
function applyLayoutPreset(
	value,
	attributes,
	setAttributes,
	middleRowClientId,
	updateBlockAttributes
) {
	// `padding` and `margin` are separate top-level attrs, so a preset writes its
	// own attr and cannot touch the other.
	if ( value === 'split' ) {
		// Split has no padding override — clear one if present so the
		// preset detector reads back 'split' cleanly.
		setAttributes( { contentWidth: { ...attributes.contentWidth, desktop: 'full' }, padding: {} } );
	} else if ( value === 'centred' ) {
		setAttributes( { contentWidth: { ...attributes.contentWidth, desktop: 'normal' }, padding: {} } );
	} else if ( value === 'minimal' ) {
		setAttributes( { contentWidth: { ...attributes.contentWidth, desktop: 'normal' }, padding: { desktop: MINIMAL_PADDING } } );
	} else {
		return;
	}

	// Re-align the primary (middle) row to match the preset. This is what
	// makes Centred actually centre the logo/nav cluster (and Split/Minimal
	// spread it edge-to-edge) rather than only changing the band width.
	// No-op if the header has no middle row.
	if ( middleRowClientId && updateBlockAttributes ) {
		updateBlockAttributes( middleRowClientId, {
			justifyContent: PRESET_JUSTIFY[ value ],
		} );
	}
}

const CONTRAST_SAFE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Scrim overlay', 'sgs-blocks' ), value: 'scrim' },
	{
		label: __( 'Text shadow (not WCAG-safe)', 'sgs-blocks' ),
		value: 'shadow',
	},
	{ label: __( 'Force solid', 'sgs-blocks' ), value: 'force-solid' },
];

// Human labels for the three device tiers, used by the contrast advisory below
// so it can name exactly which tiers carry the risk rather than warning once
// for the whole block. 'Phone' (not 'Mobile') matches the wording the global
// device toggle already shows the client.
const TIER_LABELS = {
	desktop: __( 'Desktop', 'sgs-blocks' ),
	tablet: __( 'Tablet', 'sgs-blocks' ),
	mobile: __( 'Phone', 'sgs-blocks' ),
};

// value -> label, derived from the options table above so the two can never
// drift apart.
const CONTRAST_SAFE_LABELS = CONTRAST_SAFE_OPTIONS.reduce(
	( acc, opt ) => ( { ...acc, [ opt.value ]: opt.label } ),
	{}
);

// `templateMode` (grid-section/card-grid presets) does not apply here —
// this block restricts children to exactly `sgs/site-header-row` below, a
// more specific structural rule that a generic preset would only conflict
// with.
const ALLOWED_BLOCKS = [ 'sgs/site-header-row' ];

// calculateRelativeLuminance / calculateContrastRatio / meetsWCAG_AA moved to
// the shared `../../utils/wcag-contrast` module (imported above) — this was
// a byte-identical duplicate of site-footer/edit.js's copy.

// Three fixed rows. The middle row is pre-filled to match the current site
// header (logo + navigation + cart) so content parity holds on first insert.
// The mobile burger + drawer are owned entirely by sgs/nav-bar-menu + sgs/nav-drawer
// (FR-37-21) — no separate toggle
// block. Top and bottom rows start empty and emit zero output until an
// operator adds elements (Spec 37 §3.4 empty-row-zero-output, verified FR-37-9).
const TEMPLATE = [
	[ 'sgs/site-header-row', { rowSlot: 'top' } ],
	[
		'sgs/site-header-row',
		{ rowSlot: 'middle', justifyContent: 'space-between' },
		[
			// Logo (left). SGS per-breakpoint logo block (falls back to the site
			// custom_logo when no per-breakpoint images set). Draft: logo | nav | icons.
			[ 'sgs/responsive-logo', { width: 180, linkToHome: true } ],
			// Primary nav (centre on desktop; hidden <768 → lives in the drawer).
			// An SGS navigation block, not core/navigation, so a fresh insert
			// doesn't re-arm the WooCommerce mini-cart/customer-account
			// auto-injection that WC hooks onto core/navigation via Block Hooks
			// (FR-37-21).
			[
				'sgs/nav-bar-menu',
				{
					itemColour: 'text',
					gap: '28px',
				},
			],
			// Icons cluster (right): cart. Grouped so the row has exactly 3 flex
			// children → logo-left / nav-centre / icons-right. (The burger is not
			// listed here: the navigation block renders its own toggle and opens
			// sgs/nav-drawer, so there is no separate toggle block.)
			//
			// sgs/container, NOT core/group: the DB (`blocks.replaces`) records
			// sgs/container as the replacement for core/group|core/columns|core/column,
			// and a replaced core block must never be used. Flat `layout`/`flexWrap`
			// strings are sgs/container's own attrs — NOT core/group's nested
			// `layout:{type,flexWrap}` object, which sgs/container does not read.
			[
				'sgs/container',
				{
					className: 'sgs-header-icons',
					layout: 'flex',
					flexWrap: 'nowrap',
				},
				[
					[ 'sgs/cart', {} ],
				],
			],
		],
	],
	[ 'sgs/site-header-row', { rowSlot: 'bottom' } ],
];

export default function Edit( { attributes, setAttributes, clientId, name } ) {
	// BackgroundPanel (mounted below) writes image/video/overlay/ken-burns/
	// parallax attrs; the shared mirror (src/utils/background-preview.js)
	// previews them on the canvas the same way sgs/container does.
	const [ colourPalette ] = useSettings( 'color.palette' );

	// SGS-owned flat background colour/gradient + text colour canvas preview —
	// site-header had NEITHER mirror (site-footer's edit.js already had
	// textPaintPreview wired; backgroundPaintPreview was missing on both
	// blocks). Same reasoning as site-footer/edit.js: `sgs_background_paint_decl()`
	// (helpers-tokens.php) emits `background-color`/`background-image` DIRECTLY
	// on the block's own root selector (site-header/render.php:80-90) — a real
	// property on the element itself, distinct from the `--sgs-ed-bg-*` custom
	// properties `bgPreview` below paints onto the `::before` media layer, so
	// `backgroundPaint` is spread FIRST and `bgPreview.style` after: PHP renders
	// the media (image/::before layer) visually ABOVE the flat colour
	// (class-sgs-container-wrapper.php:1373-1412), so on the rare occasion both
	// are set the media preview wins, matching the live page.
	const backgroundPaint = backgroundPaintPreview(
		attributes.backgroundColour,
		attributes.backgroundColourGradient,
		colourPalette
	);
	const textPreview = textPaintPreview( attributes.textColour, attributes.textColourGradient, colourPalette );

	const bgPreview = backgroundPreview( {
		backgroundImage: attributes.backgroundImage,
		bgVideo: attributes.bgVideo,
		backgroundSize: attributes.backgroundSize,
		backgroundPosition: attributes.backgroundPosition,
		backgroundRepeat: attributes.backgroundRepeat,
		backgroundAttachment: attributes.backgroundAttachment,
		bgKenBurns: attributes.bgKenBurns,
		bgAnimationDuration: attributes.bgAnimationDuration,
		bgParallax: attributes.bgParallax,
		backgroundOverlayColour: attributes.backgroundOverlayColour,
		overlayGradient: attributes.overlayGradient,
		backgroundOverlayOpacity: attributes.backgroundOverlayOpacity,
		backgroundOverlayBlendMode: attributes.backgroundOverlayBlendMode,
	}, colourPalette );

	// Decorative SVG background layer — editor mirror. Deliberately
	// NOT folded into backgroundPreview()'s return: that helper paints via
	// `--sgs-ed-bg-*` custom properties on a ::before, whereas the SVG layer is a
	// real element whose painting rules already ship in style.css (loaded in the
	// canvas via block.json `style`). See svgBackgroundPreview()'s own docblock.
	// Attributes enumerated EXPLICITLY rather than passing `attributes` wholesale
	// — the same convention backgroundPreview()'s call site above already uses:
	// it documents exactly which attrs this mirror reads, and
	// check-editor-render-parity.js (CHECK A) resolves an attribute as
	// canvas-reflected only when its NAME appears outside the Inspector panels.
	const svgPreview = svgBackgroundPreview( {
		bgSvgContent: attributes.bgSvgContent,
		bgSvgPosition: attributes.bgSvgPosition,
		bgSvgAnimation: attributes.bgSvgAnimation,
		bgSvgAnimationSpeed: attributes.bgSvgAnimationSpeed,
		bgSvgOpacity: attributes.bgSvgOpacity,
		bgSvgMinHeight: attributes.bgSvgMinHeight,
		bgSvgTextShadow: attributes.bgSvgTextShadow,
	} );

	// Active device tier for the padding/margin preview below — this block had
	// no previewTier mechanism of its own, so this follows sgs/container's
	// getDeviceType read exactly (same source its own Layout panel writes).
	const previewTier = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device =
			ed && typeof ed.getDeviceType === 'function' ? ed.getDeviceType() : null;
		return { Tablet: 'tablet', Mobile: 'mobile' }[ device ] || 'desktop';
	}, [] );

	// Padding/margin canvas preview. `padding`/`margin` are each ONE
	// tier-of-boxes object attr { desktop, tablet, mobile }, read directly.
	const spacePreview = spacingPreview( {
		padding: attributes.padding,
		margin: attributes.margin,
	}, previewTier );

	const blockProps = useBlockProps( {
		className: [ 'sgs-site-header', bgPreview.className, ...svgPreview.className ]
			.filter( Boolean )
			.join( ' ' ),
		// The pill preview is spread LAST so its width/margin-inline win over the
		// spacing preview's margin for a floating header — which is what the
		// frontend does too (the float rules are emitted after the wrapper's).
		style: { ...backgroundPaint, ...bgPreview.style, ...svgPreview.style, ...spacePreview, ...textPreview, ...floatPreview( { headerFloat: attributes.headerFloat, headerFloatInset: attributes.headerFloatInset, headerFloatCollapse: attributes.headerFloatCollapse, backdropBlur: attributes.backdropBlur }, previewTier ) },
	} );
	const refEl = useRef( null );

	// FR-37-28 depth: the header's logo/nav alignment lives on the primary
	// (middle) row, not the container. Look it up so a layout preset can
	// re-align it. Re-runs when the middle row's justifyContent changes, so
	// the active-preset indicator stays honest against manual row edits.
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const middleRow = useSelect(
		( select ) => {
			const inner = select( blockEditorStore ).getBlocks( clientId );
			return (
				inner.find(
					( b ) =>
						b.name === 'sgs/site-header-row' &&
						b.attributes?.rowSlot === 'middle'
				) || null
			);
		},
		[ clientId ]
	);
	const middleRowClientId = middleRow?.clientId;
	const middleRowJustify = middleRow?.attributes?.justifyContent ?? '';

	// Contrast check for border — warn if border fails WCAG 3:1 contrast
	// against the block's own background. When the block has no background
	// set, there's no static background to compare against, so the check is
	// skipped. Follows the text.js pattern.
	//
	// `contrastAgainst` only accepts a FLAT colour/token — it is not itself
	// gradient-aware. When `backgroundColourGradient` is set, the gradient (not
	// the flat `backgroundColour`) is what actually paints, so comparing against
	// the flat colour would compare against a surface that isn't rendered — skip
	// the check entirely in that case rather than feed the raw gradient string in.
	const headerContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	// ⛔ Seed the three rows ONLY into a genuinely EMPTY container.
	//
	// WP core re-applies a block's template on EVERY mount when templateLock is
	// 'all' or 'contentOnly' — NOT only when the block is empty. Verified against
	// WP 7.0.2 source, wp-includes/js/dist/block-editor.js (useInnerBlockTemplateSync):
	//     shouldApplyTemplate = currentInnerBlocks.length === 0
	//         || templateLock === 'all' || templateLock === 'contentOnly'
	// and synchronizeBlocksWithTemplate (wp-includes/js/dist/blocks.js) then matches
	// existing rows by ARRAY POSITION alone — `blocks[index]` with a name-only
	// compare. `rowSlot` is never consulted, so row 1 is treated as "the top row"
	// whatever it actually is.
	//
	// Passing TEMPLATE unconditionally would therefore overwrite every inserted
	// starter pattern and DESTROY its content, not just add to it (a search-bar
	// starter would lose its search bar). It would also fire on every re-open,
	// so an insert-only guard would not hold.
	//
	// Withholding the template is a true no-op in core — synchronizeBlocksWithTemplate
	// opens with `if (!template) return blocks;` — so the row LOCK below is
	// untouched: templateLock still governs add / remove / reorder.
	//
	// Latched on first render so the template's identity never changes mid-life.
	const innerBlockCount = useSelect(
		( select ) => select( blockEditorStore ).getBlocks( clientId ).length,
		[ clientId ]
	);
	const seedTemplateRef = useRef( null );
	if ( seedTemplateRef.current === null ) {
		seedTemplateRef.current = innerBlockCount === 0;
	}

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: seedTemplateRef.current ? TEMPLATE : undefined,
		// Fixed three rows: operators can't add, remove, or reorder rows, but can
		// fully edit the elements inside each row (the rows set their own
		// templateLock:false for their content). Note: 'insert' only blocks
		// add/remove — it still permits dragging rows into a different order,
		// so 'all' is required here.
		templateLock: 'all',
		orientation: 'vertical',
	} );

	// Mirrors class-sgs-container-wrapper.php:2794-2798. `aria-hidden` matches the
	// server; `pointer-events:none` is editor-only insurance so the decorative
	// layer can never swallow a click meant for the block or its children.
	const svgLayer = svgPreview.hasSvg ? (
		<div
			className="sgs-container__svg-bg"
			aria-hidden="true"
			style={ { pointerEvents: 'none' } }
			dangerouslySetInnerHTML={ { __html: svgPreview.markup } }
		/>
	) : null;

	const {
		headerSticky,
		headerTransparent,
		headerShrink,
		headerHideOnScroll,
		contrastSafe,
		backgroundColour,
		backgroundColourGradient,
		backgroundColourScrolled,
		backgroundColourScrolledGradient,
		textColour,
		textColourScrolled,
		headerTransparentDirection,
	} = attributes;

	// Shrink on scroll is CONCEPTUALLY a sub-behaviour of Sticky on scroll, not
	// an independent toggle. render.php's shrink animation (`animation-timeline:
	// scroll(root block); animation-range: 0 200px`) and its `.is-header-shrunk`
	// fallback both key off document scrollY — NEITHER checks headerSticky. But
	// a header that is not sticky/fixed scrolls out of the viewport in normal
	// document flow well before that 200px range completes (the header's own
	// rendered height is ~97px), and view.js's `initScrollBehaviours()` toggles
	// `is-header-shrunk` purely off `window.scrollY > 50` with no
	// visibility/pinned check — so a non-sticky header's shrink animation runs
	// mostly (or entirely) off-screen. The effect is real in code but invisible
	// to the visitor without Sticky. Hiding the control until Sticky is on
	// stops a client enabling a setting that visibly does nothing. Same pattern
	// as sgs/button's `edit.js`, which conditionally renders its "Collapse
	// label to icon" ToolsPanelItem on `iconPosition !== 'only'`.
	const isStickyOn = isOnAtAnyTier( headerSticky );

	// Contrast safety over hero is similarly a sub-behaviour, but of
	// TRANSPARENT, not Sticky: a header with a solid resting background has no
	// hero showing through to protect against, so the control has nothing to
	// decide until Transparent is on. Hidden otherwise, for the same reason
	// Shrink is hidden until Sticky is on.
	const isTransparentOn = isOnAtAnyTier( headerTransparent );

	// WCAG 1.4.3 ADVISORY. The PHP resolver never silently rewrites a
	// client's explicit 'none' to 'scrim' when Transparent resolves on —
	// the locked project rule is that operator accessibility failures are
	// NOTICES, never enforcement, so this advisory states the risk, offers
	// the fix as one click, and honours whatever the client decides.
	// Precedent: WordPress core's own ContrastChecker warns and never enforces.
	//
	// Evaluated PER TIER, not once for the block: contrastSafe is a per-device
	// object now, so a header transparent on desktop but solid on phone carries
	// the risk on exactly one tier and should say exactly that.
	const unprotectedTiers = [ 'desktop', 'tablet', 'mobile' ].filter(
		( tier ) =>
			resolveTier( headerTransparent, tier, 'off' ).value === 'on' &&
			resolveTier( contrastSafe, tier, 'none' ).value === 'none'
	);

	// Check contrast ratio on attribute changes
	const [ contrastNotice, setContrastNotice ] = useState( null );

	// Reads block-private backgroundColour/textColour (SgsColourPanel) — not
	// WP-native style.color.background/.text: this block's supports.color
	// sub-flags are all false, so WordPress never populates `style.color`.
	// Resolved via resolveColourToken() the same way the paint itself is,
	// since a stored value can be a theme-token slug, not a literal colour.
	useEffect( () => {
		if ( ! backgroundColour || ! textColour ) {
			setContrastNotice( null );
			return;
		}

		const bgLuminance = calculateRelativeLuminance(
			resolveColourToken( backgroundColour, colourPalette ) || backgroundColour,
			refEl.current
		);
		const textLuminance = calculateRelativeLuminance(
			resolveColourToken( textColour, colourPalette ) || textColour,
			refEl.current
		);

		const ratio = calculateContrastRatio( bgLuminance, textLuminance );

		// Check both normal text (4.5:1) and large text (3:1) — use the stricter threshold
		if ( ! meetsWCAG_AA( ratio, false ) ) {
			setContrastNotice(
				__( 'This text colour may be hard to read on this background. Consider adjusting the colour for better readability.', 'sgs-blocks' )
			);
		} else {
			setContrastNotice( null );
		}
	}, [ backgroundColour, textColour, colourPalette ] );

	return (
		<>
			{ /* COLOUR — mounted FIRST because WordPress concatenates same-group
			     InspectorControls Fills in mount order, and this panel is pinned
			     to the top of the block's inspector by standing rule.

			     Colour is SGS-owned, not WordPress's native colour supports:
			     sgs/site-header-row carries the SAME two colours as SGS
			     attributes, so both levels use one mechanism. block.json keeps
			     `supports.color` DECLARED (a gate reads the key as a pipeline
			     contract signal) with every sub-flag false, so core renders no
			     panel of its own and there is exactly one colour home per block.

			     Labels say "Header …" against the row block's "Row …" so the two
			     levels read as different scopes rather than duplicates: this
			     colours the whole bar, a row colours one band inside it. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'background',
						label: __( 'Header background', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'At rest', 'sgs-blocks' ),
								value: backgroundColour,
								onChange: ( val ) =>
									setAttributes( { backgroundColour: val ?? '' } ),
								gradientValue: backgroundColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										backgroundColourGradient: val ?? '',
									} ),
								linked: true,
							},
							{
								// `scrolled` is a REAL state, not a notional one:
								// view.js toggles `.is-header-scrolled` on the
								// header element and render.php paints against it.
								// Structurally identical to `current`
								// ([aria-current]) — a class toggled at runtime,
								// painted by CSS.
								key: 'scrolled',
								label: __( 'Once scrolled', 'sgs-blocks' ),
								value: backgroundColourScrolled,
								onChange: ( val ) =>
									setAttributes( {
										backgroundColourScrolled: val ?? '',
									} ),
								gradientValue: backgroundColourScrolledGradient,
								onGradientChange: ( val ) =>
									setAttributes( {
										backgroundColourScrolledGradient: val ?? '',
									} ),
							},
						],
					},
					{
						key: 'text',
						label: __( 'Header text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'At rest', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'scrolled',
								label: __( 'Once scrolled', 'sgs-blocks' ),
								value: textColourScrolled,
								onChange: ( val ) =>
									setAttributes( { textColourScrolled: val ?? '' } ),
							},
						],
					},
				] }
			/>

			{ /* Background renders in the STYLES tab, not Settings. Same shared
			     panel, same tab, on every wrapper block, so the client finds it
			     in the same place whichever block is selected. Appearance sits
			     with colour, in Styles. */ }
			<InspectorControls group="styles">
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />

				{ /* SHADOW — the shared ShadowControl (X/Y/blur/spread/
				     colour+alpha/inset) every other SGS_Container_Wrapper block
				     mounts — matches sgs/cta-section's reference wiring. The
				     `shadow`/`shadowColour`/`shadowColourHover` attrs are already
				     read by class-sgs-container-wrapper.php via
				     sgs_shadow_value_composed(); a bare preset slug (from an
				     existing stored value) still resolves correctly through the
				     same helper. */ }
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
					{ /* SHADOW ONCE SCROLLED — same builder, same value vocabulary
					     (theme preset or custom shape + colour), bound to its own
					     attribute pair. Painted by render.php against the
					     `.is-header-scrolled` class view.js toggles once the page
					     has scrolled; empty = nothing is painted. Sits under the
					     resting shadow so the two read as one at-rest / scrolled
					     pair, matching how the colour panel words its states. */ }
					<hr style={ { margin: '16px 0' } } />
					<ShadowControl
						label={ __( 'Shadow once scrolled', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'shadowScrolled',
							colour: 'shadowScrolledColour',
						} }
					/>
					<p className="components-base-control__help">
						{ __( 'Applied once the visitor has scrolled down the page, and eased in. Leave on None for no change. Most useful with a sticky header.', 'sgs-blocks' ) }
					</p>
					{ /* The scrolled rule is a more specific selector than both the
					     resting rule and its hover, so while the page is scrolled it
					     is the shadow that paints. Stated here rather than worked
					     around in CSS — the precedence is the intended behaviour, it
					     just is not guessable from the control. */ }
					<p className="components-base-control__help">
						{ __( 'While the page is scrolled, this shadow replaces the resting shadow and its hover shadow.', 'sgs-blocks' ) }
					</p>
				</PanelBody>
				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						contrastAgainst={ headerContrastAgainst }
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
			</InspectorControls>

			<InspectorControls>
				{ contrastNotice && (
					<Notice
						status="warning"
						isDismissible={ false }
						className="sgs-contrast-notice"
					>
						{ contrastNotice }
					</Notice>
				) }
				{ /* Settings tab: "Header width" is the one layout choice most
				     clients touch (contained vs full-bleed), so it stays a plain
				     always-visible panel. Padding & margin (fine-tuning spacing)
				     and Background (image/video/SVG/overlay — a rich, situational
				     panel) sit behind a ToolsPanel "+ Add" disclosure — one click
				     away, not shown until asked for. */ }
				<PanelBody title={ __( 'Header width', 'sgs-blocks' ) }>
					<WidthPanel
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveOverride
						value={ attributes.minHeight }
						onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								label={ __( 'Min height', 'sgs-blocks' ) }
								value={ ownValue || '' }
								options={ MIN_HEIGHT_OPTIONS }
								onChange={ ( val ) => setOwnValue( val || undefined ) }
								help={ tier === 'desktop'
									? __( 'Desktop / base. Tablet and mobile override it at narrower widths.', 'sgs-blocks' )
									: undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				<ToolsPanel
					label={ __( 'Advanced layout', 'sgs-blocks' ) }
					resetAll={ () => {
						setAttributes( {
							// `{}`, not `undefined` — these attrs declare a `{}`
							// default, hasValue counts their keys, and the PHP
							// wrapper guards with is_array(). The two are not
							// interchangeable here.
							padding: {},
							margin: {},
							zIndex: {},
							backgroundImage: undefined,
							backgroundImageTablet: undefined,
							backgroundImageMobile: undefined,
							backgroundOverlayColour: undefined,
							backgroundAttachment: 'scroll',
							backgroundPosition: 'center center',
							backgroundRepeat: 'no-repeat',
							backgroundSize: 'cover',
							bgVideo: undefined,
							bgVideoTablet: undefined,
							bgVideoMobile: undefined,
							bgParallax: false,
							bgKenBurns: false,
							bgAnimationDuration: 20,
							bgSvgContent: '',
							bgSvgPosition: 'background',
							bgSvgAnimation: 'none',
							bgSvgAnimationSpeed: 'medium',
							bgSvgOpacity: 100,
							bgSvgMinHeight: '',
							bgSvgTextShadow: false,
							// overlayGradient is a string attr, so it resets to ''
							// (WP silently discards a wrong-typed or undeclared value).
							overlayGradient: '',
						} );
					} }
				>
					{ /* Responsive spacing (padding + margin) — box-object interface
					     contract. Base tier writes the block's OWN padding/margin object attrs
					     (this block declares no supports.spacing, so there is no
					     duplicate Styles > Dimensions panel); each attr holds
					     desktop, tablet and mobile, read by the wrapper's @media tiers. */ }
					<ToolsPanelItem
						label={ __( 'Padding & margin', 'sgs-blocks' ) }
						hasValue={ () =>
							! isTierBoxEmpty( attributes.padding ) ||
							! isTierBoxEmpty( attributes.margin )
						}
						onDeselect={ () =>
							setAttributes( {
								padding: {},
								margin: {},
							} )
						}
					>
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
						<hr style={ { margin: '16px 0' } } />
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
					</ToolsPanelItem>

					{ /* contentBandPadding is a TIER OBJECT — ONE attr holding
					     {desktop,tablet,mobile}, each tier itself a {top,right,bottom,left}
					     box. It therefore uses
					     ResponsiveOverride, which reads and writes the object, NOT the
					     flat-sibling ResponsiveBoxControl. Mirrors container's own
					     implementation. */ }
					<ToolsPanelItem
						label={ __( 'Band padding', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( attributes.contentBandPadding ?? {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( { contentBandPadding: {} } )
						}
					>
						<ResponsiveOverride
							value={ attributes.contentBandPadding }
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
					</ToolsPanelItem>

					{ /* zIndex is a TIER OBJECT written by includes/sgs-header-z-index.php
					     (the header's single z-index writer). Empty = inherit the wider
					     tier; the framework default is 100. */ }
					<ToolsPanelItem
						label={ __( 'Stacking order (z-index)', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( attributes.zIndex ?? {} ).length > 0
						}
						onDeselect={ () => setAttributes( { zIndex: {} } ) }
					>
						<ResponsiveOverride
							value={ attributes.zIndex }
							onChange={ ( obj ) => setAttributes( { zIndex: obj } ) }
						>
							{ ( { tier, ownValue, setOwnValue } ) => (
								<NumberControl
									label={ __( 'Stacking order (z-index)', 'sgs-blocks' ) }
									value={ ownValue ?? '' }
									min={ 0 }
									max={ 99998 }
									placeholder="100"
									onChange={ ( val ) =>
										setOwnValue(
											val === '' || val === undefined || val === null
												? undefined
												: Math.max( 0, Math.min( 99998, parseInt( val, 10 ) || 0 ) )
										)
									}
									help={
										tier === 'desktop'
											? __( 'Where the header sits above page content. Leave empty for the default (100). Use 4 or more so the menu panel stays below the header. Tablet and mobile inherit desktop until set.', 'sgs-blocks' )
											: undefined
									}
									__next40pxDefaultSize
								/>
							) }
						</ResponsiveOverride>
					</ToolsPanelItem>

				</ToolsPanel>
			</InspectorControls>

			<InspectorControls group="settings">
				<ToolsPanel
					label={ __( 'Header behaviour', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							headerSticky: {},
							headerTransparent: {},
							headerShrink: {},
							headerHideOnScroll: {},
							contrastSafe: {},
							...floatResetAttributes(),
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( headerSticky || {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( { headerSticky: {} } )
						}
						isShownByDefault
					>
						<ResponsiveTriStateControl
							label={ __( 'Sticky on scroll', 'sgs-blocks' ) }
							help={ __(
								'Pins the header to the top of the viewport while the visitor scrolls.',
								'sgs-blocks'
							) }
							value={ headerSticky }
							onChange={ ( value ) =>
								setAttributes( { headerSticky: value } )
							}
							defaultValue="off"
						/>
					</ToolsPanelItem>

					{ /* Floating ("pill") mode sits immediately after Sticky
					     because turning it on IMPLIES sticky for that device —
					     a pill that is not pinned is just an inset bar that
					     scrolls away. Its controls, canvas preview and reset all
					     live in FloatControls.js; edit.js only mounts them. */ }
					<FloatControls
						attributes={ attributes }
						setAttributes={ setAttributes }
					/>

					<ToolsPanelItem
						label={ __(
							'Transparent until scrolled',
							'sgs-blocks'
						) }
						hasValue={ () =>
							Object.keys( headerTransparent || {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( { headerTransparent: {} } )
						}
					>
						<ResponsiveTriStateControl
							label={ __(
								'Transparent until scrolled',
								'sgs-blocks'
							) }
							help={ __(
								'Header starts see-through over a hero image, then becomes solid once the visitor scrolls. Set “Contrast safety over hero” below so text stays readable over the image.',
								'sgs-blocks'
							) }
							value={ headerTransparent }
							onChange={ ( value ) =>
								setAttributes( { headerTransparent: value } )
							}
							defaultValue="off"
						/>

						{ unprotectedTiers.length > 0 && (
							<Notice
								status="warning"
								isDismissible={ false }
								className="sgs-contrast-notice"
							>
								<p style={ { margin: '0 0 8px' } }>
									{ sprintf(
										/* translators: %s: a list of device tiers, e.g. "Desktop, Phone". */
										__(
											'On %s this header is see-through with no contrast protection, so text over a hero image may be hard to read. Nothing has been changed for you — this is a suggestion, not a rule.',
											'sgs-blocks'
										),
										unprotectedTiers
											.map( ( t ) => TIER_LABELS[ t ] )
											.join( ', ' )
									) }
								</p>
								<Button
									variant="secondary"
									size="small"
									onClick={ () => {
										const next = { ...( contrastSafe || {} ) };
										unprotectedTiers.forEach( ( t ) => {
											next[ t ] = 'scrim';
										} );
										setAttributes( { contrastSafe: next } );
									} }
								>
									{ __( 'Apply contrast scrim', 'sgs-blocks' ) }
								</Button>
							</Notice>
						) }
					</ToolsPanelItem>

					{ /* WHICH STATE IS WHICH. The transparent behaviour has two
					     states — see-through at rest, solid once scrolled — and
					     this control chooses which is which, so a client can have
					     colour at the top and transparency further down. It adds no
					     new CSS mechanism; it swaps which of the two existing rules
					     carries the transparency. Shown only once Transparent is
					     on, for the same reason the contrast control is: with it
					     off there is no pair to order. */ }
					{ isTransparentOn && (
						<ToolsPanelItem
							label={ __( 'Which way round', 'sgs-blocks' ) }
							hasValue={ () =>
								!! headerTransparentDirection &&
								'transparent-first' !== headerTransparentDirection
							}
							onDeselect={ () =>
								setAttributes( {
									headerTransparentDirection:
										'transparent-first',
								} )
							}
						>
							<SelectControl
								label={ __( 'Which way round', 'sgs-blocks' ) }
								value={
									headerTransparentDirection ||
									'transparent-first'
								}
								options={ [
									{
										label: __(
											'See-through at the top, solid once scrolled',
											'sgs-blocks'
										),
										value: 'transparent-first',
									},
									{
										label: __(
											'Solid at the top, see-through once scrolled',
											'sgs-blocks'
										),
										value: 'solid-first',
									},
								] }
								onChange={ ( value ) =>
									setAttributes( {
										headerTransparentDirection: value,
									} )
								}
								help={ __(
									'Set the colours for each state in the Colour panel, under “Header background”.',
									'sgs-blocks'
								) }
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						</ToolsPanelItem>
					) }

					{ /* Conditionally rendered, not just disclosure-hidden — see the
					     isStickyOn docblock above. Only appears once Sticky on
					     scroll is on at some tier; a non-sticky header cannot show
					     a meaningful shrink. */ }
					{ isStickyOn && (
						<ToolsPanelItem
							label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
							hasValue={ () =>
								Object.keys( headerShrink || {} ).length > 0
							}
							onDeselect={ () =>
								setAttributes( { headerShrink: {} } )
							}
						>
							<ResponsiveTriStateControl
								label={ __( 'Shrink on scroll', 'sgs-blocks' ) }
								help={ __(
									'Reduces the header height as the visitor scrolls down the page. Only visible while the header is pinned via Sticky on scroll — a header that scrolls away normally never stays on screen long enough to shrink.',
									'sgs-blocks'
								) }
								value={ headerShrink }
								onChange={ ( value ) =>
									setAttributes( { headerShrink: value } )
								}
								defaultValue="off"
							/>
						</ToolsPanelItem>
					) }

					<ToolsPanelItem
						label={ __( 'Hide on scroll', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( headerHideOnScroll || {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( { headerHideOnScroll: {} } )
						}
					>
						<ResponsiveTriStateControl
							label={ __( 'Hide on scroll', 'sgs-blocks' ) }
							help={ __(
								'Header slides off the top of the screen once the visitor scrolls down, and slides back in as soon as they scroll up.',
								'sgs-blocks'
							) }
							value={ headerHideOnScroll }
							onChange={ ( value ) =>
								setAttributes( { headerHideOnScroll: value } )
							}
							defaultValue="off"
						/>
					</ToolsPanelItem>

					{ /* Conditionally rendered — see the isTransparentOn docblock
					     above. A non-transparent header already has a solid resting
					     background (nothing to protect contrast against), and
					     class-sgs-header-behaviours.php auto-upgrades this to
					     'scrim' the moment Transparent switches on, so the control
					     has nothing to decide until then. */ }
					{ isTransparentOn && (
						<ToolsPanelItem
							label={ __(
								'Contrast safety over hero',
								'sgs-blocks'
							) }
							hasValue={ () =>
								Object.keys( contrastSafe || {} ).length > 0
							}
							onDeselect={ () =>
								setAttributes( { contrastSafe: {} } )
							}
						>
							{ /* PER-DEVICE. Stored as a tier object so "scrim over the
							     desktop hero, nothing on phone" — the common
							     case — is expressible.

							     It uses <ResponsiveOverride> and NOT the
							     <ResponsiveTriStateControl> its four siblings use,
							     because those are on/off booleans and this is a
							     FOUR-value enum. The tri-state control renders an
							     on/off ToggleGroupControl; pointing it at this
							     attribute would store values it cannot display and
							     silently flatten the client's choice. Matching the
							     control primitive to the STORAGE shape is the rule
							     here, not matching the neighbouring control. */ }
							<ResponsiveOverride
								value={ contrastSafe }
								onChange={ ( obj ) =>
									setAttributes( { contrastSafe: obj } )
								}
							>
								{ ( {
									tier,
									ownValue,
									effectiveValue,
									setOwnValue,
								} ) => (
									<SelectControl
										label={ __(
											'Contrast safety over hero',
											'sgs-blocks'
										) }
										value={
											tier === 'desktop'
												? ownValue || 'none'
												: ownValue || ''
										}
										options={
											tier === 'desktop'
												? CONTRAST_SAFE_OPTIONS
												: [
														{
															label: sprintf(
																/* translators: %s: the setting inherited from the wider device, e.g. "Scrim overlay". */
																__(
																	'— same as wider screens (%s) —',
																	'sgs-blocks'
																),
																CONTRAST_SAFE_LABELS[
																	effectiveValue
																] ||
																	CONTRAST_SAFE_LABELS.none
															),
															value: '',
														},
														...CONTRAST_SAFE_OPTIONS,
													]
										}
										onChange={ ( value ) =>
											setOwnValue( value || undefined )
										}
										help={ __(
											'Keeps header text readable when it sits over a hero image. Used with Transparent until scrolled.',
											'sgs-blocks'
										) }
										__next40pxDefaultSize
										__nextHasNoMarginBottom
									/>
								) }
							</ResponsiveOverride>
						</ToolsPanelItem>
					) }
				</ToolsPanel>
			</InspectorControls>

			{ /* Styles tab — FR-37-28 layout preset. Simple (default-visible)
			     control: writes contentWidth + the block's own `padding` attr,
			     both existing attrs, never a new stored shape. */ }
			{ /* FR-37-47 — starter-look preset. Sits above the Layout preset
			     (FR-37-28) it extends: this replaces WHOLE looks (attributes
			     + row content); FR-37-28 below fine-tunes alignment/width
			     within whichever look is currently applied. */ }
			<InspectorControls group="styles">
				<StarterLookPresetControl
					clientId={ clientId }
					rootBlockName="sgs/site-header"
				/>
			</InspectorControls>

			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Layout', 'sgs-blocks' ) }
					resetAll={ () =>
						applyLayoutPreset(
							'split',
							attributes,
							setAttributes,
							middleRowClientId,
							updateBlockAttributes
						)
					}
				>
					<ToolsPanelItem
						label={ __( 'Layout preset', 'sgs-blocks' ) }
						hasValue={ () =>
							getActiveLayoutPreset( attributes, middleRowJustify ) !==
							'split'
						}
						onDeselect={ () =>
							applyLayoutPreset(
								'split',
								attributes,
								setAttributes,
								middleRowClientId,
								updateBlockAttributes
							)
						}
						isShownByDefault
					>
						<ToggleGroupControl
							label={ __( 'Layout preset', 'sgs-blocks' ) }
							value={ getActiveLayoutPreset(
								attributes,
								middleRowJustify
							) }
							onChange={ ( value ) =>
								applyLayoutPreset(
									value,
									attributes,
									setAttributes,
									middleRowClientId,
									updateBlockAttributes
								)
							}
							help={ __(
								'Sets the header content-band width, padding and logo/nav alignment in one step. Selecting a preset overwrites those values — fine-tune afterwards in the panels above (or the middle row for alignment).',
								'sgs-blocks'
							) }
							isBlock
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						>
							<ToggleGroupControlOption
								value="centred"
								label={ __( 'Centred', 'sgs-blocks' ) }
							/>
							<ToggleGroupControlOption
								value="split"
								label={ __( 'Split', 'sgs-blocks' ) }
							/>
							<ToggleGroupControlOption
								value="minimal"
								label={ __( 'Minimal', 'sgs-blocks' ) }
							/>
						</ToggleGroupControl>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			{ /* Editor canvas renders as <header> to match the frontend banner
			     landmark (FR-37-13). */ }
			<header ref={ refEl } { ...innerBlocksProps }>
				{ svgLayer }
				{ innerBlocksProps.children }
			</header>
		</>
	);
}
