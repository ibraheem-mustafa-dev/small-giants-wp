import { __ } from '@wordpress/i18n';
import { useEffect, useRef, useState } from 'react';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	store as blockEditorStore,
	useSettings,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { PanelBody, Notice, SelectControl } from '@wordpress/components';
// sgs/site-footer does not use <ContainerWrapperControls>'s
// ResponsiveSpacingPanel: padding and margin are box OBJECT attrs read by
// class-sgs-container-wrapper.php, so this block's own "Padding & margin"
// panel below uses ResponsiveBoxControl bound to those object attrs (as
// sgs/container's and sgs/cta-section's own edit.js do).
import {
	WidthPanel,
	BackgroundPanel,
	ShapeDividersPanel,
	MIN_HEIGHT_OPTIONS,
} from '../container/components/ContainerWrapperControls';
import { ResponsiveBoxControl, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsColourPanel, SgsBorderControl, resolveColourToken, SgsBoxControl, StarterLookPresetControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { backgroundPaintPreview, backgroundPreview, spacingPreview, svgBackgroundPreview, textPaintPreview, flattenPresetSetting } from '../../utils';
import { calculateRelativeLuminance, calculateContrastRatio, meetsWCAG_AA } from '../../utils/wcag-contrast';

const ALLOWED_BLOCKS = [ 'sgs/site-footer-row' ];

/**
 * This block declares no `templateMode` (the container-family allowed-children
 * preset): its allowedBlocks is fixed to a single type — `sgs/site-footer-row` —
 * at the block.json level, enforced alongside a structural 3-row TEMPLATE
 * under `templateLock: 'all'` (see the seed-once guard below). Both
 * templateMode presets (grid-section/card-grid) list content blocks like
 * heading/text/button/info-box that this block can never accept, so neither
 * preset could do anything. Same shape as physics-canvas: no room for a
 * variable content-type restriction on a block already locked to one child
 * type.
 */

// calculateRelativeLuminance / calculateContrastRatio / meetsWCAG_AA moved to
// the shared `../../utils/wcag-contrast` module (imported above) — this was
// a byte-identical duplicate of site-header/edit.js's copy.

// Three rows matching the draft `.mm-footer`: an optional top strip (CTA /
// newsletter, empty by default → zero output), a columns grid (brand + link
// groups, collapsing to 1 column below 768), and a centred bottom bar. Every
// business-data field (tagline/socials/copyright) uses the sgs/business-info
// block, which reads live from Business Details (no hardcoded client data, no
// per-field bindings — Spec 37 FR-37-17 / §3.7, FR-S4-5). Generic link labels are not personal data.
const TEMPLATE = [
	[ 'sgs/site-footer-row', { rowSlot: 'top', layout: 'flex' } ],
	[
		'sgs/site-footer-row',
		{
			rowSlot: 'columns',
			layout: 'grid',
			// Columns are an operator-set COUNT (Spec 37 §3.3): the
			// shared wrapper reads columns as a TIER OBJECT
			// (class-sgs-container-wrapper.php) and stacks to the mobile tier's
			// count below 768. No gridTemplateColumns object is seeded — an
			// object there would flip $object_grid true and suppress the count
			// path. A per-device custom template stays available as an advanced
			// override (set gridTemplateColumns explicitly), never the default.
			// Do NOT seed columns/columnsTablet/columnsMobile as flat siblings
			// here — sgs/site-footer-row's block.json does not declare them,
			// so WordPress would silently discard the seed.
			columns: { desktop: 3, tablet: 3, mobile: 1 },
			// gap is a {desktop,tablet,mobile} object attr — a flat string would
			// be coerced to the block.json default at render.
			gap: { desktop: '48px', mobile: '32px' },
		},
		[
			// Column 1 — brand: logo + tagline + socials from Business Details.
			[
				'sgs/container',
				{ className: 'sgs-site-footer__brand', layout: { type: 'constrained' } },
				[
					[ 'sgs/responsive-logo', { width: 160, linkToHome: true } ],
					[ 'sgs/business-info', { displayType: 'description' } ],
					[ 'sgs/business-info', { displayType: 'socials' } ],
				],
			],
			// Column 2 — Shop links.
			[
				'sgs/container',
				{ className: 'sgs-site-footer__links', layout: { type: 'constrained' } },
				[
					[ 'sgs/heading', { level: 'h2' } ],
						[
							'sgs/text',
							{},
						],
				],
			],
			// Column 3 — Legal links.
			[
				'sgs/container',
				{ className: 'sgs-site-footer__links', layout: { type: 'constrained' } },
				[
					[ 'sgs/heading', { level: 'h2' } ],
						[
							'sgs/text',
							{},
						],
				],
			],
		],
	],
	[
		'sgs/site-footer-row',
		// Shapes here are NOT free-form — they mirror framework-footer-default.php's
		// bottom row exactly, because site-footer-row declares gap/padding/margin as
		// OBJECT attrs. A flat value (gap:'8px') or a missing tier (padding:{top})
		// is silently COERCED to the block.json default at render — no error, no test
		// failure, just the wrong spacing.
		{
			rowSlot: 'bottom',
			layout: 'flex',
			justifyContent: 'center',
			gap: { desktop: '8px' },
			padding: {
				desktop: {
					top: 'var(--wp--preset--spacing--40)',
					bottom: 'var(--wp--preset--spacing--40)',
				},
			},
			margin: { desktop: { top: 'var(--wp--preset--spacing--50)' } },
			borderStyle: 'solid',
			borderWidth: { top: '1px' },
			borderColour: 'accent',
		},
		[
			[ 'sgs/business-info', { displayType: 'copyright' } ],
		],
	],
];

export default function Edit( { attributes, setAttributes, clientId, name } ) {
	// BackgroundPanel (mounted below) writes image/video/overlay/ken-burns/
	// parallax attrs; the shared mirror (src/utils/background-preview.js)
	// previews them on the canvas the same way sgs/container does.
	const [ colourPalette ] = useSettings( 'color.palette' );
	// The theme's gradient presets, normalised by flattenPresetSetting() —
	// useSettings() returns a flat array or an origin-keyed object depending on
	// the feature — so backgroundPreview() can resolve a preset SLUG to its CSS stops.
	const [ rawGradientPresets ] = useSettings( 'color.gradients' );
	const gradientPresets = flattenPresetSetting( rawGradientPresets );

	// SGS-owned flat background colour/gradient canvas preview — the gap this
	// fix closes. `sgs_background_paint_decl()` (helpers-tokens.php) emits
	// `background-color`/`background-image` DIRECTLY on the block's own root
	// selector (site-footer/render.php:112-118) — a real property on the
	// element itself, not a custom property on the `::before` media layer
	// `bgPreview` below paints onto. The two never collide on CSS property
	// name, so `backgroundPaint` is spread FIRST and `bgPreview.style` after:
	// PHP renders the media (image/::before layer) visually ABOVE the flat
	// colour (class-sgs-container-wrapper.php:1373-1412), so on the rare
	// occasion both are set the media's own preview values should win, same
	// precedence as the live page.
	const backgroundPaint = backgroundPaintPreview(
		attributes.backgroundColour,
		attributes.backgroundColourGradient,
		colourPalette
	);

	const bgPreview = backgroundPreview( {
		backgroundImage: attributes.backgroundImage,
		bgVideo: attributes.bgVideo,
		bgLottie: attributes.bgLottie,
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
		backgroundColour: attributes.backgroundColour,
		backgroundColourGradient: attributes.backgroundColourGradient,
		surfaceBlur: attributes.surfaceBlur,
		surfaceSaturate: attributes.surfaceSaturate,
	}, colourPalette, gradientPresets );

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

	// Layout preview (`layout` is FIXED to 'flex' — see the Layout PanelBody
	// below for why this block never exposes a picker, and never previews
	// `alignContent` — mirrors class-sgs-container-wrapper.php's flex branch
	// (~1303-1361) exactly, same shape as sgs/container's own edit.js flex
	// branch (~line 295-315), including the column-axis + wrap invariant:
	// a wrapped column-axis flex container sizes each line from its items
	// rather than being handed the parent's own cross size (CSS Flexbox L1
	// 9.4), so the canvas must show the SAME coercion the live page gets
	// rather than looking fine here and breaking on publish.
	const flexDirectionPreview = attributes.flexDirection || 'column';
	const flexWrapPreview = attributes.flexWrap || 'wrap';
	const isColumnAxisPreview = 0 === flexDirectionPreview.indexOf( 'column' );
	const effectiveFlexWrapPreview =
		isColumnAxisPreview && ( 'wrap' === flexWrapPreview || 'wrap-reverse' === flexWrapPreview )
			? 'nowrap'
			: flexWrapPreview;
	const layoutPreview = {
		display: 'flex',
		flexDirection: flexDirectionPreview,
		flexWrap: effectiveFlexWrapPreview,
	};

	// Text colour/gradient canvas preview. `textColour` is also read inside the
	// WCAG contrast-check useEffect further down, but that is a contrast
	// comparison, not canvas paint — the paint comes from `textPaintPreview()`,
	// which handles both the flat and gradient cases in one call
	// (gradient-text technique when set, plain `color` otherwise).
	const textPreview = textPaintPreview( attributes.textColour, attributes.textColourGradient, colourPalette );

	const blockProps = useBlockProps( {
		className: [ 'sgs-site-footer', bgPreview.className, ...svgPreview.className ]
			.filter( Boolean )
			.join( ' ' ),
		style: { ...backgroundPaint, ...bgPreview.style, ...svgPreview.style, ...spacePreview, ...layoutPreview, ...textPreview },
	} );
	const refEl = useRef( null );

	// SGS-owned colour (the same shape as sgs/site-header) — supports.color
	// sub-flags are false so WordPress generates no native colour UI; these two
	// attribute pairs (background + text, each with a gradient sibling and a
	// hover state) are the ONLY colour surface for this block.
	const {
		backgroundColour,
		backgroundColourGradient,
		backgroundColourHover,
		backgroundColourHoverGradient,
		textColour,
		textColourGradient,
		textColourHover,
		textColourHoverGradient,
	} = attributes;

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
	const footerContrastAgainst =
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
	// starter pattern and DESTROY its content, not just add to it (e.g. a
	// centred footer's bottom row would lose its copyright line, replaced by
	// this TEMPLATE's three empty link columns). It would also fire on every
	// re-open, so an insert-only guard would not hold.
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
		// Fixed rows: operators can't add, remove, or reorder rows, but can fully
		// edit the elements inside each row (the rows set their own
		// templateLock:false). Note: 'insert' only blocks add/remove — it still
		// permits dragging rows into a different order, so 'all' is required here.
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
			{ /* ONE grouped, SGS-OWNED colour panel, rendered FIRST
			     (before any other same-group InspectorControls Fill) so it sits
			     at the top of the Styles tab. The native supports.color UI is
			     disabled — supports.color sub-flags are false. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
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
				] }
			/>

			{ /* Background renders in the STYLES tab, not Settings. Same shared
			     panel, same tab, on every wrapper block, so the client finds it
			     in the same place whichever block is selected. Appearance sits
			     with colour, in Styles. */ }
			{ /* FR-37-47 — starter-look preset, same mechanism/placement as
			     sgs/site-header's (site-header/edit.js). */ }
			<InspectorControls group="styles">
				<StarterLookPresetControl
					clientId={ clientId }
					rootBlockName="sgs/site-footer"
				/>
			</InspectorControls>

			<InspectorControls group="styles">
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />
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
						contrastAgainst={ footerContrastAgainst }
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

				<ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />
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
				<PanelBody title={ __( 'Footer width', 'sgs-blocks' ) }>
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

				{ /* Layout — this block's own `layout` attribute is FIXED to 'flex'
				     (block.json declares no enum, no picker: the footer shell is
				     always a vertical stack of its three rows). Hand-rolled here
				     rather than mounting the shared LayoutPanel component (used by
				     sgs/container + sgs/site-footer-row): that component also
				     renders an "Align content" SelectControl, gated on
				     layout being 'grid' — a mode this block can never reach, since
				     there is no picker to change `layout` away from 'flex'. Mounting
				     it here would ship a control that can structurally never take
				     effect. block.json declares no `alignContent` attribute at
				     all — the shared wrapper only emits align-content in its GRID
				     branch, never the flex one, so there is no CSS path for it
				     while this block renders flex-only. Flex direction + Flex wrap
				     ARE honoured by that same flex branch, so they get real
				     controls + real canvas preview below (mirrors sgs/container's
				     own edit.js flex-branch preview). */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleGroupControl
						label={ __( 'Flex direction', 'sgs-blocks' ) }
						value={ attributes.flexDirection || 'column' }
						onChange={ ( val ) => setAttributes( { flexDirection: val } ) }
						help={ __( 'Column (the default) stacks the three footer rows top to bottom. Row places them side by side.', 'sgs-blocks' ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="row" label={ __( 'Row', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="row-reverse" label={ __( 'Row rev.', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="column" label={ __( 'Column', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="column-reverse" label={ __( 'Col. rev.', 'sgs-blocks' ) } />
					</ToggleGroupControl>
					<ToggleGroupControl
						label={ __( 'Flex wrap', 'sgs-blocks' ) }
						value={ attributes.flexWrap || 'wrap' }
						onChange={ ( val ) => setAttributes( { flexWrap: val } ) }
						help={ __( 'No effect while Flex direction is Column or Col. rev. — a wrapped column axis would ignore the footer width, so the frontend always forces No wrap for those directions.', 'sgs-blocks' ) }
						isBlock
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					>
						<ToggleGroupControlOption value="wrap" label={ __( 'Wrap', 'sgs-blocks' ) } />
						<ToggleGroupControlOption value="nowrap" label={ __( 'No wrap', 'sgs-blocks' ) } />
					</ToggleGroupControl>
				</PanelBody>

				{ /* Responsive spacing (padding + margin) — box-object interface
				     contract. Base tier writes to the block-OWNED `padding`/`margin` attrs
				     (this block declares no supports.spacing, so there is NO
				     duplicate Styles > Dimensions panel); each attr holds
				     desktop, tablet and mobile, read by the wrapper's @media tiers. */ }
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
				</PanelBody>

				{ /* contentBandPadding is a TIER OBJECT — ONE attr holding
				     {desktop,tablet,mobile}, each tier itself a {top,right,bottom,left}
				     box. It therefore uses
				     ResponsiveOverride, which reads and writes the object, NOT the
				     flat-sibling ResponsiveBoxControl. Mirrors container's own
				     implementation. */ }
				<PanelBody title={ __( 'Band padding', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						value={ attributes.contentBandPadding }
						onChange={ ( obj ) => setAttributes( { contentBandPadding: obj } ) }
					>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Band padding', 'sgs-blocks' ) }
								values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
			</InspectorControls>

			{ /* Spread first, then state children explicitly: innerBlocksProps
			     CARRIES a `children` prop, so the SVG layer has to be composed
			     with it rather than added alongside the spread. */ }
			<div ref={ refEl } { ...innerBlocksProps }>
				{ svgLayer }
				{ innerBlocksProps.children }
			</div>
		</>
	);
}
