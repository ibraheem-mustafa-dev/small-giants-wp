/**
 * edit.js — Block editor component for sgs/product-faq.
 *
 * NO-INLINE + NO-WRAPPER (per-block no-inline migration contract §A/§B/§B3,
 * 2026-07-10): dropped ContainerWrapperControls (the shared wrapper's
 * kind="content" panel drove maxWidth + a FLAT-attr responsive
 * spacing panel and never drove gap for content kind at all — confirmed dead
 * in class-sgs-container-wrapper.php). Wrapper controls are now local + bind
 * to the OBJECT-shaped box families (paddingTablet/paddingMobile/
 * marginTablet/marginMobile) via ResponsiveBoxControl, mirroring sgs/quote +
 * sgs/brand-strip. Base padding/margin/border/colour/typography stay on the
 * native WP Dimensions/Border/Color/Typography inspector panels (unchanged —
 * they were never routed through ContainerWrapperControls; that component
 * only ever added WidthPanel + the old flat-attr ResponsiveSpacingPanel for
 * kind="content").
 *
 * Editor canvas preview mirrors render.php's scoped-CSS output via inline
 * style on the SAME root element for padding/margin/border-radius/width
 * (the editor canvas is allowed to use inline style for live preview — only
 * the SAVED/RENDERED frontend output must be inline-free, and this block is
 * dynamic (render.php), so nothing here is persisted to post_content).
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
} from '@wordpress/components';
import { ResponsiveBoxControl, SgsColourPanel, SgsLengthControl, fillRow, SgsBorderControl, resolveColourToken, TypographyControls, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { colourVar, resolveTextColourPreviewStyle } from '../../utils';

const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
	{ label: __( 'Paragraph (not a heading)', 'sgs-blocks' ), value: 'p' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
];

const TEMPLATE = [
	[ 'sgs/product-faq-item', {} ],
	[ 'sgs/product-faq-item', {} ],
];

const LENGTH_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: 'rem', label: 'rem', default: 0 },
	{ value: 'em', label: 'em', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder (matches sgs/quote
// + sgs/brand-strip) so the canvas preview matches the frontend.
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

// Desktop-only preview (responsive tiers render via PHP @media, same
// convention as sgs/quote's buildWrapperStyle). Covers the WP-native border
// (radius/width/style/colour — all skip-serialised so useBlockProps() no
// longer auto-applies them) + the SGS kept-scalar width family.
function buildWrapperStyle( attributes ) {
	const { padding, margin, style, maxWidth, backgroundColour, textColour, textColourGradient } = attributes;
	const wrapperStyle = {};

	// D635-pattern migration: background/text preview now reads the flat
	// backgroundColour/textColour attrs (SgsColourPanel) instead of
	// style.color.background/.text (supports.color.background/.text are now
	// false). Mirrors sgs/quote's buildWrapperStyle.
	if ( backgroundColour ) {
		wrapperStyle.backgroundColor = /^#|^rgb|^hsl/.test( backgroundColour )
			? backgroundColour
			: colourVar( backgroundColour );
	}
	// D636 gap-closure — textColourGradient sibling wins when set+valid,
	// switching the preview to the background-clip:text shape (matches
	// render.php's sgs_resolve_text_colour_or_gradient()/sgs_text_colour_decl()).
	Object.assign(
		wrapperStyle,
		resolveTextColourPreviewStyle( textColour, textColourGradient, ( val ) =>
			/^#|^rgb|^hsl/.test( val ) ? val : colourVar( val )
		)
	);

	const radiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( radiusPreview ) {
		wrapperStyle.borderRadius = radiusPreview;
	}
	if ( style?.border?.width ) {
		wrapperStyle.borderWidth = style.border.width;
	}
	if ( style?.border?.style ) {
		wrapperStyle.borderStyle = style.border.style;
	}
	if ( style?.border?.color ) {
		wrapperStyle.borderColor = style.border.color;
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
		wrapperStyle.marginInline = 'auto';
	}

	return wrapperStyle;
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		heading,
		headingLevel,
		iconPosition,
		style,
		paddingTablet,
		paddingMobile,
		marginTablet,
		marginMobile,
		maxWidth,
		textColour,
		textColourGradient,
		backgroundColour,
		backgroundColourGradient,
	} = attributes;

	const ALLOWED_HEADING_LEVELS = [ 'h2', 'h3', 'h4', 'p' ];
	const HeadingTag = ALLOWED_HEADING_LEVELS.includes( headingLevel )
		? headingLevel
		: 'h2';

	// Contrast check for border colour — warn if border fails WCAG AA contrast
	// against the FAQ wrapper's own background. When the background is a gradient,
	// comparing against the flat colour would compare against a surface that
	// isn't rendered — skip the check entirely in that case.
	const faqContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

	const blockProps = useBlockProps( {
		className: 'sgs-product-faq',
		style: buildWrapperStyle( attributes ),
	} );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-product-faq__items' },
		{
			allowedBlocks: [ 'sgs/product-faq-item' ],
			template: TEMPLATE,
		}
	);

	return (
		<>
			{ /* D635-pattern migration: native Text/Background colour panel replaced
			    by flat backgroundColour/textColour attrs surfaced via the shared
			    SgsColourPanel (matches testimonial-slider/process-steps/quote/
			    heading/card-grid/text). Background row is now the FILL variant
			    (fillRow) — gradient + hover moved off the native panel
			    (supports.color.gradients was true, competing with this SGS panel)
			    onto block-private backgroundColour{Hover,Gradient,HoverGradient}
			    attrs, so capability is moved rather than lost. */ }
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
						gradientCapable: true,
						states: [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: textColour,
								onChange: ( val ) =>
									setAttributes( { textColour: val ?? '' } ),
								linked: true,
								gradientValue: textColourGradient,
								onGradientChange: ( val ) =>
									setAttributes( { textColourGradient: val ?? '' } ),
							},
						],
					},
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'FAQ Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Heading level', 'sgs-blocks' ) }
						value={ headingLevel }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { headingLevel: val } )
						}
						help={ __(
							'Pick the level that fits your page outline — usually H2 on a product page.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<SelectControl
						label={ __( 'Icon position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { iconPosition: val } )
						}
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>

			{ /* ── Styles tab ─────────────────────────────────────────────── */ }
			<InspectorControls group="styles">
				<PanelBody
					title={ __( 'Structured data (SEO)', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p className="sgs-product-faq__schema-help">
						{ __(
							'This block automatically outputs FAQPage structured data, which improves AI search citation and Bing visibility. All FAQ blocks on a page are merged into one set of structured data. Keep answers factual and descriptive.',
							'sgs-blocks'
						) }
					</p>
				</PanelBody>

				{ /* Typography — replaces the old WP-native supports.typography
				    (fontSize/lineHeight only) with the shared TypographyControls
				    component + sgs_typography_css_rule() render.php helper
				    (D971/D972 full-replacement track). Root prefix "" since this
				    block has a single styled root element. */ }
				<PanelBody title={ __( 'Typography', 'sgs-blocks' ) } initialOpen={ false }>
					<TypographyControls
						attributes={ attributes }
						setAttributes={ setAttributes }
						prefix=""
					/>
				</PanelBody>

				{ /* ---- Wrapper (width + responsive box families) ----
				   padding/margin are each a single block-owned tier-object
				   attr { desktop, tablet, mobile }, written via
				   ResponsiveOverride + SgsBoxControl; read directly by this
				   block's render.php. Border/colour stay on the native WP
				   panels. */ }
				<PanelBody title={ __( 'Wrapper', 'sgs-blocks' ) } initialOpen={ false }>
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
					<SgsLengthControl
						presets={ false }
						label={ __( 'Outer max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Exact CSS length, e.g. 1200px. Leave blank for no cap.', 'sgs-blocks' ) }
					/>
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
						contrastAgainst={ faqContrastAgainst }
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

			<section { ...blockProps }>
				<RichText
					tagName={ HeadingTag }
					className="sgs-product-faq__heading"
					value={ heading }
					onChange={ ( val ) => setAttributes( { heading: val } ) }
					placeholder={ __(
						'Frequently Asked Questions',
						'sgs-blocks'
					) }
					allowedFormats={ [] }
				/>
				<div { ...innerBlocksProps } />
			</section>
		</>
	);
}
