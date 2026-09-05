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
	TextControl,
	Button,
	RangeControl,
	BoxControl,
	ToggleControl,
} from '@wordpress/components';
import MediaPicker from '../../components/MediaPicker';
import { resolveShadowPreviewComposed } from '../../utils/tokens';
import { backgroundPreview, svgBackgroundPreview, applyGridLayoutPreview } from '../../utils';
import { ResponsiveBoxControl, ResponsiveOverride, ShadowControl, SgsColourPanel, BOX_UNITS, normaliseResponsiveBox,
	SgsBorderControl,
	resolveColourToken,
	TypographyControls,
} from '../../components';
// No-inline migration (2026-07-09): cta-section no longer uses the default
// <ContainerWrapperControls> aggregator wholesale — its ResponsiveSpacingPanel /
// ContentBandPanel sub-panels still write to LEGACY FLAT attrs
// (paddingTopTablet.../contentBandPaddingTop...), which became dead controls once
// paddingTablet/paddingMobile/marginTablet/marginMobile/contentBandPadding* became
// box OBJECT attrs (matches sgs/container's own edit.js, which took the same
// approach). Import the individual panels still needed instead, and roll cta-section's
// own "Padding & margin" / "Content band" panels below using ResponsiveBoxControl
// bound to the new object attrs.
import {
	WidthPanel,
	LayoutPanel,
	BackgroundPanel,
	ShapeDividersPanel,
	MIN_HEIGHT_OPTIONS,
} from '../container/components/ContainerWrapperControls';
// GridItemDefaultsPanel deliberately NOT imported — see the withdrawal note
// beside its former mount point below (D-pending, 2026-08-30). This block
// never renders a direct-child `.sgs-container` element, so the panel's
// `--sgs-gi-*` custom properties have no CSS consumer here.

// FR-22-6: the content column is now InnerBlocks — heading + body text + buttons.
// Headline/body are no longer scalar attrs read by render.php; they are authored
// directly as child sgs/heading + sgs/text blocks. The body sgs/text carries the
// .sgs-cta-section__body class so the responsive font-size <style> still targets it.
const CTA_TEMPLATE = [
	[ 'sgs/heading', { level: 'h2', className: 'sgs-cta-section__headline' } ],
	[ 'sgs/text', { className: 'sgs-cta-section__body' } ],
	[
		'sgs/multi-button',
		{},
		[
			[
				'sgs/button',
				{ inheritStyle: 'primary', label: 'Primary Action' },
			],
			[
				'sgs/button',
				{ inheritStyle: 'secondary', label: 'Secondary Action' },
			],
		],
	],
];

// `templateMode` (grid-section/card-grid presets) was removed from block.json —
// the content column already restricts children to this fixed, more specific
// list below; a generic preset would only conflict with it.
const CTA_ALLOWED_BLOCKS = [ 'sgs/heading', 'sgs/text', 'sgs/multi-button' ];

