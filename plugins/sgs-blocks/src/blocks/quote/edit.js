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
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import {
	DesignTokenPicker,
	ResponsiveControl,
	ResponsiveBoxControl,
	ResponsiveBorderRadiusControl,
} from '../../components';
import { colourVar } from '../../utils';

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

const FONT_WEIGHT_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Thin (100)', 'sgs-blocks' ), value: '100' },
	{ label: __( 'Extra-light (200)', 'sgs-blocks' ), value: '200' },
	{ label: __( 'Light (300)', 'sgs-blocks' ), value: '300' },
	{ label: __( 'Regular (400)', 'sgs-blocks' ), value: '400' },
	{ label: __( 'Medium (500)', 'sgs-blocks' ), value: '500' },
	{ label: __( 'Semi-bold (600)', 'sgs-blocks' ), value: '600' },
	{ label: __( 'Bold (700)', 'sgs-blocks' ), value: '700' },
	{ label: __( 'Extra-bold (800)', 'sgs-blocks' ), value: '800' },
	{ label: __( 'Black (900)', 'sgs-blocks' ), value: '900' },
];

const FONT_STYLE_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Normal', 'sgs-blocks' ), value: 'normal' },
	{ label: __( 'Italic', 'sgs-blocks' ), value: 'italic' },
];

const TEXT_DECORATION_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
	{ label: __( 'Line-through', 'sgs-blocks' ), value: 'line-through' },
];

const TEXT_TRANSFORM_OPTIONS = [
	{ label: __( '— inherit —', 'sgs-blocks' ), value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Uppercase', 'sgs-blocks' ), value: 'uppercase' },
	{ label: __( 'Lowercase', 'sgs-blocks' ), value: 'lowercase' },
	{ label: __( 'Capitalise', 'sgs-blocks' ), value: 'capitalize' },
];

const FONT_SIZE_UNITS = [
	{ value: 'px', label: 'px', default: 16 },
	{ value: 'em', label: 'em', default: 1 },
	{ value: 'rem', label: 'rem', default: 1 },
];

const LINE_HEIGHT_UNITS = [
	{ value: 'em', label: 'em', default: 1.5 },
	{ value: 'rem', label: 'rem', default: 1.5 },
	{ value: 'px', label: 'px', default: 24 },
	{ value: '', label: '—', default: 1.5 },
];

const MARGIN_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
];

const BORDER_STYLE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Solid', 'sgs-blocks' ), value: 'solid' },
	{ label: __( 'Dashed', 'sgs-blocks' ), value: 'dashed' },
	{ label: __( 'Dotted', 'sgs-blocks' ), value: 'dotted' },
	{ label: __( 'Double', 'sgs-blocks' ), value: 'double' },
	{ label: __( 'Groove', 'sgs-blocks' ), value: 'groove' },
	{ label: __( 'Ridge', 'sgs-blocks' ), value: 'ridge' },
	{ label: __( 'Inset', 'sgs-blocks' ), value: 'inset' },
	{ label: __( 'Outset', 'sgs-blocks' ), value: 'outset' },
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
	const {
		inheritStyle,
		backgroundColour,
		style,
		borderWidth,
		borderStyle,
		borderColour,
		maxWidth,
		contentWidth,
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
	}

	const paddingPreview = boxShorthand( style?.spacing?.padding, [ 'top', 'right', 'bottom', 'left' ] );
	if ( paddingPreview ) {
		wrapperStyle.padding = paddingPreview;
	}
	const marginPreview = boxShorthand( style?.spacing?.margin, [ 'top', 'right', 'bottom', 'left' ] );
	if ( marginPreview ) {
		wrapperStyle.margin = marginPreview;
	}

	if ( maxWidth ) {
		wrapperStyle.maxWidth = maxWidth;
	}
	if ( contentWidth ) {
		wrapperStyle.width = contentWidth;
	}

	return wrapperStyle;
}

