import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import { useSelect, useDispatch } from '@wordpress/data';
// WS-4: shared sgs/container wrapper editor controls (layout kind).
import ContainerWrapperControls, { BackgroundPanel } from '../container/components/ContainerWrapperControls';
import { ResponsiveOverride, SpacingControl, SgsColourPanel, fillRow, ResponsiveBoxControl, SGS_FONT_WEIGHT_OPTIONS, textRow, SgsBorderControl, resolveColourToken, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { backgroundPreview, spacingPreview, svgBackgroundPreview, boxShorthand } from '../../utils';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
} from '@wordpress/components';
import { BUTTON_PRESETS } from '../button/presets';

const CHILD_PRESET_OPTIONS = [
	{ label: __( 'Primary', 'sgs-blocks' ), value: 'primary' },
	{ label: __( 'Secondary', 'sgs-blocks' ), value: 'secondary' },
	{ label: __( 'Outline', 'sgs-blocks' ), value: 'outline' },
];

const TEMPLATE = [
	[ 'sgs/button', { inheritStyle: 'primary', label: 'Primary Action' } ],
	[ 'sgs/button', { inheritStyle: 'secondary', label: 'Secondary Action' } ],
];

const DIRECTION_OPTIONS = [
	{ label: __( 'Row (horizontal)', 'sgs-blocks' ), value: 'row' },
	{ label: __( 'Column (vertical)', 'sgs-blocks' ), value: 'column' },
];

const DIRECTION_OPTIONS_WITH_INHERIT = [
	{ label: __( '— inherit desktop —', 'sgs-blocks' ), value: '' },
	...DIRECTION_OPTIONS,
];

const JUSTIFY_OPTIONS = [
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Space Between', 'sgs-blocks' ), value: 'space-between' },
];

const JUSTIFY_OPTIONS_WITH_INHERIT = [
	{ label: __( '— inherit desktop —', 'sgs-blocks' ), value: '' },
	...JUSTIFY_OPTIONS,
];

const WRAP_OPTIONS = [
	{ label: __( 'Wrap', 'sgs-blocks' ), value: 'wrap' },
	{ label: __( 'No Wrap', 'sgs-blocks' ), value: 'nowrap' },
];

const WRAP_OPTIONS_WITH_INHERIT = [
	{ label: __( '— inherit desktop —', 'sgs-blocks' ), value: '' },
	...WRAP_OPTIONS,
];

