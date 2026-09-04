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
import { PanelBody, Notice, SelectControl, BoxControl } from '@wordpress/components';
// sgs/site-footer does not use <ContainerWrapperControls>'s
// ResponsiveSpacingPanel — its flat paddingTopTablet/…/marginLeftMobile
// attrs are LEGACY; paddingTablet/paddingMobile/marginTablet/marginMobile
// are box OBJECT attrs read by class-sgs-container-wrapper.php (matches
// sgs/container's + sgs/cta-section's own edit.js). Roll this block's own
// "Padding & margin" panel below using ResponsiveBoxControl bound to the
// object attrs.
import {
	WidthPanel,
	BackgroundPanel,
	ShapeDividersPanel,
	MIN_HEIGHT_OPTIONS,
} from '../container/components/ContainerWrapperControls';
import { ResponsiveBoxControl, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsColourPanel,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { backgroundPreview, spacingPreview } from '../../utils';
import { calculateRelativeLuminance, calculateContrastRatio, meetsWCAG_AA } from '../../utils/wcag-contrast';

const ALLOWED_BLOCKS = [ 'sgs/site-footer-row' ];

/**
 * ⛔ `templateMode` (the container-family allowed-children preset) was
 * declared in block.json but REMOVED (was never wired): this block's
 * allowedBlocks is ALREADY fixed to a single type — `sgs/site-footer-row` —
 * at the block.json level, enforced alongside a structural 3-row TEMPLATE
 * under `templateLock: 'all'` (see the seed-once guard below). Both
 * templateMode presets (grid-section/card-grid) list content blocks like
 * heading/text/button/info-box that this block can never accept anyway, so
 * neither preset could ever do anything. Same shape as physics-canvas: no
 * room for a variable content-type restriction on a block already locked to
 * one child type. Do not re-add templateMode here.
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
			// Columns are an operator-set COUNT (Spec 37 §3.3, Bean-locked): the
			// shared wrapper reads columns as a TIER OBJECT (Spec 35 pass 4,
			// class-sgs-container-wrapper.php) and stacks to the mobile tier's
			// count below 768. No gridTemplateColumns object is seeded — an
			// object there would flip $object_grid true and suppress the count
			// path. A per-device custom template stays available as an advanced
			// override (set gridTemplateColumns explicitly), never the default.
			// ⛔ Do NOT seed columns/columnsTablet/columnsMobile as flat siblings
			// here — sgs/site-footer-row's block.json no longer declares them
			// (Spec 35 pass 4), so WordPress would silently discard the seed
			// (D338/D563 bug class).
			columns: { desktop: 3, tablet: 3, mobile: 1 },
			// gap is a {desktop,tablet,mobile} object attr — a flat string would
			// be coerced to the block.json default at render (D328).
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
					[ 'sgs/heading', { level: 2 } ],
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
					[ 'sgs/heading', { level: 2 } ],
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
		// failure, just the wrong spacing (D328). `border` is a SUPPORT, not an attr,
		// so it must live under `style`, or WP discards it as an unknown attribute.
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
			style: { border: { top: { color: 'var:preset|color|accent', width: '1px' } } },
		},
		[
			[ 'sgs/business-info', { displayType: 'copyright' } ],
		],
	],
];

export default function Edit( { attributes, setAttributes, clientId, name } ) {
	// D717/background-preview: BackgroundPanel (mounted below) writes image/
	// video/overlay/ken-burns/parallax attrs this block never previewed on
	// canvas — the shared mirror (src/utils/background-preview.js, 2026-08-26)
	// fixes that the same way sgs/container already did.
	const [ colourPalette ] = useSettings( 'color.palette' );
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

	// Active device tier for the padding/margin preview below — this block had
	// no previewTier mechanism of its own, so this follows sgs/container's
	// getDeviceType read exactly (same source its own Layout panel writes).
	const previewTier = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device =
			ed && typeof ed.getDeviceType === 'function' ? ed.getDeviceType() : null;
		return { Tablet: 'tablet', Mobile: 'mobile' }[ device ] || 'desktop';
	}, [] );

	// Padding/margin canvas preview (measured live 2026-08-26: sibling blocks
	// showed 0px padding/margin on canvas against a real 120px/80px page).
	// Base padding + margin are now the block-OWNED `padding`/`margin`
	// object attrs (D555 gutter-default migration — no `supports.spacing`);
	// tablet/mobile overrides are the block-private paddingTablet/
	// paddingMobile/marginTablet/marginMobile object attrs (this block
	// declares all four — verified in block.json).
	const spacePreview = spacingPreview( {
		basePadding: attributes.padding,
		paddingTablet: attributes.paddingTablet,
		paddingMobile: attributes.paddingMobile,
		baseMargin: attributes.margin,
		marginTablet: attributes.marginTablet,
		marginMobile: attributes.marginMobile,
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

	const blockProps = useBlockProps( {
		className: [ 'sgs-site-footer', bgPreview.className ].filter( Boolean ).join( ' ' ),
		style: { ...bgPreview.style, ...spacePreview, ...layoutPreview },
	} );
	const refEl = useRef( null );

	// SGS-owned colour (D294/D684 pattern, mirrors sgs/site-header's already-
	// migrated shape) — supports.color sub-flags are false so WordPress
	// generates no native colour UI; these two attribute pairs (background +
	// text, each with a gradient sibling and a hover state) are the ONLY
	// colour surface for this block now.
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
	// Passing TEMPLATE unconditionally therefore overwrote every inserted starter
	// pattern: measured on the canary, 8/8 footer starters were corrupted (the
	// framework default included) — and it DESTROYED content, not just added it:
	// footer-centred's bottom row lost its copyright line, replaced by this
	// TEMPLATE's three empty link columns. It also fired on every re-open, so an
	// insert-only patch would not have held.
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

	// Check contrast ratio on attribute changes
	const [ contrastNotice, setContrastNotice ] = useState( null );

	// Reads block-private backgroundColour/textColour (SgsColourPanel, D294/
	// D684 pattern) — not WP-native style.color.background/.text, which this
	// block's supports.color sub-flags are all false for, so WordPress never
	// populates it and this check has never fired (check-undeclared-attrs
	// finding: `style` destructured but undeclared in block.json). Resolved
	// via resolveColourToken() the same way the paint itself is, since a
	// stored value can be a theme-token slug, not a literal colour.
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
			{ /* D294/D684 — ONE grouped, SGS-OWNED colour panel, rendered FIRST
			     (before any other same-group InspectorControls Fill) so it sits
			     at the top of the Styles tab. Replaces the native supports.color
			     UI (now fully disabled — supports.color sub-flags are false). */ }
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

			{ /* Background renders in the STYLES tab, not Settings (standardised
			     2026-08-16, Bean-ruled). Same shared panel, same tab, on every
			     wrapper block — it used to land in Settings here and in Styles on
			     cta-section/hero, so the client found it in a different place
			     depending on which block they had selected. Appearance sits with
			     colour, which D621/D622 already placed in Styles. */ }
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
							base: attributes.borderRadius ?? {},
							tablet: attributes.borderRadiusTablet ?? {},
							mobile: attributes.borderRadiusMobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const radiusKey = tier === 'base' ? 'borderRadius' : tier === 'tablet' ? 'borderRadiusTablet' : 'borderRadiusMobile';
							setAttributes( { [ radiusKey ]: next } );
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
				     effect, exactly the defect this change exists to remove.
				     block.json declares no `alignContent` attribute at all — the
				     shared wrapper only ever emits align-content in its GRID branch
				     (class-sgs-container-wrapper.php ~1297), never the flex one
				     (~1303-1361), so there was no CSS path for it while this block
				     renders flex-only (2026-09-03). Flex direction + Flex wrap ARE
				     genuinely honoured by that same flex branch, so they get real
				     controls + real canvas preview below (mirrors sgs/container's
				     own edit.js flex-branch preview, ~line 295-315). */ }
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
				     contract (.claude/plans/2026-07-09-box-object-interface-contract.md
				     §5). Base tier writes to the block-OWNED `padding`/`margin` attrs
				     (this block no longer declares supports.spacing, so there is NO
				     duplicate Styles > Dimensions panel); tablet/mobile write
				     to the paddingTablet/paddingMobile and marginTablet/marginMobile
				     object attrs read by the wrapper's @media tiers. */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
						values={ {
							base: attributes.padding ?? {},
							tablet: attributes.paddingTablet ?? {},
							mobile: attributes.paddingMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							// Breakpoint -> attr map, not a computed ternary key. This is
							// the canonical idiom (mirrors sgs/container's edit.js) that
							// check-control-ux.js recognises as delegated-to-shared-
							// component; a ternary inside a computed property key reads
							// to the gate as an unwrapped direct write.
							const attrFor = { base: 'padding', tablet: 'paddingTablet', mobile: 'paddingMobile' };
							setAttributes( { [ attrFor[ tier ] ]: next } );
						} }
					/>
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
						values={ {
							base: attributes.margin ?? {},
							tablet: attributes.marginTablet ?? {},
							mobile: attributes.marginMobile ?? {},
						} }
						onChange={ ( tier, next ) => {
							// Same canonical breakpoint -> attr map as Padding above.
							const attrFor = { base: 'margin', tablet: 'marginTablet', mobile: 'marginMobile' };
							setAttributes( { [ attrFor[ tier ] ]: next } );
						} }
					/>
				</PanelBody>

				{ /* contentBandPadding is a TIER OBJECT — ONE attr holding
				     {desktop,tablet,mobile}, each tier itself a {top,right,bottom,left}
				     box (Spec 35 box-shaped pass, 2026-08-11). It therefore uses
				     ResponsiveOverride, which reads and writes the object, NOT the
				     flat-sibling ResponsiveBoxControl. Mirrors container's own
				     implementation. */ }
				<PanelBody title={ __( 'Band padding', 'sgs-blocks' ) } initialOpen={ false }>
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
				</PanelBody>
			</InspectorControls>

			<div ref={ refEl } { ...innerBlocksProps } />
		</>
	);
}
