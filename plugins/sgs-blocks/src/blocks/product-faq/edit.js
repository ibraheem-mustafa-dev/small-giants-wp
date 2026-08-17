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
import { ResponsiveBoxControl, SgsColourPanel } from '../../components';
import { UnitControl } from '../../components/primitives';
import { colourVar } from '../../utils';

const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'Heading 2', 'sgs-blocks' ), value: 'h2' },
	{ label: __( 'Heading 3', 'sgs-blocks' ), value: 'h3' },
	{ label: __( 'Heading 4', 'sgs-blocks' ), value: 'h4' },
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
	const { style, maxWidth, backgroundColour, textColour } = attributes;
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
	if ( textColour ) {
		wrapperStyle.color = /^#|^rgb|^hsl/.test( textColour )
			? textColour
			: colourVar( textColour );
	}

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
		backgroundColour,
		textColour,
	} = attributes;

	const ALLOWED_HEADING_LEVELS = [ 'h2', 'h3', 'h4' ];
	const HeadingTag = ALLOWED_HEADING_LEVELS.includes( headingLevel )
		? headingLevel
		: 'h2';

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
			    heading/card-grid/text). No hover-colour attrs exist on this block,
			    so each row has a single 'normal' state only. */ }
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
								onChange: ( val ) =>
									setAttributes( { backgroundColour: val ?? '' } ),
								linked: true,
							},
						],
					},
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

				{ /* ---- Wrapper (width + responsive box families) ----
				   Box-object interface contract §B/§E: padding/margin base
				   route to WP-native style.spacing.* (skip-serialised →
				   scoped, not inline); tiers are the paddingTablet/
				   paddingMobile + marginTablet/marginMobile object attrs.
				   Border/colour/typography stay on the native WP panels. */ }
				<PanelBody title={ __( 'Wrapper', 'sgs-blocks' ) } initialOpen={ false }>
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
					<UnitControl
						label={ __( 'Outer max-width', 'sgs-blocks' ) }
						value={ maxWidth || '' }
						units={ LENGTH_UNITS }
						onChange={ ( val ) => setAttributes( { maxWidth: val ?? '' } ) }
						help={ __( 'Exact CSS length, e.g. 1200px. Leave blank for no cap.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
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
