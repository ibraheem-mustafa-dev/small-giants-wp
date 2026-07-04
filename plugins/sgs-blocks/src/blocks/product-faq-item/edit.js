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

export default function Edit( { attributes, setAttributes, context } ) {
	const { question, isOpen } = attributes;
	// Items start open in the editor so the answer is always editable.
	const [ editorOpen, setEditorOpen ] = useState( true );

	const iconPosition = context[ 'sgs/productFaqIconPosition' ] || 'right';

	const blockProps = useBlockProps( {
		className: 'sgs-product-faq-item',
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
