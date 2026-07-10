import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useState } from '@wordpress/element';

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
	const { style } = attributes;
	const wrapperStyle = {};

	if ( style?.color?.text ) {
		wrapperStyle.color = style.color.text;
	}
	if ( style?.color?.background ) {
		wrapperStyle.backgroundColor = style.color.background;
	}
	if ( style?.color?.gradient ) {
		wrapperStyle.backgroundImage = style.color.gradient;
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
	const radiusPreview = boxShorthand( style?.border?.radius, [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ] );
	if ( radiusPreview ) {
		wrapperStyle.borderRadius = radiusPreview;
	}

	return wrapperStyle;
}

export default function Edit( { attributes, setAttributes, context } ) {
	const { question, isOpen } = attributes;
	// Items start open in the editor so the answer is always editable.
	const [ editorOpen, setEditorOpen ] = useState( true );

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

	return (
		<>
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