const LAYOUT_OPTIONS = [
	{ label: __( 'Centred', 'sgs-blocks' ), value: 'centred' },
	{ label: __( 'Left-aligned', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
];

// Mirrors sgs/heading's TEXT_ALIGN_OPTIONS — the bare `textAlign` attribute
// replaces the retired native "Align text" toolbar control (D971/D972).
const TEXT_ALIGN_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Justify', 'sgs-blocks' ), value: 'justify' },
];

// Mirrors sgs/team-member's EASING_OPTIONS (built 2026-09-03) — kept as a
// separate literal per-block rather than a shared import; no shared constant
// exists for this yet.
const EASING_OPTIONS = [
	{ label: __( 'Ease in-out', 'sgs-blocks' ), value: 'ease-in-out' },
	{ label: __( 'Ease', 'sgs-blocks' ), value: 'ease' },
	{ label: __( 'Ease in', 'sgs-blocks' ), value: 'ease-in' },
	{ label: __( 'Ease out', 'sgs-blocks' ), value: 'ease-out' },
	{ label: __( 'Linear', 'sgs-blocks' ), value: 'linear' },
];

export default function Edit( { attributes, setAttributes, name } ) {
	const {
		ribbon,
		layout, // legacy (pre-WS-4) — now the container grid/flex attr; read for old-post fallback only
		contentLayout,
		backgroundImage,
		backgroundMedia,
		backgroundImageOpacity,
		backgroundImageDecorative,
		gradientPreset,
		stats,
		backgroundColour,
	} = attributes;

	// WS-4: cta-section's own layout (centred/left/split) renamed to `contentLayout`
	// (the container owns `layout` = grid/flex). Fall back to the legacy value so
	// old posts render correctly in the editor before they round-trip.
	const ctaLayout = contentLayout || layout || 'centred';

	// Hydrate the active media from the new unified slot first, falling back to
	// the legacy backgroundImage object for posts that have not yet round-tripped
	// through the editor.
	const resolveActiveMedia = () => {
		if ( backgroundMedia && backgroundMedia.url ) {
			return backgroundMedia;
		}
		if ( backgroundImage && backgroundImage.url ) {
			return {
				url: backgroundImage.url,
				type: 'image',
				id: backgroundImage.id || 0,
				alt: backgroundImage.alt || '',
				mime: 'image/jpeg',
			};
		}
		return null;
	};
	const activeMedia = resolveActiveMedia();

	// D288/D636: colours are stored as theme-token SLUGS or a custom hex —
	// resolved the same way sgs/container's editor preview does
	// (resolveColourToken against the live palette), so backgroundPreview()'s
	// overlay-colour mirror below actually shows on canvas.
	const [ colourPalette ] = useSettings( 'color.palette' );

	// Editor-canvas mirror for the shared whole-block BACKGROUND PANEL family —
	// backgroundRepeat / backgroundAttachment / bgVideo / backgroundOverlayBlendMode
	// + siblings (background image/size/position, ken-burns, parallax, overlay
	// colour/gradient/opacity). This is a SEPARATE background system from
	// cta-section's OWN image/video slot above (backgroundMedia/backgroundImage,
	// resolved into `activeMedia` and painted directly on the block root a few
	// lines below) — see block.json's "_comment_overlayNotAdopted" note:
	// backgroundImage/Size/Position/Repeat/Attachment, backgroundOverlay*,
	// bgVideo*/bgSvg*/bgParallax/bgKenBurns are the shared whole-block BACKGROUND
	// PANEL, rendered server-side by SGS_Container_Wrapper's sgs_overlay_decls()
	// (class-sgs-container-wrapper.php) via render.php's `$cta_helper_attrs`
	// hand-off (`backgroundImage` is nulled there to avoid double-rendering this
	// block's own image slot; `bgVideo` is NOT nulled, so it renders through this
	// shared mechanism for real, distinct from the `activeMedia` video path).
	// Same `backgroundPreview()` mirror as sgs/container's edit.js (the worked
	// reference). Attributes enumerated EXPLICITLY, same reasoning as svgPreview
	// below.
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

	// Decorative SVG background layer — editor-canvas mirror (2026-09-05), the
	// same integration sgs/container carries (its edit.js is the worked
	// reference). cta-section hands its FULL attribute set to
	// SGS_Container_Wrapper::render() at the foot of render.php, so the wrapper
	// paints this family on the frontend (class-sgs-container-wrapper.php:975 /
	// :1634-1641 / :2794-2802) while the canvas showed nothing at all.
	//
	// Attributes are enumerated EXPLICITLY rather than passing `attributes`
	// wholesale: it documents exactly which attrs this mirror reads, and
	// check-editor-render-parity.js (CHECK A) resolves an attribute as
	// canvas-reflected only when its NAME appears outside the Inspector panels,
	// so a whole-object hand-off renders correctly but still reads as a desync.
	const svgPreview = svgBackgroundPreview( {
		bgSvgContent: attributes.bgSvgContent,
		bgSvgPosition: attributes.bgSvgPosition,
		bgSvgAnimation: attributes.bgSvgAnimation,
		bgSvgAnimationSpeed: attributes.bgSvgAnimationSpeed,
		bgSvgOpacity: attributes.bgSvgOpacity,
		bgSvgMinHeight: attributes.bgSvgMinHeight,
		bgSvgTextShadow: attributes.bgSvgTextShadow,
	} );

	// NOTE the SPREAD on svgPreview.className. `backgroundPreview()` returns its
	// className as a STRING, but `svgBackgroundPreview()` returns a string ARRAY
	// (see its @return) — spreading the array (not nesting it) mirrors
	// sgs/container's exact `editorClassName` line, the worked reference. Nesting
	// it (`[a, b].join(' ')` on an unspread array) stringifies with COMMAS and
	// silently drops the SVG marker classes — caught live on sgs/container
	// 2026-09-05, see this block's own utils/background-preview.js docblock.
	const className = [
		'sgs-cta-section',
		`sgs-cta-section--${ ctaLayout }`,
		gradientPreset ? `sgs-cta-section--gradient-${ gradientPreset }` : '',
		bgPreview.className,
		...svgPreview.className,
	]
		.filter( Boolean )
		.join( ' ' );

	// `bgPreview.style` carries the shared background/overlay/ken-burns custom
	// properties (painted via the `sgs-ed-*` marker classes above, in the shared
	// editor stylesheet); `svgPreview.style` carries --sgs-svg-opacity (+
	// --sgs-svg-min-height when set) — the painting rules for both already ship
	// in sgs/container's style.css, which block.json loads into the canvas.
	// `activeMedia`'s own literal backgroundImage/backgroundSize/backgroundPosition
	// below are cta-section's OWN image slot (a separate mechanism — see the
	// bgPreview comment above) and always win when set, since bgPreview never
	// writes those same literal keys (it writes `--sgs-ed-bg-*` custom properties
	// instead).
	const wrapperStyle = { ...bgPreview.style, ...svgPreview.style };
	if ( activeMedia && activeMedia.type === 'image' && activeMedia.url ) {
		wrapperStyle.backgroundImage = `url(${ activeMedia.url })`;
		wrapperStyle.backgroundSize = 'cover';
		wrapperStyle.backgroundPosition = 'center';
	}

	// Grid/flex/stack layout preview — shared with every other block routed
	// through SGS_Container_Wrapper::render() via `applyGridLayoutPreview()`
	// (`src/utils/grid-layout-preview.js`). Mutates `wrapperStyle` in place.
	// `layout` here is cta-section's CONTAINER grid/flex/stack attribute (the
	// "Layout (grid/flex)" panel below writes to it) — NOT `ctaLayout`/
	// `contentLayout`, cta-section's own centred/left/split content arrangement.
	// render.php confirms this: `$cta_helper_attrs = $attributes` is handed to
	// SGS_Container_Wrapper::render() unchanged, so the wrapper reads
	// `$attributes['layout']` directly for grid/flex/stack, exactly as
	// sgs/container does for its own `layout` attribute.
	applyGridLayoutPreview( wrapperStyle, {
		layout: attributes.layout,
		alignItems: attributes.alignItems,
		justifyItems: attributes.justifyItems,
		alignContent: attributes.alignContent,
		gridAutoRows: attributes.gridAutoRows,
		gridTemplateColumns: attributes.gridTemplateColumns,
		columns: attributes.columns,
		flexDirection: attributes.flexDirection,
		flexWrap: attributes.flexWrap,
		justifyContent: attributes.justifyContent,
	} );
	// Editor-canvas parity for cta-section's OWN scoped shadow (rendered
	// independent of the shared wrapper — see render.php's C3 guard). Shape
	// (`shadow`) + colour (`shadowColour`) are separate attrs since D621/D622;
	// the composed resolver mirrors sgs_shadow_value_composed() in PHP.
	const shadowPreview = resolveShadowPreviewComposed( attributes.shadow, attributes.shadowColour );
	if ( shadowPreview ) {
		wrapperStyle.boxShadow = shadowPreview;
	}

	// Spec 35 item 18 — mirrors render.php's role="img"/aria-label logic so the
	// editor canvas reflects the same accessible-name decision the frontend
	// makes (canvas/frontend parity, check-simple-surface-cap CHECK A).
	const bgImageA11yProps =
		activeMedia &&
		activeMedia.type === 'image' &&
		! ( backgroundImageDecorative ?? true ) &&
		activeMedia.alt
			? { role: 'img', 'aria-label': activeMedia.alt }
			: {};

	const blockProps = useBlockProps( {
		className,
		style: wrapperStyle,
		...bgImageA11yProps,
	} );

	// The content column hosts the InnerBlocks (heading + body + buttons),
	// mirroring the render.php <div class="sgs-cta-section__content"> wrapper.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-cta-section__content' },
		{
			template: CTA_TEMPLATE,
			templateLock: false,
			allowedBlocks: CTA_ALLOWED_BLOCKS,
		}
	);

	const addStat = () => {
		setAttributes( {
			stats: [ ...stats, { text: '' } ],
		} );
	};

	const updateStat = ( index, text ) => {
		const updated = [ ...stats ];
		updated[ index ] = { text };
		setAttributes( { stats: updated } );
	};

	const removeStat = ( index ) => {
		setAttributes( {
			stats: stats.filter( ( _, i ) => i !== index ),
		} );
	};

	// Contrast check for border colour against the CTA section's own background.
	// Note: cta-section has no backgroundColourGradient sibling (see block.json comment),
	// so we check only the flat backgroundColour value.
	const ctaSectionContrastAgainst = backgroundColour || '';

	// Mirrors class-sgs-container-wrapper.php:2794-2798. `aria-hidden` matches
	// the server; `pointer-events:none` is editor-only insurance so the
	// decorative layer can never swallow a click meant for the block or its
	// children. Rendered as the FIRST child of the block's own root element so
	// the existing `.sgs-container__svg-bg` rules (loaded in the canvas) paint
	// it; foreground vs background stacking is handled by the marker class on
	// the root, exactly as on the frontend.
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
			{ /* Settings tab — behaviour: content-authoring choices (content-column
				arrangement, ribbon text) and the stats/social-proof text repeater. */ }
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Content layout', 'sgs-blocks' ) }
						value={ ctaLayout }
						options={ LAYOUT_OPTIONS }
						onChange={ ( val ) => setAttributes( { contentLayout: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Ribbon label', 'sgs-blocks' ) }
						help={ __(
							'Optional floating badge shown top-right of the CTA box. Leave blank to hide.',
							'sgs-blocks'
						) }
						value={ ribbon || '' }
						onChange={ ( val ) => setAttributes( { ribbon: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
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

				<PanelBody
					title={ __( 'Stats / Social Proof', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					{ stats.map( ( stat, index ) => (
						<div
							key={ index }
							style={ {
								display: 'flex',
								gap: '8px',
								marginBottom: '8px',
							} }
						>
							<TextControl
								value={ stat.text || '' }
								onChange={ ( val ) => updateStat( index, val ) }
								placeholder={ __(
									'e.g., Trusted by 5,000+ businesses',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<Button
								icon="trash"
								isDestructive
								onClick={ () => removeStat( index ) }
								size="small"
							/>
						</div>
					) ) }
					<Button variant="secondary" onClick={ addStat }>
						{ __( 'Add stat', 'sgs-blocks' ) }
					</Button>
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
						contrastAgainst={ ctaSectionContrastAgainst }
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

			{ /* D621/D622 — shadow colour split out of the legacy `shadow` shape
				attribute into its own SgsColourPanel row, mounted BEFORE the
				group="styles" block below so it renders first in the Styles tab. */ }
			<SgsColourPanel
				rows={ [
					{
						/* Root TEXT colour (`textColour`/`textColourHover` + gradient siblings).
						   Per D713 a section-class block's root text colour is the INHERITABLE cascade
						   default for whatever the client nests inside; a child's own control overrides
						   it for one instance. `supports.color.text` is OFF so WordPress's native
						   colour UI does not compete with this row (rule 31). */
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.textColour,
								onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: attributes.textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								gradientValue: attributes.textColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						/* Root BACKGROUND colour (`backgroundColour`, default 'accent') — a
						   palette-slug-only control mirroring sgs/hero / sgs/quote's own
						   backgroundColour row. render.php never emits inline CSS for this
						   value; it re-adds the native `has-background`/`has-{slug}-
						   background-color` classes (color support is skip-serialised) so
						   the theme's own preset CSS paints it — see render.php's
						   `$cta_preset_bg_slug` block. No gradient sibling: unlike
						   sgs/quote, this block does not declare `backgroundColourGradient`.
						   `backgroundColourHover` (render.php:80/214-215) has no gradient
						   sibling either — the hover state below is a plain colour swap. */
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.backgroundColour,
								onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.backgroundColourHover,
								onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					attributes.shadow && {
						key: 'shadow',
						label: __( 'Shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributes.shadowColour,
								onChange: ( val ) => setAttributes( { shadowColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.shadowColourHover,
								onChange: ( val ) => setAttributes( { shadowColourHover: val ?? '' } ),
								linked: true,
							},
						],
					},
					{
						key: 'hover-border',
						label: __( 'Hover border colour', 'sgs-blocks' ),
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes.borderColourHover,
								onChange: ( val ) => setAttributes( { borderColourHover: val ?? '' } ),
								linked: true,
								gradientValue: attributes.borderColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { borderColourHoverGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>

			{ /* Styles tab — appearance: section width/spacing, content band look, grid/flex
				geometry, background, shadow and shape dividers. WS-4: mirrored sgs/container
				wrapper controls (section kind) — individual panels rather than the
				<ContainerWrapperControls> aggregator (its ResponsiveSpacingPanel /
				ContentBandPanel sub-panels still write LEGACY FLAT attrs; see the
				top-of-file import comment). */ }
			<InspectorControls group="styles">
				{ /* Background (image/video/svg tabs + ken-burns/parallax) — root-level
					appearance, kept first in the Styles tab (mirrors sgs/container). */ }
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />

				{ /* Typography (D971/D972 full-replacement track, oracle: sgs/accordion) —
					root prefix '' (fontSize/fontWeight/fontStyle/lineHeight/letterSpacing/
					textTransform), emitted server-side by sgs_typography_css_rule() onto the
					block ROOT selector (see render.php's typography comment). The bare
					`textAlign` attribute replaces the retired native "Align text" toolbar
					control (rule 45-typography-full-replacement flags ANY real native
					typography sub-flag, including textAlign) — mirrors sgs/heading's plain
					SelectControl pattern rather than a toolbar button. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
						showSize={ true }
						showWeight={ true }
						showStyle={ true }
						showLineHeight={ true }
						showLetterSpacing={ true }
						showTransform={ true }
						showResponsive={ true }
					/>
					<SelectControl
						label={ __( 'Text align', 'sgs-blocks' ) }
						value={ attributes.textAlign || '' }
						options={ TEXT_ALIGN_OPTIONS }
						onChange={ ( val ) => setAttributes( { textAlign: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<PanelBody title={ __( 'Section (outer)', 'sgs-blocks' ) }>
					<WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
					{ /*
					   Min-height: declared + painted by the shared wrapper (this block
					   renders kind='section'), but it had NO control until 2026-08-15 —
					   a client could not set it while sgs/container, sgs/hero,
					   sgs/physics-canvas and sgs/trust-bar all could.
					   `minHeight` is OBJECT-typed ({desktop,tablet,mobile}), so this uses
					   ResponsiveOverride — NOT the flat-sibling ResponsiveControl. A flat
					   value written to an object attr is silently coerced to the default
					   and the client's setting vanishes. Mirrors site-footer/edit.js:298.
					*/ }
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

				{ /* Responsive spacing (padding + margin) — box-object interface contract
					(.claude/plans/2026-07-09-box-object-interface-contract.md §5). Base tier
					writes to the WP-native style.spacing object (also visible in the Styles >
					Dimensions panel); tablet/mobile write to the paddingTablet/paddingMobile
					and marginTablet/marginMobile object attrs read by the wrapper's @media tiers. */ }
				<PanelBody title={ __( 'Padding & margin', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveBoxControl
						label={ __( 'Padding', 'sgs-blocks' ) }
						presets
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
					<hr style={ { margin: '16px 0' } } />
					<ResponsiveBoxControl
						label={ __( 'Margin', 'sgs-blocks' ) }
						presets
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

				{ /* Content band (Layer 2 __inner) padding — per-area object attr (contract §2),
					not a WP-native attr since the band is an SGS-only inner element. */ }
				<PanelBody title={ __( 'Content band', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help">
						{ __(
							'Styles the inner content band (the max-width wrapper set by Content width). Only active when Content width is set.',
							'sgs-blocks'
						) }
					</p>
					{ /* ⛔ "Band background colour" (contentBandBackground) REMOVED
						2026-08-12, attribute retired framework-wide — a background
						fills its CONTAINER's max-width and is never clipped to the
						inner content layer (Bean-ruled). Use BackgroundPanel on the
						block itself. Do NOT re-add a band-scoped background. */ }
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

				<PanelBody title={ __( 'Layout (grid/flex)', 'sgs-blocks' ) } initialOpen={ false }>
					<LayoutPanel attributes={ attributes } setAttributes={ setAttributes } />
				</PanelBody>

				{ /* GridItemDefaultsPanel WITHDRAWN (2026-08-30) — verified defect: the
				     ONLY CSS consumer of --sgs-gi-* is `.sgs-container--grid >
				     .sgs-container` (container/style.css:8-15), a DIRECT-CHILD
				     selector requiring the child to itself carry class
				     `.sgs-container`. This block wraps its InnerBlocks content in
				     `<div class="sgs-cta-section__content">` (render.php:550), never
				     `.sgs-container`, so the selector can never match here. The panel
				     rendered ~15 client-facing controls that painted nothing. The 15
				     gridItem* attrs stay DECLARED in block.json (removing them is a
				     stored-content migration risk, out of scope for this fix) — this
				     only withdraws the dead UI. See sibling withdrawal in
				     trust-bar/edit.js for the same defect + fix shape. */ }

				{ /* Shadow — SHAPE-only string token attr (sm/md/lg/glow preset slug OR
					a raw box-shadow shape string, no colour — colour lives in the
					SgsColourPanel row above per D621/D622); the dead native `shadow`
					support duplicate was removed outright. Rendered scoped, not inline,
					via sgs_shadow_value_composed() — Spec 35 T2.2. */ }
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

				{ /* Transition duration/easing — governs the hover colour shifts wired
					above (backgroundColourHover/textColourHover/borderColourHover) via
					sgs_transition_vars() (render.php:116). Plain PanelBody, matching this
					block's own house style — NOT team-member's ToolsPanel wrapper (this
					block has no existing Hover/Transition panel to extend). */ }
				<PanelBody title={ __( 'Transition', 'sgs-blocks' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ parseInt( attributes.transitionDuration, 10 ) || 300 }
						onChange={ ( val ) =>
							setAttributes( { transitionDuration: String( val ) } )
						}
						min={ 0 }
						max={ 1000 }
						step={ 50 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Transition easing', 'sgs-blocks' ) }
						value={ attributes.transitionEasing }
						options={ EASING_OPTIONS }
						onChange={ ( val ) => setAttributes( { transitionEasing: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>

				<ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

				<PanelBody
					title={ __( 'Background', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Gradient preset', 'sgs-blocks' ) }
						value={ gradientPreset || '' }
						options={ [
							{ label: __( 'None', 'sgs-blocks' ), value: '' },
							{
								label: __( 'Primary fade', 'sgs-blocks' ),
								value: 'primary-fade',
							},
							{
								label: __( 'Accent glow', 'sgs-blocks' ),
								value: 'accent-glow',
							},
							{
								label: __( 'Dark radial', 'sgs-blocks' ),
								value: 'dark-radial',
							},
							{
								label: __( 'Mesh soft', 'sgs-blocks' ),
								value: 'mesh-soft',
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { gradientPreset: val } )
						}
						help={ __(
							'Gradient overrides the solid background colour when set.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<MediaPicker
						value={ activeMedia }
						onChange={ ( media ) => {
							// Write the unified slot. Mirror image-only selections into the
							// legacy attribute so older render paths (and any back-compat
							// consumer) still see the same URL until they migrate.
							if ( media && media.type === 'image' ) {
								setAttributes( {
									backgroundMedia: media,
									backgroundImage: {
										id: media.id,
										url: media.url,
										alt: media.alt,
									},
								} );
							} else {
								// Video (or null) — clear the legacy image attribute so the
								// legacy <img>/CSS background path does not double-render.
								setAttributes( {
									backgroundMedia: media,
									backgroundImage: null,
								} );
							}
						} }
						onRemove={ () =>
							setAttributes( {
								backgroundMedia: null,
								backgroundImage: null,
							} )
						}
						label={ __( 'Select background media', 'sgs-blocks' ) }
						instructionsImage={ __(
							'Choose an image or video for the CTA background',
							'sgs-blocks'
						) }
					/>
					<RangeControl
						label={ __( 'Image opacity (%)', 'sgs-blocks' ) }
						value={ backgroundImageOpacity }
						onChange={ ( val ) =>
							setAttributes( {
								backgroundImageOpacity: val,
							} )
						}
						min={ 0 }
						max={ 100 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ activeMedia && activeMedia.type === 'image' && (
						<>
							{ /* Spec 35 item 18 — see block.json's own comment on
							     backgroundImageDecorative. Default true matches this
							     image's existing behaviour (it paints as a CSS
							     background, never a frontend <img>). */ }
							<ToggleControl
								label={ __( 'Decorative image', 'sgs-blocks' ) }
								help={ __(
									'On (recommended): purely visual, adds no information. Turn off only if this image genuinely needs a description for screen-reader users.',
									'sgs-blocks'
								) }
								checked={ backgroundImageDecorative ?? true }
								onChange={ ( val ) => setAttributes( { backgroundImageDecorative: val } ) }
								__nextHasNoMarginBottom
							/>
							{ ! ( backgroundImageDecorative ?? true ) && (
								<TextControl
									label={ __( 'Image description', 'sgs-blocks' ) }
									value={ backgroundImage?.alt || '' }
									onChange={ ( val ) =>
										setAttributes( {
											backgroundImage: { ...backgroundImage, alt: val },
										} )
									}
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							) }
						</>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ svgLayer }
				{ activeMedia &&
					activeMedia.type === 'video' &&
					activeMedia.url && (
						<video
							className="sgs-cta-section__bg-video"
							src={ activeMedia.url }
							autoPlay
							muted
							loop
							playsInline
							aria-hidden="true"
						/>
					) }
				{ activeMedia && activeMedia.url && (
					<span
						className="sgs-cta-section__overlay"
						style={ {
							opacity: backgroundImageOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }

				{ ribbon && (
					<span
						className="sgs-cta-section__ribbon"
						aria-hidden="true"
					>
						{ ribbon }
					</span>
				) }

				<div { ...innerBlocksProps } />

				{ stats.length > 0 && (
					<div className="sgs-cta-section__stats">
						{ stats.map( ( stat, index ) =>
							stat.text ? (
								<span
									key={ index }
									className="sgs-cta-section__stat"
								>
									{ stat.text }
								</span>
							) : null
						) }
					</div>
				) }
			</div>
		</>
	);
}
