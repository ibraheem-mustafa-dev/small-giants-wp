/**
 * edit.js — Block editor component for sgs/quote.
 *
 * ONE content model mirroring WordPress core/quote (Bean-agreed 2026-07-05):
 * - Body = InnerBlocks children (multi-paragraph, natively editable — the
 *   client types/adds/removes paragraphs the normal WP way, same as any
 *   other InnerBlocks-bearing composite).
 * - Attribution = ONE typed string attr (RichText, not a child block) with
 *   its own typography controls.
 *
 * Body typography/colour lives on the CHILD sgs/text blocks (HC2, D192:
 * "parent owns LAYOUT, child owns TYPOGRAPHY" for InnerBlocks composites) —
 * this parent has no body-slot styling controls any more.
 *
 * NO-INLINE + NO-WRAPPER (LOCKED per-block no-inline migration contract
 * §A/§B/§B3, 2026-07-09): the <blockquote> IS the block root — no wrapper
 * <div>, no SGS_Container_Wrapper delegation. Editor canvas preview mirrors
 * render.php's scoped-CSS output via inline style on the SAME root element
 * (the editor canvas is allowed to use inline style for live preview — only
 * the SAVED/RENDERED frontend output must be inline-free, and this block is
 * dynamic (render.php), so nothing here is persisted to post_content).
 *
 * Provides editing surfaces for:
 * - Body paragraphs (native InnerBlocks — sgs/text children)
 * - Attribution string (single RichText + tag select) + its typography
 * - Wrapper (background, border, radius, shadow, padding, margin, width)
 * - Hover state (scale, colour, background, shadow)
 * - Inherit style toggle
 *
 * Primary use case is converter-emitted; the editor just needs to register
 * cleanly and allow manual authoring when needed.
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { ResponsiveControl, ResponsiveOverride, ResponsiveBoxControl, SgsColourPanel, ShadowControl, SgsLengthControl, TypographyControls, SgsBorderControl, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { colourVar, resolveTextColourPreviewStyle } from '../../utils';
import { ToolsPanel, ToolsPanelItem } from '../../components/primitives';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Default InnerBlocks template — seeds one editable body paragraph. The slot
// stays OPEN (no allowedBlocks lock) so an operator, or the cloning converter
// routing a draft paragraph/heading into the quote, can add further sgs/text
// (or other text-capable) children (mirrors sgs/notice-banner's FR-22-6 model).
const QUOTE_BODY_TEMPLATE = [
	[ 'sgs/text', { text: __( 'Body paragraph…', 'sgs-blocks' ), tag: 'p' } ],
];

const ATTRIB_TAG_OPTIONS = [
	{ label: __( 'footer', 'sgs-blocks' ), value: 'footer' },
	{ label: __( 'div', 'sgs-blocks' ), value: 'div' },
	{ label: __( 'cite', 'sgs-blocks' ), value: 'cite' },
];

const MARGIN_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
];

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function composeUnit( num, unit ) {
	if ( num === undefined || num === null || num === '' ) {
		return '';
	}
	return `${ num }${ unit || '' }`;
}

function parseUnit( raw, currentUnit ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const str = String( raw ).trim();
	if ( '' === str ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] !== undefined ? match[ 2 ] : ( currentUnit || 'px' );
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	return { num: undefined, unit: currentUnit || 'px' };
}

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5).
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

// ---------------------------------------------------------------------------
// Editor preview style builder — desktop styles only; responsive via PHP
// ---------------------------------------------------------------------------

function buildWrapperStyle( attributes ) {
	const { padding, margin,
		inheritStyle,
		backgroundColour,
		style,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		maxWidth,
	} = attributes;

	if ( inheritStyle ) {
		return {};
	}

	const wrapperStyle = {};

	if ( backgroundColour ) {
		wrapperStyle.backgroundColor = /^#|^rgb|^hsl/.test( backgroundColour )
			? backgroundColour
			: colourVar( backgroundColour );
	}

	const radiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( radiusPreview ) {
		wrapperStyle.borderRadius = radiusPreview;
	}

	const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( borderStyle && borderStyle !== 'none' ) {
		if ( borderWidthPreview ) {
			wrapperStyle.borderWidth = borderWidthPreview;
		}
		wrapperStyle.borderStyle = borderStyle;
		if ( borderColour ) {
			wrapperStyle.borderColor = /^#|^rgb|^hsl/.test( borderColour )
				? borderColour
				: colourVar( borderColour );
		}
		// A gradient border renders frontend as a masked ::before ring, which cannot
		// be reproduced in a plain inline style — approximate it with the gradient as
		// a border-image so the canvas at least shows that a gradient is applied.
		if ( borderColourGradient && /^(repeating-)?(linear|radial|conic)-gradient\(/i.test( borderColourGradient ) ) {
			wrapperStyle.borderImage = `${ borderColourGradient } 1`;
		}
	}

	const paddingPreview = boxShorthand( padding?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( margin?.desktop, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		wrapperStyle.margin = marginPreview;
	}

	if ( maxWidth ) {
		wrapperStyle.maxWidth = maxWidth;
	}

	return wrapperStyle;
}

function buildAttribStyle( attributes ) {
	const {
		attributionColour,
		attributionColourGradient,
		attributionMarginTop, attributionMarginUnit,
	} = attributes;
	const style = {
		...resolveTextColourPreviewStyle(
			attributionColour,
			attributionColourGradient,
			( val ) => ( /^#|^rgb|^hsl/.test( val ) ? val : colourVar( val ) )
		),
	};
	// attributionMarginTop is a TIER OBJECT — the canvas preview (desktop-only;
	// responsive tiers render via PHP) reads the desktop tier. Typography
	// (font-size/weight/family/style/decoration/transform/line-height) no
	// longer gets a canvas preview here — same as sgs/testimonial's `nameStyle`
	// (colour-only), which this now mirrors; those properties render correctly
	// via the block's own scoped <style> on the FRONTEND only.
	if ( attributionMarginTop?.desktop != null ) {
		style.marginTop = `${ attributionMarginTop.desktop }${ attributionMarginUnit }`;
	}
	return style;
}

// ---------------------------------------------------------------------------
// Edit component
// ---------------------------------------------------------------------------

export default function Edit( { attributes, setAttributes } ) {
	const {
		style,
		attribution,
		attributionTag,
		attributionEnabled,
		attributionColour,
		attributionColourGradient,
		// attributionFontSize / attributionMarginTop are TIER OBJECTS
		// {desktop,tablet,mobile} as of Spec 35 pass 3b (2026-08-11) — the
		// *Tablet/*Mobile siblings no longer exist.
		attributionFontSize,
		attributionFontSizeUnit,
		attributionFontWeight,
		attributionFontFamily,
		attributionFontStyle,
		attributionTextDecoration,
		attributionTextTransform,
		attributionLineHeight,
		attributionLineHeightUnit,
		attributionMarginTop,
		attributionMarginUnit,
		backgroundColour,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourHover,
		borderColourGradient,
		boxShadow,
		boxShadowHover,
		boxShadowColour,
		boxShadowHoverColour,
		scaleHover,
		textColourHover,
		textColourHoverGradient,
		backgroundColourHover,
		backgroundColourGradient,
		backgroundColourHoverGradient,
		maxWidth,
		inheritStyle,
		transitionDuration,
		transitionEasing,
	} = attributes;

	// Contrast check for border colour — warn if border fails WCAG AA contrast
	// against the quote's own background. When the background is a gradient,
	// comparing against the flat colour would compare against a surface that
	// isn't rendered — skip the check entirely in that case.
	const quoteContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	// Contract §B3: NO wrapper <div> — the <blockquote> IS the block root
	// (matches render.php). It carries the block class + the wrapper preview
	// style, so the canvas mirrors the scoped frontend output.
	const blockProps = useBlockProps( {
		as: 'blockquote',
		className: 'wp-block-sgs-quote',
		style: buildWrapperStyle( attributes ),
	} );

	// Body = native InnerBlocks (mirrors core/quote) — the wrapping element
	// (blockquote) hosts the children directly, no extra body-row markup.
	// `children` is pulled out and rendered explicitly (see canvas below) so
	// the attribution RichText can sit alongside it as a flat sibling — a
	// literal spread would let innerBlocksProps.children silently win over
	// the RichText.
	const { children: innerBlocksChildren, ...innerBlocksRest } = useInnerBlocksProps( {}, {
		template: QUOTE_BODY_TEMPLATE,
	} );

	const attribStyle = buildAttribStyle( attributes );

	// attributionFontSize / attributionMarginTop are TIER OBJECTS as of Spec 35
	// pass 3b (2026-08-11) — ONE attr each, holding {desktop,tablet,mobile}. The
	// per-breakpoint attr-key maps that used to live here are gone with the flat
	// siblings they addressed; the controls below use <ResponsiveOverride>,
	// which reads and writes the object itself (mirrors the maxWidth control).

	// `maxWidth` is a TIER OBJECT as of Spec 35 pass 2 (2026-08-11) — ONE attr
	// holding {desktop,tablet,mobile}. The per-breakpoint attr-key map that used
	// to live here is gone with the flat siblings it addressed; the control below
	// uses <ResponsiveOverride>, which reads and writes the object itself.

	return (
		<>
			{ /* D618/D609 — grouped, SGS-owned colour panel, rendered FIRST so it
			   sits at the top of the inspector (Styles tab). Replaces 5
			   scattered DesignTokenPicker rows below (Attribution's "Text
			   colour", Wrapper's "Background colour", Border's "Border
			   colour", Hover's "Text colour on hover" and "Background on
			   hover").
			   - "Background" pairs backgroundColour (normal) with
			     backgroundColourHover — both target the SAME root fill
			     (render.php: background-color on the root selector, and
			     root:hover/:focus-within for the hover rule).
			   - "Text colour (hover)" is genuinely HOVER-ONLY — textColourHover
			     has no matching base attr (body text colour is owned by the
			     child sgs/text blocks, per HC2 "parent owns layout, child owns
			     typography"; render.php only ever sets `color` inside the
			     `:hover,:focus-within` rule, never as a base declaration), so
			     this row has a single state whose key is 'hover', not 'normal'.
			   - "Attribution colour" and "Border colour" are single-state
			     (no hover pair exists for either in render.php). */ }
			{ /* Block-level "Text colour" row ADDED here (2026-08-16) — was the
			   native WP Text control (`supports.color.text`, now false so WP
			   no longer renders it as a separate panel); wired straight to
			   `style.color.text`, which render.php already reads manually
			   (lines ~225-227, wp_style_engine_get_styles(), scoped to the
			   block's own `.{uid}` root selector). Block-level "Background
			   colour" already existed below as a CUSTOM `backgroundColour`
			   attr/row (NOT the native path) — its native
			   `supports.color.background` sub-flag is also now false (it was
			   redundant with this existing row and had no render.php
			   consumer of its own), but the row itself is unchanged. */ }
			<SgsColourPanel
				rows={ [
					{
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: style?.color?.text,
								onChange: ( val ) =>
									setAttributes( {
										style: {
											...style,
											color: { ...style?.color, text: val || undefined },
										},
									} ),
								linked: true,
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
					{
						key: 'textColourHover',
						label: __( 'Text colour (hover)', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: textColourHover,
								onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
								linked: true,
								gradientValue: textColourHoverGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourHoverGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'attributionColour',
						label: __( 'Attribution colour', 'sgs-blocks' ),
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: attributionColour,
								onChange: ( val ) => setAttributes( { attributionColour: val ?? '' } ),
								linked: true,
								gradientValue: attributionColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { attributionColourGradient: val ?? '' } ),
							},
						],
					},
					{
						key: 'boxShadowColour',
						label: __( 'Shadow colour', 'sgs-blocks' ),
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: boxShadowColour,
								onChange: ( val ) => setAttributes( { boxShadowColour: val ?? '' } ),
								linked: true,
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: boxShadowHoverColour,
								onChange: ( val ) => setAttributes( { boxShadowHoverColour: val ?? '' } ),
								linked: true,
							},
						],
					},
				] }
			/>
			<InspectorControls>
				{ /* ---- Style ---- */ }
				<PanelBody title={ __( 'Style', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Inherit parent styles (suppress wrapper styles)', 'sgs-blocks' ) }
						checked={ inheritStyle }
						onChange={ ( val ) => setAttributes( { inheritStyle: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ---- Attribution slot ---- */ }
				{ /* Object-valued (tiered) attrs are ordered LAST in this reset call
				   below, deliberately — a shared build-time detector
				   (check-editor-render-parity.js SIGNAL 2, checkCompanionExemption)
				   regex-parses a setAttributes() call-site's keys and cannot see
				   past a nested object-literal value. Keeping every scalar-valued
				   key ahead of the two object-valued resets lets the detector
				   correctly recognise the co-write group (attributionColour /
				   attributionMarginTop are both used outside InspectorControls, via
				   buildAttribStyle) and companion-exempt the rest — same runtime
				   result either way, order-independent. */ }
				<ToolsPanel
					label={ __( 'Attribution', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							attributionEnabled: true,
							attributionTag: 'footer',
							attributionColour: '',
							attributionColourGradient: '',
							attributionFontStyle: '',
							attributionFontWeight: '',
							attributionFontSizeUnit: 'px',
							attributionFontFamily: '',
							attributionTextDecoration: '',
							attributionTextTransform: '',
							attributionLineHeight: undefined,
							attributionLineHeightUnit: 'em',
							attributionMarginUnit: 'px',
							attributionFontSize: {},
							attributionMarginTop: {},
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Show attribution', 'sgs-blocks' ) }
						hasValue={ () => attributionEnabled !== true }
						onDeselect={ () =>
							setAttributes( { attributionEnabled: true } )
						}
						isShownByDefault
					>
						<ToggleControl
							label={ __( 'Show attribution', 'sgs-blocks' ) }
							checked={ attributionEnabled }
							onChange={ ( val ) => setAttributes( { attributionEnabled: val } ) }
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					{ attributionEnabled && (
						<>
							<ToolsPanelItem
								label={ __( 'HTML tag', 'sgs-blocks' ) }
								hasValue={ () => attributionTag !== 'footer' }
								onDeselect={ () =>
									setAttributes( { attributionTag: 'footer' } )
								}
							>
								<SelectControl
									label={ __( 'HTML tag', 'sgs-blocks' ) }
									value={ attributionTag }
									options={ ATTRIB_TAG_OPTIONS }
									onChange={ ( val ) => setAttributes( { attributionTag: val } ) }
									__nextHasNoMarginBottom
									__next40pxDefaultSize
								/>
							</ToolsPanelItem>
							{ /* Attribution text colour moved to the top-level SgsColourPanel
							   (D618/D621) — "Attribution colour" row. */ }

							{ /* Attribution typography (font size/weight/style/family/
							   decoration/transform/line-height) — rebuilt onto the shared
							   TypographyControls component (Bean R-22-13), matching
							   sgs/testimonial's `name` prefix pattern, rather than the
							   bespoke controls this used to hand-roll. One shared UI,
							   one shared render.php helper (sgs_typography_css_rule). */ }
							<ToolsPanelItem
								label={ __( 'Typography', 'sgs-blocks' ) }
								hasValue={ () =>
									!! attributionFontFamily ||
									!! attributionFontWeight ||
									!! attributionFontStyle ||
									!! attributionTextDecoration ||
									!! attributionTextTransform ||
									attributionLineHeight != null ||
									attributionFontSize?.desktop != null ||
									attributionFontSize?.tablet != null ||
									attributionFontSize?.mobile != null
								}
								onDeselect={ () =>
									setAttributes( {
										attributionFontFamily: '',
										attributionFontWeight: '',
										attributionFontStyle: '',
										attributionTextDecoration: '',
										attributionTextTransform: '',
										attributionLineHeight: undefined,
										attributionLineHeightUnit: 'em',
										attributionFontSize: {},
										attributionFontSizeUnit: 'px',
									} )
								}
								isShownByDefault
							>
								<TypographyControls
									attributes={ attributes }
									setAttributes={ setAttributes }
									prefix="attribution"
									showSize
									showWeight
									showStyle
									showLineHeight
									showFontFamily
									showDecoration
									showTransform
									showResponsive
								/>
							</ToolsPanelItem>

							{ /* Attribution margin-top — ResponsiveOverride + UnitControl/RangeControl
							   (KEPT-SCALAR single-side family, contract §C). attributionMarginTop
							   is a TIER OBJECT (Spec 35 pass 3b) storing the bare NUMBER per tier;
							   attributionMarginUnit stays a single shared unit across all tiers. */ }
							<ToolsPanelItem
								label={ __( 'Margin-top (gap above attribution)', 'sgs-blocks' ) }
								hasValue={ () =>
									attributionMarginTop?.desktop != null ||
									attributionMarginTop?.tablet != null ||
									attributionMarginTop?.mobile != null
								}
								onDeselect={ () =>
									setAttributes( { attributionMarginTop: {} } )
								}
							>
								<ResponsiveOverride
									label={ __( 'Margin-top (gap above attribution)', 'sgs-blocks' ) }
									value={ attributionMarginTop }
									onChange={ ( obj ) => setAttributes( { attributionMarginTop: obj } ) }
								>
									{ ( { ownValue, setOwnValue, tier } ) => {
										const unitVal = attributionMarginUnit || 'px';
										if ( tier === 'desktop' ) {
											return (
												<SgsLengthControl
													label={ __( 'Margin-top', 'sgs-blocks' ) }
													hideLabelFromVision
													value={ composeUnit( ownValue, unitVal ) }
													units={ MARGIN_UNITS }
													onChange={ ( raw ) => {
														const { num, unit } = parseUnit( raw, unitVal );
														setOwnValue( num );
														setAttributes( { attributionMarginUnit: unit } );
													} }
													presets={ false }
												/>
											);
										}
										return (
											<RangeControl
												label={ tier === 'tablet'
													? __( 'Margin-top (tablet)', 'sgs-blocks' )
													: __( 'Margin-top (mobile)', 'sgs-blocks' )
												}
												value={ ownValue ?? '' }
												onChange={ ( val ) => setOwnValue( val ) }
												min={ 0 } max={ 80 } step={ 1 } allowReset
												__nextHasNoMarginBottom
												__next40pxDefaultSize
											/>
										);
									} }
								</ResponsiveOverride>
							</ToolsPanelItem>
						</>
					) }
				</ToolsPanel>

				{ /* ---- Hover ---- */ }
				<PanelBody
					title={ __( 'Hover', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<TextControl
						label={ __( 'Scale on hover (e.g. 1.03)', 'sgs-blocks' ) }
						value={ scaleHover }
						onChange={ ( val ) => setAttributes( { scaleHover: val } ) }
						placeholder="1.03"
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ /* Text colour on hover + Background on hover moved to the
					   top-level SgsColourPanel (D618/D621) — "Text colour
					   (hover)" and "Background colour" (hover state) rows. */ }
					<ShadowControl
						label={ __( 'Box shadow on hover', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							base: 'boxShadowHover',
							colour: 'boxShadowHoverColour',
						} }
					/>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ parseInt( transitionDuration, 10 ) || 300 }
						onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
						min={ 0 } max={ 1000 } step={ 50 }
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

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				{ /* ---- Wrapper ---- */ }
				{ ! inheritStyle && (
					<PanelBody
						title={ __( 'Wrapper', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<ToolsPanel
							className="sgs-nested-tools-panel"
							label={ __( 'Wrapper', 'sgs-blocks' ) }
							resetAll={ () =>
								setAttributes( {
									backgroundColour: '',
									boxShadow: '',
									boxShadowColour: '',
									padding: {},
									margin: {},
									maxWidth: {},
								} )
							}
						>
							{ /* Background colour moved to the top-level SgsColourPanel
							   (D618/D621) — "Background colour" row (paired with its
							   hover state). */ }

							<ToolsPanelItem
								label={ __( 'Box shadow (desktop)', 'sgs-blocks' ) }
								hasValue={ () => !! boxShadow }
								onDeselect={ () => setAttributes( { boxShadow: '', boxShadowColour: '' } ) }
							>
								<ShadowControl
									label={ __( 'Box shadow (desktop)', 'sgs-blocks' ) }
									attributes={ attributes }
									setAttributes={ setAttributes }
									attrNames={ {
										base: 'boxShadow',
										colour: 'boxShadowColour',
									} }
								/>
							</ToolsPanelItem>

							{ /* padding/margin are each a single block-owned tier-object attr
							   { desktop, tablet, mobile }, written via ResponsiveOverride +
							   SgsBoxControl; read directly by this block's render.php. */ }
							<ToolsPanelItem
								label={ __( 'Padding', 'sgs-blocks' ) }
								hasValue={ () =>
									Object.keys( attributes.padding ?? {} ).length > 0
								}
								onDeselect={ () =>
									setAttributes( { padding: {} } )
								}
								isShownByDefault
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
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Margin', 'sgs-blocks' ) }
								hasValue={ () =>
									Object.keys( attributes.margin ?? {} ).length > 0
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

							{ /* Width — outer maxWidth (kept-scalar, responsive) + content
							   band width (kept-scalar). Contract §C. */ }
							<ToolsPanelItem
								label={ __( 'Outer max-width', 'sgs-blocks' ) }
								hasValue={ () =>
									!! (
										maxWidth &&
										Object.values( maxWidth ).some(
											( v ) => v !== undefined && v !== null && v !== ''
										)
									)
								}
								onDeselect={ () => setAttributes( { maxWidth: {} } ) }
							>
								<ResponsiveOverride
									label={ __( 'Outer max-width', 'sgs-blocks' ) }
									value={ maxWidth }
									onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
								>
									{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
										<SgsLengthControl
											label={ __( 'Max-width', 'sgs-blocks' ) }
											hideLabelFromVision
											value={ ownValue || '' }
											placeholder={ inherited ? effectiveValue || '' : '' }
											units={ LENGTH_UNITS }
											onChange={ ( val ) => setOwnValue( val ?? '' ) }
											help={ __( 'Leave blank for no cap — on tablet or mobile, blank inherits the tier above.', 'sgs-blocks' ) }
											presets={ false }
										/>
									) }
								</ResponsiveOverride>
							</ToolsPanelItem>
						</ToolsPanel>
					</PanelBody>
				) }

				{ /* ---- Border ---- Box-object interface contract §1/§5: borderWidth
				   is an SGS custom object attr (base only, no tiers); border-radius
				   routes to WP-native style.border.radius (base only — the block
				   declares __experimentalBorder.__experimentalSkipSerialization so it
				   serialises scoped, not inline). */ }
				{ ! inheritStyle && (
					<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
						{ /* Task 0 (2026-08-27) — one composite row (width/style/colour)
						   mirroring native's BorderBoxControl layout, matching
						   sgs/product-card. borderColour has a Hover pair on this
						   block (no hover-gradient attr), so the colour slot uses the
						   multi-state form. Border-radius stays WP-native (below,
						   unchanged) — the block declares
						   __experimentalBorder.__experimentalSkipSerialization so it
						   serialises scoped, not inline. */ }
						<SgsBorderControl
							widthValues={ borderWidth ?? {} }
							onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
							widthPresets={ [ '10', '20', '30' ] }
							styleValue={ borderStyle }
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
								},
							] }
							contrastAgainst={ quoteContrastAgainst }
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
				) }

			</InspectorControls>

			{ /* Canvas — body children (InnerBlocks) + attribution (RichText) sit as
			     FLAT siblings directly inside <blockquote>, mirroring render.php's
			     `$content . $attribution_html` structure. innerBlocksProps.children
			     is destructured out and rendered explicitly alongside the RichText
			     sibling — spreading innerBlocksProps as-is would make its internal
			     `children` win over literal JSX children and drop the RichText.
			     Contract §B3: NO wrapper div — blockProps spreads straight onto the
			     <blockquote>, which IS the block root. */ }
			<blockquote { ...blockProps } { ...innerBlocksRest }>
				{ innerBlocksChildren }
				{ attributionEnabled && (
					<RichText
						tagName={ attributionTag }
						className="wp-block-sgs-quote__attribution"
						style={ attribStyle }
						value={ attribution }
						onChange={ ( val ) => setAttributes( { attribution: val } ) }
						placeholder={ __( '— Attribution…', 'sgs-blocks' ) }
						allowedFormats={ [ 'core/bold', 'core/italic', 'core/link' ] }
					/>
				) }
			</blockquote>
		</>
	);
}
