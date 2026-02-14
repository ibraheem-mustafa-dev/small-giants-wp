import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	RichText,
} from '@wordpress/block-editor';
import { useState } from '@wordpress/element';
import { colourVar } from '../../utils';

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
	const { title, isOpen } = attributes;
	const [ editorOpen, setEditorOpen ] = useState( isOpen );

	const accordionStyle = context[ 'sgs/accordionStyle' ] || 'bordered';
	const iconPosition = context[ 'sgs/accordionIconPosition' ] || 'right';
	const headerColour = context[ 'sgs/accordionHeaderColour' ];
	const headerBackground = context[ 'sgs/accordionHeaderBackground' ];
	const iconColour = context[ 'sgs/accordionIconColour' ];

	const className = [
		'sgs-accordion-item',
		`sgs-accordion-item--${ accordionStyle }`,
		editorOpen ? 'sgs-accordion-item--open' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( { className } );

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'sgs-accordion-item__content',
			style: { display: editorOpen ? 'block' : 'none' },
		},
		{
			template: [
				[
					'core/paragraph',
					{
						placeholder: __(
							'Write the answer or content\u2026',
							'sgs-blocks'
						),
					},
				],
			],
		}
	);

	const headerStyle = {
		color: colourVar( headerColour ) || undefined,
		backgroundColor: colourVar( headerBackground ) || undefined,
	};

	const iconStyle = {
		color: colourVar( iconColour ) || undefined,
	};

	const chevron = (
		<span
			className={ `sgs-accordion-item__icon ${
				editorOpen ? 'sgs-accordion-item__icon--open' : ''
			}` }
			style={ iconStyle }
		>
			{ CHEVRON_SVG }
		</span>
	);

	return (
		<div { ...blockProps }>
			{ /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */ }
			<div
				className="sgs-accordion-item__header"
				style={ headerStyle }
				onClick={ () => setEditorOpen( ! editorOpen ) }
			>
				{ iconPosition === 'left' && chevron }
				<RichText
					tagName="span"
					className="sgs-accordion-item__title"
					value={ title }
					onChange={ ( val ) => setAttributes( { title: val } ) }
					placeholder={ __(
						'Accordion item title\u2026',
						'sgs-blocks'
					) }
					onClick={ ( e ) => e.stopPropagation() }
				/>
				{ iconPosition === 'right' && chevron }
			</div>
			<div { ...innerBlocksProps } />
		</div>
	);
}
