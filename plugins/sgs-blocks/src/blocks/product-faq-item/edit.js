import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { SgsColourPanel, fillRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';
import { colourVar, resolveTextColourPreviewStyle } from '../../utils';

const CHEVRON_SVG = (
	<svg
		width="20"
		height="20"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="M6 9l6 6 6-6"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object (border-radius corner set) — mirrors render.php's use of
// wp_style_engine_get_styles so the canvas preview matches the frontend.
function boxShorthand( box, keys ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

// NO-INLINE migration (2026-07-10): color + __experimentalBorder now declare
// __experimentalSkipSerialization, so useBlockProps() no longer auto-applies
// them in the editor canvas either — reproduce a desktop-only preview here
// (matches sgs/quote + sgs/brand-strip's editor preview pattern).
function buildWrapperStyle( attributes ) {
	const {
		backgroundColour,
		backgroundColourGradient,
		textColour,
		textColourGradient,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		borderRadius,
	} = attributes;
	const wrapperStyle = {};

	// D635-pattern migration: background/text preview now reads the flat
	// backgroundColour/textColour attrs (SgsColourPanel) instead of
	// style.color.background/.text (supports.color.background/.text are now
	// false). Mirrors sgs/quote's buildWrapperStyle.
	// D636 gap-closure — textColourGradient sibling wins when set+valid,
	// switching the preview to the background-clip:text shape (matches
	// render.php's sgs_resolve_text_colour_or_gradient()/sgs_text_colour_decl()).
	Object.assign(
		wrapperStyle,
		resolveTextColourPreviewStyle( textColour, textColourGradient, ( val ) =>
			/^#|^rgb|^hsl/.test( val ) ? val : colourVar( val )
		)
	);
	if ( backgroundColour ) {
		wrapperStyle.backgroundColor = /^#|^rgb|^hsl/.test( backgroundColour )
			? backgroundColour
			: colourVar( backgroundColour );
	}
	if ( backgroundColourGradient ) {
		wrapperStyle.backgroundImage = backgroundColourGradient;
	}

	// border* are block-private attrs (SgsBorderControl, D876/D881 standard) —
	// not WP-native style.border.* (undeclared in block.json, silently
	// discarded by WordPress — check-undeclared-attrs finding).
	const borderWidthPreview = boxShorthand( borderWidth, [ 'top', 'right', 'bottom', 'left' ] );
	if ( borderStyle && 'none' !== borderStyle ) {
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
	const radiusPreview = boxShorthand( borderRadius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( radiusPreview ) {
		wrapperStyle.borderRadius = radiusPreview;
	}

	return wrapperStyle;
}

export default function Edit( { attributes, setAttributes, context } ) {
	const { question, isOpen, textColour, textColourGradient, backgroundColour, backgroundColourGradient } = attributes;
	// Editor-canvas desync fix (CHECK A, 2026-08-13): this used to hardcode
	// useState( true ) with a comment justifying it as "always editable" —
	// which meant the `isOpen` ("Open by default") toggle had ZERO visible
	// effect in the editor regardless of its value, while it correctly drove
	// the real frontend <details open> state. Mirrors sgs/accordion-item's
	// own `useState( isOpen )` pattern (accordion-item/edit.js) — the item
	// still starts open/closed per the operator's setting, and remains
	// click-to-toggle for editing either way.
	const [ editorOpen, setEditorOpen ] = useState( isOpen );

	const iconPosition = context[ 'sgs/productFaqIconPosition' ] || 'right';

	const blockProps = useBlockProps( {
		className: 'sgs-product-faq-item',
		style: buildWrapperStyle( attributes ),
	} );

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'sgs-product-faq-item__answer',
			style: { display: editorOpen ? 'block' : 'none' },
		},
		{
			template: [
				[
					'sgs/text',
					{
						placeholder: __(
							'Write a clear, factual answer…',
							'sgs-blocks'
						),
					},
				],
			],
		}
	);

	const chevron = (
		<span
			className="sgs-product-faq-item__chevron"
			style={ editorOpen ? { transform: 'rotate(180deg)' } : undefined }
		>
			{ CHEVRON_SVG }
		</span>
	);

	// Contrast check for border colour — warn if border fails WCAG AA contrast
	// against the item's own background. When the background is a gradient,
	// comparing against the flat colour would compare against a surface that
	// isn't rendered — skip the check entirely in that case.
	const faqItemContrastAgainst =
		backgroundColour && ! backgroundColourGradient
			? backgroundColour
			: '';

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
				<PanelBody title={ __( 'FAQ Item Settings', 'sgs-blocks' ) }>
					<ToggleControl
						label={ __( 'Open by default', 'sgs-blocks' ) }
						help={ __(
							'Show this answer expanded when the page first loads.',
							'sgs-blocks'
						) }
						checked={ isOpen }
						onChange={ ( val ) => setAttributes( { isOpen: val } ) }
						__nextHasNoMarginBottom
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
						contrastAgainst={ faqItemContrastAgainst }
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
			</InspectorControls>
			<div { ...blockProps }>
				{ /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */ }
				<div
					className="sgs-product-faq-item__question"
					onClick={ () => setEditorOpen( ! editorOpen ) }
				>
					{ iconPosition === 'left' && chevron }
					<RichText
						tagName="span"
						className="sgs-product-faq-item__question-text"
						value={ question }
						onChange={ ( val ) =>
							setAttributes( { question: val } )
						}
						placeholder={ __( 'Type the question…', 'sgs-blocks' ) }
						allowedFormats={ [] }
						onClick={ ( e ) => e.stopPropagation() }
					/>
					{ iconPosition === 'right' && chevron }
				</div>
				<div { ...innerBlocksProps } />
			</div>
		</>
	);
}