const ALIGN_ITEMS_OPTIONS = [
	{ label: __( 'Start', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

const ALIGN_ITEMS_OPTIONS_WITH_INHERIT = [
	{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
	...ALIGN_ITEMS_OPTIONS,
];

export default function Edit( { attributes, setAttributes, clientId } ) {
	const {
		// `flexDirection`/`flexWrap`/`justifyContent`/`alignItems` are now TIER
		// OBJECTS (Spec 35 pass, {desktop,tablet,mobile}) — the legacy
		// `direction`/`wrap` names and the flat `…Tablet`/`…Mobile` siblings are
		// no longer declared by block.json (folded into the object).
		flexDirection,
		gap,
		justifyContent,
		flexWrap,
		alignItems,
		textColour,
		childBtnBackground,
		childBtnTextColour,
		childBtnBorderColour,
		childBtnBorderWidth,
		childBtnBorderStyle,
		childBtnBorderRadius,
		childBtnFontSize,
		childBtnFontWeight,
		backgroundColour,
		backgroundColourGradient,
	} = attributes;

	// Only the DESKTOP tier is read here (the editorStyle preview below). The
	// tier controls read/write the object directly via ResponsiveOverride.
	const direction = flexDirection?.desktop || 'row';
	const wrap      = flexWrap?.desktop || 'nowrap';
	const justify   = justifyContent?.desktop || 'flex-start';
	const align     = alignItems?.desktop || 'center';

	// "Apply to all buttons" — bulk preset-as-seed for every sgs/button child.
	const [ groupPreset, setGroupPreset ] = useState( 'primary' );
	const childButtons = useSelect(
		( select ) =>
			( select( 'core/block-editor' ).getBlock( clientId )?.innerBlocks || [] ).filter(
				( block ) => 'sgs/button' === block.name
			),
		[ clientId ]
	);
	const { updateBlockAttributes } = useDispatch( 'core/block-editor' );

	const applyPresetToAllButtons = () => {
		const presetValues = BUTTON_PRESETS[ groupPreset ];
		childButtons.forEach( ( child ) => {
			updateBlockAttributes( child.clientId, { ...presetValues, inheritStyle: groupPreset } );
		} );
	};

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

	// Active device tier for the padding/margin preview below, read from the
	// SAME source sgs/container's editor mirror reads (`core/editor`
	// getDeviceType) — this block had no previewTier mechanism of its own
	// (its layout preview above only ever shows the desktop tier), so this
	// follows container's exactly rather than inventing a second convention.
	const previewTier = useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device =
			ed && typeof ed.getDeviceType === 'function' ? ed.getDeviceType() : null;
		return { Tablet: 'tablet', Mobile: 'mobile' }[ device ] || 'desktop';
	}, [] );

	// Padding/margin canvas preview (measured live 2026-08-26: this block
	// showed 0px on canvas against a real 120px/80px page). `padding`/`margin`
	// are each a single block-owned tier-object attr { desktop, tablet,
	// mobile } — spacingPreview() still expects the old flat-sibling shape
	// (a separate follow-up: 8 other blocks share this same stale call —
	// see the Phase 3 handoff prompt), so adapt at this call site only.
	const spacePreview = spacingPreview( {
		basePadding: attributes.padding?.desktop,
		paddingTablet: attributes.padding?.tablet,
		paddingMobile: attributes.padding?.mobile,
		baseMargin: attributes.margin?.desktop,
		marginTablet: attributes.margin?.tablet,
		marginMobile: attributes.margin?.mobile,
	}, previewTier );

	// Contrast check for border colour — warn if border fails WCAG 3:1 contrast
	// against the multi-button's own background. When the background is a gradient,
	// the flat backgroundColour is not rendered, so skip the check in that case.
	const multiButtonContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	// Preview the desktop layout in the editor.
	// Gap comes from the block's own Layout panel Gap control (raw CSS string).
	const editorStyle = {
		display: 'flex',
		flexDirection: direction,
		flexWrap: wrap,
		gap: gap?.desktop || undefined,
		justifyContent: justify,
		alignItems: align,
		...bgPreview.style,
		...svgPreview.style,
		...spacePreview,
		// CHECK A finding: textColour is written by the SgsColourPanel below
		// and consumed by render.php's $mb_color_args -> wp_style_engine_get_styles
		// on `$root_sel` (i.e. this same wrapper element) but was never applied
		// to the canvas. No gradient sibling exists for this attribute on this
		// block. `color` is a naturally-inheriting CSS property, so setting it
		// here on the wrapper also matches the frontend's cascade to any
		// sgs/button child that leaves its own text colour unset.
		color: resolveColourToken( textColour, colourPalette ) || undefined,
		// CHECK A finding — child-button GROUP DEFAULTS (A2, D638 §4/§5). These
		// are written by the "Button group defaults" panel and consumed by
		// render.php as `--sgs-mb-btn-<prop>-default` CUSTOM PROPERTIES on this
		// same wrapper element (see the comment above `$mb_child_defaults` in
		// render.php) — button/style.css's own `--sgs-btn-*` vars read them as a
		// fallback tier. Setting the SAME custom-property names here is purely
		// additive: CSS custom properties inherit through the DOM regardless of
		// block boundaries, so the already-rendered child sgs/button InnerBlocks
		// in the editor canvas pick these up automatically via the existing
		// `var(--sgs-mb-btn-*-default)` fallback in button/style.css — no
		// child-block edit needed. Only the 6 flagged attrs are wired here
		// (childBtnBackground/childBtnTextColour were not part of this finding).
		...( childBtnBorderColour && {
			'--sgs-mb-btn-border-default': resolveColourToken( childBtnBorderColour, colourPalette ) || childBtnBorderColour,
		} ),
		...( boxShorthand( childBtnBorderWidth ) && {
			'--sgs-mb-btn-border-width-default': boxShorthand( childBtnBorderWidth ),
		} ),
		...( childBtnBorderStyle && {
			'--sgs-mb-btn-border-style-default': childBtnBorderStyle,
		} ),
		...( childBtnBorderRadius && {
			'--sgs-mb-btn-radius-default': childBtnBorderRadius,
		} ),
		...( childBtnFontSize && {
			'--sgs-mb-btn-font-size-default': childBtnFontSize,
		} ),
		...( childBtnFontWeight && {
			'--sgs-mb-btn-font-weight-default': String( childBtnFontWeight ),
		} ),
	};

	// A button group's children are always sgs/button (that IS the block's
	// purpose) — a stray non-button block dropped here would break the flex
	// row this block renders, so this roster is never relaxed.
	const allowedBlocks = [ 'sgs/button' ];

	const blockProps = useBlockProps( {
		className: [ bgPreview.className, ...svgPreview.className ].filter( Boolean ).join( ' ' ),
		style: editorStyle,
	} );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks,
		template: TEMPLATE,
		templateLock: false,
	} );

	// Mirrors class-sgs-container-wrapper.php:2794-2798. `aria-hidden` matches
	// the server; `pointer-events:none` is editor-only insurance so the
	// decorative layer can never swallow a click meant for the block or its
	// children.
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
			{ /* D635-pattern migration: native Text/Background colour panel replaced by
			    flat backgroundColour/textColour attrs surfaced via the shared SgsColourPanel
			    (matches testimonial-slider/process-steps/quote/heading/card-grid/text).
			    Background row is now the FILL variant (fillRow) — gradient + hover moved
			    off the native panel (supports.color.gradients was true, competing with
			    this SGS panel) onto block-private backgroundColour{Hover,Gradient,
			    HoverGradient} attrs, so capability is moved rather than lost.
			    This panel is the `group` element's TEXT colour + FILL colour (Spec 35
			    Part O TIER 2 — `group` isWrapper:true, so its text/fill clusters resolve
			    to property-family panels, not one per-element panel). It self-routes to
			    group="styles" and is exempt from inspector-scan rule 01's panel count —
			    plugins/sgs-blocks/CLAUDE.md's colour-control standard is mandatory: never
			    hand-roll a bespoke colour PanelBody, mount this instead. */ }
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
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
							},
						],
					},
					fillRow( {
						key: 'child-btn-background',
						label: __( 'Button background colour', 'sgs-blocks' ),
						attrs: {
							base: 'childBtnBackground',
							hover: 'childBtnBackgroundHover',
							gradient: 'childBtnBackgroundGradient',
							hoverGradient: 'childBtnBackgroundHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'child-btn-text-colour',
						label: __( 'Button text colour', 'sgs-blocks' ),
						attrs: { base: 'childBtnTextColour' },
						attributes,
						setAttributes,
					} ),
				] }
			/>

			{ /* H6 fix (2026-07-05, STOP-43): kind='content' only (width/contentWidth +
			    padding/spacing). The block owns its own responsive flex layout
			    (direction/gap/wrap/justify/align, rendered via its own scoped <style>
			    in render.php at SGS_Container_Wrapper::render(..., 'content', ...)) —
			    kind='layout' would additionally make the shared wrapper emit its own
			    non-responsive grid/flex + inline style, which always beats this
			    block's @media-scoped rules. See render.php for the full note.
			    This is a shared component that opens its own default-group
			    InspectorControls — its "Container / Wrapper" panel owns maxWidth/
			    contentWidth for the `group` element's layout cluster, so that
			    control is NOT duplicated in the Layout panel below. */ }
			<ContainerWrapperControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				kind="content"
			/>

			{ /* ── Spec 35 Part O THE PLACEMENT RULE — restructured 2026-09-03
			    (clears inspector-scan rule 01-tab-group). `group` is this block's
			    ONLY styled element and is `isWrapper:true`, so its controls resolve
			    to TIER 2 (property-family panels: text/fill/layout), not a single
			    per-element panel. `button` (order 2, clusters:[]) documents
			    InnerBlocks ownership only — sgs/button children carry their own
			    full text/fill/layout panels, so there is no real TIER-1 panel to
			    build for it.
			    PINNED SETTINGS panel first (controls that style nothing), then the
			    TIER-2 style panels below (Fill/Layout, group="styles"). TEXT colour
			    and FILL colour both live in the mandatory SgsColourPanel mount
			    above (self-routing), so neither needs a panel here. */ }
			<InspectorControls>
				{ /* ── Button styles (bulk preset) — PINNED SETTINGS panel. Styles
				    NOTHING on this block itself: it writes preset values onto CHILD
				    sgs/button attributes, so it takes the one Settings panel, pinned
				    first, per THE PLACEMENT RULE's "a control that styles nothing
				    takes one Settings panel, pinned first." */ }
				<PanelBody
					title={ __( 'Button styles', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Style preset', 'sgs-blocks' ) }
						value={ groupPreset }
						options={ CHILD_PRESET_OPTIONS }
						onChange={ setGroupPreset }
						help={ __( 'Apply a preset style to every button in this group at once.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<Button
						variant="secondary"
						style={ { marginTop: '8px' } }
						onClick={ applyPresetToAllButtons }
						disabled={ ! childButtons.length }
					>
						{ __( 'Apply to all buttons', 'sgs-blocks' ) }
					</Button>
				</PanelBody>

				{ /* ── Button group defaults (A2, D638 §4/§5) — LEFT EXEMPT, UNCHANGED
				    (2026-09-03 scoping decision). These childBtn* live-default attrs
				    map to no CSS property on `group`/multi-button itself — they seed
				    CHILD sgs/button instances, not this block's own render — so
				    forcing them into the `button` element's empty TIER-1 panel
				    (button declares clusters:[]; it documents ownership, not a real
				    panel target) would misrepresent what they do. Left in the
				    default Settings routing exactly as before.
				    Live CSS custom-property fallback, NOT the Block Context
				    API and NOT editor-time copy-on-insert (both rejected —
				    see decisions.md D638 §4). A child sgs/button with no
				    explicit value of its own picks up whatever is set here,
				    LIVE — change a default and every unset child follows it
				    immediately; a child with its own explicit value keeps it.
				    Inherit is IMPLICIT (empty = inherit), no visual indicator
				    — Bean's explicit, knowingly-accepted call (D638 §5); do
				    not add an indicator here.
				    Scope is deliberately the ~6 core properties Bean ruled,
				    not sgs/button's full ~35 style attrs — see the parking
				    lot note in the Stage 1 plan before adding more. */ }
				<PanelBody title={ __( 'Button group defaults', 'sgs-blocks' ) } initialOpen={ false }>
					<p className="components-base-control__help" style={ { marginTop: 0 } }>
						{ __(
							'Sets a default for every button in this group that does not already have its own value set. A button with its own colour, radius, size or weight keeps that value.',
							'sgs-blocks'
						) }
					</p>
					{ /* 2026-08-30 owner decision: childBtnBorderWidth/childBtnBorderStyle
					    added to block.json so this group-default row can mount the
					    standard SgsBorderControl composite (D338 -- an undeclared
					    sibling attr crashes onWidthChange/onStyleChange or silently
					    discards the edit). Single-state colour form (no hover, no
					    gradient) -- this is a GROUP DEFAULT, not a per-instance
					    border; colourLinked stays true (D881) so a picked colour
					    stores the palette token, not a baked hex.
					    Width/style are consumed by a zero-specificity
					    :where(.sgs-multi-button) .sgs-button rule in
					    button/style.css -- it can never outrank a preset's own
					    border and never matches a standalone sgs/button, so
					    the 2026-08-27 preset-less-border fix stays intact. */ }
					<SgsBorderControl
						label={ __( 'Button border', 'sgs-blocks' ) }
						widthValues={ childBtnBorderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { childBtnBorderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ childBtnBorderStyle }
						onStyleChange={ ( val ) => setAttributes( { childBtnBorderStyle: val } ) }
						colourLabel={ __( 'Button border colour', 'sgs-blocks' ) }
						colourValue={ childBtnBorderColour }
						onColourChange={ ( val ) => setAttributes( { childBtnBorderColour: val ?? '' } ) }
						colourLinked={ true }
					/>
					<TextControl
						label={ __( 'Button border radius', 'sgs-blocks' ) }
						help={ __( 'A CSS length, e.g. 8px or 999px for a pill shape. Leave blank to use the framework default.', 'sgs-blocks' ) }
						value={ childBtnBorderRadius }
						onChange={ ( val ) => setAttributes( { childBtnBorderRadius: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Button font size', 'sgs-blocks' ) }
						help={ __( 'A CSS length, e.g. 16px. Leave blank to use the framework default.', 'sgs-blocks' ) }
						value={ childBtnFontSize }
						onChange={ ( val ) => setAttributes( { childBtnFontSize: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Button font weight', 'sgs-blocks' ) }
						value={ childBtnFontWeight || '' }
						options={ SGS_FONT_WEIGHT_OPTIONS }
						onChange={ ( val ) => setAttributes( { childBtnFontWeight: val } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				{ /* ── Fill (TIER 2 property-family panel for `group`'s fill cluster)
				    — background image/video/SVG + overlay colour/gradient, full
				    parity with sgs/container's own panel. Renders through the
				    shared SGS_Container_Wrapper — background/overlay emission is
				    universal regardless of `kind` (D6), so this needs no render.php
				    change beyond declaring the attrs. Fill COLOUR (backgroundColour/
				    gradient/hover/hoverGradient) lives in the SgsColourPanel mount
				    above (mandatory shared colour control, self-routing) — this
				    panel is the fill cluster's remaining, non-colour half. */ }
				<BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } />

				{ /* ── Layout (TIER 2 property-family panel for `group`'s layout
				    cluster) — merges the former separate "Padding & margin" /
				    "Layout" / "Alignment" / "Border" panels into one, since `group`
				    is this block's only styled element. max-width/contentWidth stay
				    on ContainerWrapperControls's own "Container / Wrapper" panel
				    (mounted above) rather than being duplicated here. */ }
				<ToolsPanel
					label={ __( 'Layout', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							padding: {},
							margin: {},
							flexDirection: { desktop: 'row', mobile: 'column' },
							gap: { desktop: '12px', mobile: '8px' },
							flexWrap: { desktop: 'nowrap', mobile: 'nowrap' },
							justifyContent: { desktop: 'flex-start' },
							alignItems: { desktop: 'center', mobile: 'stretch' },
							borderWidth: {},
							borderStyle: 'solid',
							borderColour: '',
							borderColourGradient: '',
							borderRadius: {},
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Padding', 'sgs-blocks' ) }
						hasValue={ () =>
							JSON.stringify( attributes.padding ?? {} ) !== '{}'
						}
						onDeselect={ () =>
							setAttributes( { padding: {} } )
						}
						isShownByDefault
					>
					{ /* ── Padding & margin (A1, D638 — sgs/container parity) ──
					    `padding`/`margin` are each a single block-owned
					    tier-object attr { desktop, tablet, mobile } — this block
					    no longer declares supports.spacing, so there is no
					    duplicate Styles > Dimensions panel for the client to
					    confuse with this one. Read directly by render.php.
					    ⚠ The margin half is NEW (2026-08-27). This block previously
					    had NO margin control at all — margin was reachable only
					    through WordPress's native Dimensions panel, which the
					    migration removes. Bean ruled full parity rather than a
					    padding-only carve-out (Rule 3), so it is built here. */ }
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
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Margin', 'sgs-blocks' ) }
						hasValue={ () =>
							JSON.stringify( attributes.margin ?? {} ) !== '{}'
						}
						onDeselect={ () =>
							setAttributes( { margin: {} } )
						}
					>
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

					<ToolsPanelItem
						label={ __( 'Direction', 'sgs-blocks' ) }
						hasValue={ () =>
							JSON.stringify( flexDirection ?? {} ) !==
							JSON.stringify( { desktop: 'row', mobile: 'column' } )
						}
						onDeselect={ () =>
							setAttributes( { flexDirection: { desktop: 'row', mobile: 'column' } } )
						}
						isShownByDefault
					>
					{ /*
						  `flexDirection` is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass), same shape as
						  `gap` below. `flexDirectionTablet`/`…Mobile` are no
						  longer declared in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Direction', 'sgs-blocks' ) }
						value={ flexDirection }
						onChange={ ( obj ) => setAttributes( { flexDirection: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? DIRECTION_OPTIONS : DIRECTION_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Gap', 'sgs-blocks' ) }
						hasValue={ () =>
							JSON.stringify( attributes.gap ?? {} ) !==
							JSON.stringify( { desktop: '12px', mobile: '8px' } )
						}
						onDeselect={ () =>
							setAttributes( { gap: { desktop: '12px', mobile: '8px' } } )
						}
					>
					{ /*
						  Gap is a TIER OBJECT — ONE attr holding
						  {desktop,tablet,mobile} (Spec 35 pass 1, 2026-08-10).
						  ⛔ Do NOT revert to `ResponsiveControl` + an attrMap of
						  `gap`/`gapTablet`/`gapMobile`: the latter two are no
						  longer declared in block.json and WordPress silently
						  discards an undeclared attribute (D338), while the
						  desktop branch wrote a STRING into an object-typed
						  attr, which coerces to the default and loses the lot.
					*/ }
					<ResponsiveOverride
						label={ __( 'Gap', 'sgs-blocks' ) }
						value={ attributes.gap }
						onChange={ ( obj ) => setAttributes( { gap: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SpacingControl
								freeInput
								value={ ownValue }
								placeholder={ inherited ? effectiveValue : '' }
								onChange={ setOwnValue }
							/>
						) }
					</ResponsiveOverride>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Wrap', 'sgs-blocks' ) }
						hasValue={ () =>
							JSON.stringify( flexWrap ?? {} ) !==
							JSON.stringify( { desktop: 'nowrap', mobile: 'nowrap' } )
						}
						onDeselect={ () =>
							setAttributes( { flexWrap: { desktop: 'nowrap', mobile: 'nowrap' } } )
						}
					>
					{ /*
						  `flexWrap` is a TIER OBJECT — same shape as `flexDirection`
						  above. `flexWrapTablet`/`…Mobile` are no longer declared
						  in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Wrap', 'sgs-blocks' ) }
						value={ flexWrap }
						onChange={ ( obj ) => setAttributes( { flexWrap: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? WRAP_OPTIONS : WRAP_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Button spacing', 'sgs-blocks' ) }
						hasValue={ () =>
							JSON.stringify( justifyContent ?? {} ) !==
							JSON.stringify( { desktop: 'flex-start' } )
						}
						onDeselect={ () =>
							setAttributes( { justifyContent: { desktop: 'flex-start' } } )
						}
					>
					{ /*
						  `justifyContent` is a TIER OBJECT — same shape as
						  `flexDirection` above. `justifyContentTablet`/`…Mobile`
						  are no longer declared in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Button spacing', 'sgs-blocks' ) }
						value={ justifyContent }
						onChange={ ( obj ) => setAttributes( { justifyContent: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? JUSTIFY_OPTIONS : JUSTIFY_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Button alignment', 'sgs-blocks' ) }
						hasValue={ () =>
							JSON.stringify( alignItems ?? {} ) !==
							JSON.stringify( { desktop: 'center', mobile: 'stretch' } )
						}
						onDeselect={ () =>
							setAttributes( { alignItems: { desktop: 'center', mobile: 'stretch' } } )
						}
					>
					{ /*
						  `alignItems` is a TIER OBJECT — same shape as
						  `flexDirection` above. `alignItemsTablet`/`…Mobile` are
						  no longer declared in block.json.
					*/ }
					<ResponsiveOverride
						label={ __( 'Button alignment', 'sgs-blocks' ) }
						value={ alignItems }
						onChange={ ( obj ) => setAttributes( { alignItems: obj } ) }
					>
						{ ( { tier, ownValue, setOwnValue } ) => (
							<SelectControl
								value={ ownValue || '' }
								options={ tier === 'desktop' ? ALIGN_ITEMS_OPTIONS : ALIGN_ITEMS_OPTIONS_WITH_INHERIT }
								onChange={ ( val ) => setOwnValue( val ) }
								help={ tier === 'mobile' ? __( 'Mobile stacks buttons full-width by default (stretch).', 'sgs-blocks' ) : undefined }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
					</ResponsiveOverride>
					</ToolsPanelItem>

					<ToolsPanelItem
						label={ __( 'Border', 'sgs-blocks' ) }
						hasValue={ () =>
							JSON.stringify( attributes.borderWidth ?? {} ) !== '{}' ||
							attributes.borderStyle !== 'solid' ||
							( attributes.borderColour ?? '' ) !== '' ||
							( attributes.borderColourGradient ?? '' ) !== '' ||
							JSON.stringify( attributes.borderRadius ?? {} ) !== '{}'
						}
						onDeselect={ () =>
							setAttributes( {
								borderWidth: {},
								borderStyle: 'solid',
								borderColour: '',
								borderColourGradient: '',
								borderRadius: {},
							} )
						}
						isShownByDefault
					>
					{ /* ── Border — group root border (width/style/colour/gradient/
					    radius). Merged in from the former standalone "Border" panel. */ }
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
						contrastAgainst={ multiButtonContrastAgainst }
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
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			{ /* Spread first, then state children explicitly: innerBlocksProps
			    CARRIES a `children` prop, so the SVG layer has to be composed
			    with it rather than added alongside the spread (which React
			    would silently discard). */ }
			<div { ...innerBlocksProps }>
				{ svgLayer }
				{ innerBlocksProps.children }
			</div>
		</>
	);
}