function buildAttribStyle( attributes ) {
	const {
		attributionColour, attributionFontSize, attributionFontSizeUnit,
		attributionFontWeight, attributionFontStyle,
		attributionLineHeight, attributionLineHeightUnit,
		attributionMarginTop, attributionMarginUnit,
	} = attributes;
	const style = {};
	if ( attributionColour ) {
		style.color = /^#|^rgb|^hsl/.test( attributionColour )
			? attributionColour
			: colourVar( attributionColour );
	}
	if ( attributionFontSize ) { style.fontSize = `${ attributionFontSize }${ attributionFontSizeUnit }`; }
	if ( attributionFontWeight ) { style.fontWeight = attributionFontWeight; }
	if ( attributionFontStyle ) { style.fontStyle = attributionFontStyle; }
	if ( attributionLineHeight != null ) {
		style.lineHeight = `${ attributionLineHeight }${ attributionLineHeightUnit }`;
	}
	if ( attributionMarginTop != null ) {
		style.marginTop = `${ attributionMarginTop }${ attributionMarginUnit }`;
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
		attributionFontSize,
		attributionFontSizeTablet,
		attributionFontSizeMobile,
		attributionFontSizeUnit,
		attributionFontWeight,
		attributionFontFamily,
		attributionFontStyle,
		attributionTextDecoration,
		attributionTextTransform,
		attributionLineHeight,
		attributionLineHeightUnit,
		attributionMarginTop,
		attributionMarginTopTablet,
		attributionMarginTopMobile,
		attributionMarginUnit,
		backgroundColour,
		borderWidth,
		borderStyle,
		borderColour,
		boxShadow,
		boxShadowHover,
		scaleHover,
		textColourHover,
		backgroundColourHover,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		contentWidth,
		maxWidth,
		maxWidthTablet,
		maxWidthMobile,
		inheritStyle,
		transitionDuration,
		transitionEasing,
	} = attributes;

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

	// Per-breakpoint attr keys for attribution font size.
	const attributionFontSizeBreakpoints = {
		desktop: 'attributionFontSize',
		tablet: 'attributionFontSizeTablet',
		mobile: 'attributionFontSizeMobile',
	};

	// Per-breakpoint attr keys for attribution margin-top.
	const attributionMarginTopBreakpoints = {
		desktop: 'attributionMarginTop',
		tablet: 'attributionMarginTopTablet',
		mobile: 'attributionMarginTopMobile',
	};

	// Per-breakpoint attr keys for max-width (kept-scalar family, contract §C).
	const maxWidthBreakpoints = {
		desktop: 'maxWidth',
		tablet: 'maxWidthTablet',
		mobile: 'maxWidthMobile',
	};

	return (
		<>
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
				<PanelBody
					title={ __( 'Attribution', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show attribution', 'sgs-blocks' ) }
						checked={ attributionEnabled }
						onChange={ ( val ) => setAttributes( { attributionEnabled: val } ) }
						__nextHasNoMarginBottom
					/>
					{ attributionEnabled && (
						<>
							<SelectControl
								label={ __( 'HTML tag', 'sgs-blocks' ) }
								value={ attributionTag }
								options={ ATTRIB_TAG_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionTag: val } ) }
								__nextHasNoMarginBottom
							/>
							<DesignTokenPicker
								label={ __( 'Text colour', 'sgs-blocks' ) }
								value={ attributionColour }
								onChange={ ( val ) => setAttributes( { attributionColour: val ?? '' } ) }
							/>
							<SelectControl
								label={ __( 'Font style', 'sgs-blocks' ) }
								value={ attributionFontStyle }
								options={ FONT_STYLE_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionFontStyle: val } ) }
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __( 'Font weight', 'sgs-blocks' ) }
								value={ attributionFontWeight }
								options={ FONT_WEIGHT_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionFontWeight: val } ) }
								__nextHasNoMarginBottom
							/>

							{ /* Attribution font size — ResponsiveControl + UnitControl per breakpoint */ }
							<ResponsiveControl label={ __( 'Font size', 'sgs-blocks' ) }>
								{ ( breakpoint ) => {
									const attrKey = attributionFontSizeBreakpoints[ breakpoint ];
									const numVal = attributes[ attrKey ];
									const unitVal = attributionFontSizeUnit || 'px';
									return (
										<UnitControl
											label={ __( 'Font size', 'sgs-blocks' ) }
											hideLabelFromVision
											value={ composeUnit( numVal, unitVal ) }
											units={ FONT_SIZE_UNITS }
											onChange={ ( raw ) => {
												const { num, unit } = parseUnit( raw, unitVal );
												setAttributes( {
													[ attrKey ]: num,
													attributionFontSizeUnit: unit,
												} );
											} }
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>

							<TextControl
								label={ __( 'Font family', 'sgs-blocks' ) }
								value={ attributionFontFamily }
								onChange={ ( val ) => setAttributes( { attributionFontFamily: val } ) }
								placeholder={ __( 'Inter, sans-serif', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __( 'Text decoration', 'sgs-blocks' ) }
								value={ attributionTextDecoration }
								options={ TEXT_DECORATION_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionTextDecoration: val } ) }
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={ __( 'Text transform', 'sgs-blocks' ) }
								value={ attributionTextTransform }
								options={ TEXT_TRANSFORM_OPTIONS }
								onChange={ ( val ) => setAttributes( { attributionTextTransform: val } ) }
								__nextHasNoMarginBottom
							/>

							{ /* Attribution line height — UnitControl (single, no responsive) */ }
							<UnitControl
								label={ __( 'Line height', 'sgs-blocks' ) }
								value={ composeUnit( attributionLineHeight, attributionLineHeightUnit ) }
								units={ LINE_HEIGHT_UNITS }
								onChange={ ( raw ) => {
									const { num, unit } = parseUnit( raw, attributionLineHeightUnit || 'em' );
									setAttributes( { attributionLineHeight: num, attributionLineHeightUnit: unit } );
								} }
								__nextHasNoMarginBottom
							/>

							{ /* Attribution margin-top — ResponsiveControl + UnitControl per breakpoint
							   (KEPT-SCALAR single-side family, contract §C). */ }
							<ResponsiveControl label={ __( 'Margin-top (gap above attribution)', 'sgs-blocks' ) }>
								{ ( breakpoint ) => {
									const attrKey = attributionMarginTopBreakpoints[ breakpoint ];
									const numVal = attributes[ attrKey ];
									const unitVal = attributionMarginUnit || 'px';
									if ( breakpoint === 'desktop' ) {
										return (
											<UnitControl
												label={ __( 'Margin-top', 'sgs-blocks' ) }
												hideLabelFromVision
												value={ composeUnit( numVal, unitVal ) }
												units={ MARGIN_UNITS }
												onChange={ ( raw ) => {
													const { num, unit } = parseUnit( raw, unitVal );
													setAttributes( {
														attributionMarginTop: num,
														attributionMarginUnit: unit,
													} );
												} }
												__nextHasNoMarginBottom
											/>
										);
									}
									return (
										<RangeControl
											label={ breakpoint === 'tablet'
												? __( 'Margin-top (tablet)', 'sgs-blocks' )
												: __( 'Margin-top (mobile)', 'sgs-blocks' )
											}
											value={ numVal ?? '' }
											onChange={ ( val ) => setAttributes( { [ attrKey ]: val } ) }
											min={ 0 } max={ 80 } step={ 1 } allowReset
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>
						</>
					) }
				</PanelBody>

				{ /* ---- Wrapper ---- */ }
				{ ! inheritStyle && (
					<PanelBody
						title={ __( 'Wrapper', 'sgs-blocks' ) }
						initialOpen={ false }
					>
						<DesignTokenPicker
							label={ __( 'Background colour', 'sgs-blocks' ) }
							value={ backgroundColour }
							onChange={ ( val ) => setAttributes( { backgroundColour: val ?? '' } ) }
						/>

						<TextControl
							label={ __( 'Box shadow (desktop)', 'sgs-blocks' ) }
							value={ boxShadow }
							onChange={ ( val ) => setAttributes( { boxShadow: val } ) }
							placeholder={ __( '0 4px 12px rgba(0,0,0,0.1)', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>

						{ /* Box-object interface contract §B/§E: padding/margin base routes
						   to WP-native style.spacing.* (skip-serialised → scoped, not
						   inline); tiers are the paddingTablet/paddingMobile +
						   marginTablet/marginMobile object attrs. */ }
						<ResponsiveBoxControl
							label={ __( 'Padding', 'sgs-blocks' ) }
							values={ {
								base: style?.spacing?.padding ?? {},
								tablet: paddingTablet ?? {},
								mobile: paddingMobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								if ( 'base' === tier ) {
									setAttributes( { style: { ...style, spacing: { ...style?.spacing, padding: next } } } );
								} else {
									setAttributes( { [ `padding${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
								}
							} }
						/>
						<ResponsiveBoxControl
							label={ __( 'Margin', 'sgs-blocks' ) }
							values={ {
								base: style?.spacing?.margin ?? {},
								tablet: marginTablet ?? {},
								mobile: marginMobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								if ( 'base' === tier ) {
									setAttributes( { style: { ...style, spacing: { ...style?.spacing, margin: next } } } );
								} else {
									setAttributes( { [ `margin${ 'tablet' === tier ? 'Tablet' : 'Mobile' }` ]: next } );
								}
							} }
						/>

						{ /* Width — outer maxWidth (kept-scalar, responsive) + content
						   band width (kept-scalar). Contract §C. */ }
						<ResponsiveControl label={ __( 'Outer max-width', 'sgs-blocks' ) }>
							{ ( breakpoint ) => {
								const attrKey = maxWidthBreakpoints[ breakpoint ];
								return (
									<UnitControl
										label={ __( 'Max-width', 'sgs-blocks' ) }
										hideLabelFromVision
										value={ attributes[ attrKey ] || '' }
										units={ LENGTH_UNITS }
										onChange={ ( val ) => setAttributes( { [ attrKey ]: val ?? '' } ) }
										help={ breakpoint === 'desktop' ? __( 'Leave blank for no cap.', 'sgs-blocks' ) : __( 'Leave blank to inherit desktop.', 'sgs-blocks' ) }
										__nextHasNoMarginBottom
									/>
								);
							} }
						</ResponsiveControl>
						<UnitControl
							label={ __( 'Content width', 'sgs-blocks' ) }
							value={ contentWidth || '' }
							units={ LENGTH_UNITS }
							onChange={ ( val ) => setAttributes( { contentWidth: val ?? '' } ) }
							help={ __( 'Exact CSS length, e.g. 900px or 60rem. Leave blank for full width.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						/>
					</PanelBody>
				) }

				{ /* ---- Border ---- Box-object interface contract §1/§5: borderWidth
				   is an SGS custom object attr (base only, no tiers); border-radius
				   routes to WP-native style.border.radius (base only — the block
				   declares __experimentalBorder.__experimentalSkipSerialization so it
				   serialises scoped, not inline). */ }
				{ ! inheritStyle && (
					<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
						<SelectControl
							label={ __( 'Border style', 'sgs-blocks' ) }
							value={ borderStyle }
							options={ BORDER_STYLE_OPTIONS }
							onChange={ ( val ) => setAttributes( { borderStyle: val } ) }
							__nextHasNoMarginBottom
						/>
						{ borderStyle !== 'none' && (
							<DesignTokenPicker
								label={ __( 'Border colour', 'sgs-blocks' ) }
								value={ borderColour }
								onChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
							/>
						) }
						<ResponsiveBoxControl
							label={ __( 'Border width', 'sgs-blocks' ) }
							values={ { base: borderWidth ?? {} } }
							showResponsive={ false }
							onChange={ ( tier, next ) => setAttributes( { borderWidth: next } ) }
						/>
						<ResponsiveBorderRadiusControl
							label={ __( 'Border radius', 'sgs-blocks' ) }
							values={ { base: style?.border?.radius ?? {} } }
							showResponsive={ false }
							onChange={ ( tier, next ) => setAttributes( { style: { ...style, border: { ...style?.border, radius: next } } } ) }
						/>
					</PanelBody>
				) }

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
					/>
					<DesignTokenPicker
						label={ __( 'Text colour on hover', 'sgs-blocks' ) }
						value={ textColourHover }
						onChange={ ( val ) => setAttributes( { textColourHover: val ?? '' } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Background on hover', 'sgs-blocks' ) }
						value={ backgroundColourHover }
						onChange={ ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ) }
					/>
					<TextControl
						label={ __( 'Box shadow on hover', 'sgs-blocks' ) }
						value={ boxShadowHover }
						onChange={ ( val ) => setAttributes( { boxShadowHover: val } ) }
						placeholder={ __( '0 8px 24px rgba(0,0,0,0.15)', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Transition duration (ms)', 'sgs-blocks' ) }
						value={ parseInt( transitionDuration, 10 ) || 300 }
						onChange={ ( val ) => setAttributes( { transitionDuration: String( val ) } ) }
						min={ 0 } max={ 1000 } step={ 50 }
						__nextHasNoMarginBottom
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
					/>
				</PanelBody>
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
