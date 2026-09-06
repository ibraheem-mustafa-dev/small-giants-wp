import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl, Notice, BoxControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { ResponsiveBoxControl, ResponsiveOverride, ShadowControl, SgsColourPanel, fillRow, BOX_UNITS, normaliseResponsiveBox, SgsBorderControl, resolveColourToken, SgsBoxControl } from '../../components';
import { backgroundPreview, spacingPreview, svgBackgroundPreview } from '../../utils';
// Reused directly rather than duplicated (Spec 35 Part B / composite-mirror rule,
// D152): physics-canvas KEEPS SGS_Container_Wrapper (containerKind: 'section'), so
// its box + width controls must be the SAME shape sgs/container itself exposes —
// WidthPanel already handles maxWidth/contentWidth + their Tablet/Mobile tiers,
// MIN_HEIGHT_OPTIONS is the shared preset list for the min-height SelectControl
// (mirrors trust-bar's "Section (outer)" panel exactly).
import { WidthPanel, MIN_HEIGHT_OPTIONS, BackgroundPanel } from '../container/components/ContainerWrapperControls';

// Semantic HTML tag (mirrors sgs/container's edit.js exactly — must match the
// block.json `tagName` enum here and render.php's sanitize_key() default).
const TAG_NAME_OPTIONS = [
	{ label: __( 'Section (default)', 'sgs-blocks' ), value: 'section' },
	{ label: __( 'Div (no semantics)', 'sgs-blocks' ), value: 'div' },
	{ label: __( 'Article (self-contained)', 'sgs-blocks' ), value: 'article' },
	{ label: __( 'Aside (complementary)', 'sgs-blocks' ), value: 'aside' },
	{ label: __( 'Nav (navigation)', 'sgs-blocks' ), value: 'nav' },
	{ label: __( 'Header', 'sgs-blocks' ), value: 'header' },
	{ label: __( 'Footer', 'sgs-blocks' ), value: 'footer' },
	{ label: __( 'Figure', 'sgs-blocks' ), value: 'figure' },
];

/**
 * DECORATIVE-ONLY roster (Spec 38 FR-38-27 / D447). Every entry here renders
 * with no operable control and no must-read body copy, which is what
 * dissolves WCAG 2.5.7 for this block: nothing a user must reach is ever
 * throwable, so no discrete single-pointer alternative is owed. Do NOT add a
 * block that can carry a link, button, form field, or primary body copy —
 * if you find yourself reaching for one, that is this constraint firing as
 * intended, not a gap to patch.
 */
const ALLOWED_BLOCKS = [
	'core/image',
	'sgs/media',
	'sgs/icon',
	'sgs/decorative-image',
];

/**
 * ⛔ `templateMode` (free/grid-section/card-grid, the container-family
 * allowed-children preset) was declared in block.json but never wired here —
 * REMOVED from block.json rather than wired. This block's children are
 * already fixed to the 4-item decorative-only roster above (D447), and both
 * templateMode presets would ADD heading/text/button/info-box/card-grid —
 * exactly the operable/must-read content D447 exists to exclude (a thrown
 * body has no discrete single-pointer alternative under WCAG 2.5.7). There
 * is no room for a variable content-type restriction alongside a fixed
 * accessibility restriction; do not re-add templateMode here.
 */

export default function Edit( { attributes, setAttributes, name } ) {
	const { physicsGravity, physicsBounce, physicsEdgeResistance, backgroundColour, backgroundColourGradient } = attributes;

	// D717/background-preview: BackgroundPanel (mounted below) writes image/
	// video/overlay/ken-burns/parallax attrs this block never previewed on
	// canvas — the shared mirror (src/utils/background-preview.js, 2026-08-26)
	// fixes that the same way sgs/container already did.
	const [ colourPalette ] = useSettings( 'color.palette' );
	// Decorative SVG background layer — editor mirror (2026-09-05). Sibling of
	// backgroundPreview() below, deliberately NOT folded into it: that helper
	// paints via `--sgs-ed-bg-*` custom properties on a ::before, whereas the
	// SVG layer is a real element whose painting rules already ship in the
	// block's style.css (loaded in the canvas via block.json `style`). See
	// svgBackgroundPreview()'s own docblock. Attributes are enumerated
	// EXPLICITLY — check-editor-render-parity.js (CHECK A) resolves an
	// attribute as canvas-reflected only when its NAME appears outside the
	// Inspector panels, so a whole-object hand-off would render correctly but
	// still read as a desync.
	const svgPreview = svgBackgroundPreview( {
		bgSvgContent: attributes.bgSvgContent,
		bgSvgPosition: attributes.bgSvgPosition,
		bgSvgAnimation: attributes.bgSvgAnimation,
		bgSvgAnimationSpeed: attributes.bgSvgAnimationSpeed,
		bgSvgOpacity: attributes.bgSvgOpacity,
		bgSvgMinHeight: attributes.bgSvgMinHeight,
		bgSvgTextShadow: attributes.bgSvgTextShadow,
	} );

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

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the physics-canvas's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const physicsCanvasContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	const blockProps = useBlockProps( {
		className: [ bgPreview.className, ...svgPreview.className ].filter( Boolean ).join( ' ' ),
		style: { ...bgPreview.style, ...svgPreview.style, ...spacePreview },
	} );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		templateLock: false,
		renderAppender: undefined,
	} );

	// Mirrors class-sgs-container-wrapper.php:2794-2798. `aria-hidden` matches
	// the server; `pointer-events:none` is editor-only insurance so the
	// decorative layer can never swallow a click meant for the block or its
	// children. Rendered as a direct child of the block ROOT — never inside
	// the thrown-item canvas, which the physics engine owns.
	const svgLayer = svgPreview.hasSvg ? (
		<div
			className="sgs-container__svg-bg"
			aria-hidden="true"
			style={ { pointerEvents: 'none' } }
			dangerouslySetInnerHTML={ { __html: svgPreview.markup } }
		/>
	) : null;

	return (
		<>
			{ /* D635-pattern migration: native Background colour panel replaced by the
			    flat backgroundColour attr surfaced via the shared SgsColourPanel. No
			    Text colour row — every allowed child is decorative/non-textual and
			    sgs/icon always sets its own explicit colour, so inherited `color` never
			    painted anything visible on this block (see block.json's element note).
			    Background row is now the FILL variant (fillRow) — gradient + hover
			    moved off the native panel (supports.color.gradients was true,
			    competing with this SGS panel) onto block-private backgroundColour{
			    Hover,Gradient,HoverGradient} attrs, so capability is moved rather
			    than lost. */ }
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							hover: 'backgroundColourHover',
							gradient: 'backgroundColourGradient',
							hoverGradient: 'backgroundColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
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
						contrastAgainst={ physicsCanvasContrastAgainst }
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
				<PanelBody
					title={ __( 'Physics', 'sgs-blocks' ) }
					initialOpen={ true }
				>
					<Notice status="info" isDismissible={ false }>
						{ __(
							"Physics run on the live site only — the editor always shows the resting layout. Under a visitor's reduced-motion setting, physics turn off and every body stays put where you placed it.",
							'sgs-blocks'
						) }
					</Notice>
					<RangeControl
						label={ __( 'Gravity', 'sgs-blocks' ) }
						help={ __(
							'How fast a thrown body falls once released.',
							'sgs-blocks'
						) }
						value={ physicsGravity }
						onChange={ ( value ) =>
							setAttributes( { physicsGravity: value } )
						}
						min={ 0 }
						max={ 4000 }
						step={ 50 }
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Bounce', 'sgs-blocks' ) }
						help={ __(
							'How much energy a body keeps when it hits the edge of the canvas.',
							'sgs-blocks'
						) }
						value={ physicsBounce }
						onChange={ ( value ) =>
							setAttributes( { physicsBounce: value } )
						}
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Drag resistance', 'sgs-blocks' ) }
						help={ __(
							'How firmly the canvas edge resists a body being dragged past it.',
							'sgs-blocks'
						) }
						value={ physicsEdgeResistance }
						onChange={ ( value ) =>
							setAttributes( { physicsEdgeResistance: value } )
						}
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
						__next40pxDefaultSize
					/>
				</PanelBody>

				{ /* ── Section (outer): width + min-height ────────────────────
				     Same shape as sgs/container / sgs/trust-bar's own "Section
				     (outer)" panel (composite-mirror rule, D152) — this is the
				     resizable arena box: minHeight ships defaults (480px desktop /
				     320px mobile) with no control until now, so a client could
				     never resize the throw arena at all. */ }
				<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'HTML tag', 'sgs-blocks' ) }
						value={ attributes.tagName || 'section' }
						options={ TAG_NAME_OPTIONS }
						onChange={ ( val ) => setAttributes( { tagName: val } ) }
						help={ __( 'Semantic tag for accessibility landmarks and SEO. Use Nav / Aside / Article for their meaning; Div for a plain wrapper.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<hr style={ { margin: '16px 0' } } />
					<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
					{ /*
						  `minHeight` is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass), same shape as
						  `gridTemplateColumns` in ContainerWrapperControls.
						  `minHeightTablet`/`…Mobile` are no longer declared in
						  block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Min height', 'sgs-blocks' ) }
						value={ attributes.minHeight }
						onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ MIN_HEIGHT_OPTIONS }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ tier === 'desktop'
									? __( 'Desktop / base. Tablet and mobile override it at narrower widths.', 'sgs-blocks' )
									: undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>

				{ /* ── Padding & margin (box-object tiers) — base tier writes to the
				     block-OWNED `padding`/`margin` attrs; tablet/mobile write to the
				     paddingTablet/paddingMobile + marginTablet/marginMobile object
				     attrs the wrapper's @media tiers read. Mirrors sgs/container's
				     and sgs/trust-bar's own edit.js exactly. ────────────────── */ }
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

				{ /* ── Content band (Layer 2 __inner) — this band IS the physics
				     arena (block.json's own note); its rendered box is what view.js
				     reads as Draggable's bounds and the Physics2D floor/wall
				     geometry, so band padding/background here directly changes the
				     playable area, not just decoration. ─────────────────────── */ }
				<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __( 'Styles the inner content band — the throw arena itself (the max-width wrapper set by Content width). Only active when Content width is set.', 'sgs-blocks' ) }
					</p>
					{ /* ⛔ "Band background colour" (contentBandBackground) REMOVED
						2026-08-12, attribute retired framework-wide — a background
						fills its CONTAINER's max-width and is never clipped to the
						inner content layer (Bean-ruled). Use BackgroundPanel on the
						block itself (mounted below, after Padding & margin — mirrors
						sgs/hero's ordering) — added 2026-08-16, wrapper decomposition
						step 6 (D626/D633): physics-canvas is the one wrapper block that
						had no background capability at all. Do NOT re-add a
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

				{ /* Background (image/video/overlay/SVG/animation) — same shared
				     component + attrs as sgs/container, sgs/hero, sgs/site-footer
				     (ContainerWrapperControls.js's BackgroundPanel). Gated on
				     `name` via `supports.sgs.enabledExtensions: ['background']`
				     (block.json) — new capability for this block, added 2026-08-16
				     (wrapper decomposition step 6, D626/D633): physics-canvas
				     previously mounted WidthPanel only. Sits BEHIND the throwable
				     children in paint order (SGS_Container_Wrapper renders the
				     background layer on the outer wrapper, the arena/__inner band
				     on top) so it cannot intercept pointer events on the physics
				     bodies — verified against class-sgs-container-wrapper.php's
				     wrapper markup order before wiring this in. */ }

				{ /* ── Shadow — legacy string token attr (sm/md/lg/glow OR a raw
				     box-shadow CSS string built by ShadowControl), resolved by
				     sgs_shadow_value(). ──────────────────────────────────────── */ }

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
			</InspectorControls>
			<div { ...innerBlocksProps }>
				{ svgLayer }
				<p className="wp-block-sgs-physics-canvas__editor-notice">
					{ __(
						'Decorative content only — images, media and icons. No links, buttons or body text (they would have no keyboard/reduced-motion alternative once thrown).',
						'sgs-blocks'
					) }
				</p>
				{ innerBlocksProps.children }
			</div>
		</>
	);
}
