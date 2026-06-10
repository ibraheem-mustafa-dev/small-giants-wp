import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

const HEADING_LEVEL_OPTIONS = [
	{ label: __( 'H2', 'sgs-blocks' ), value: 2 },
	{ label: __( 'H3', 'sgs-blocks' ), value: 3 },
	{ label: __( 'H4', 'sgs-blocks' ), value: 4 },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
];

const TEMPLATE = [
	[ 'sgs/product-faq-item', {} ],
	[ 'sgs/product-faq-item', {} ],
];

export default function Edit( { attributes, setAttributes } ) {
	const { heading, headingLevel, iconPosition } = attributes;

	const HeadingTag = `h${ headingLevel }`;

	const blockProps = useBlockProps( { className: 'sgs-product-faq' } );
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-product-faq__items' },
		{
			allowedBlocks: [ 'sgs/product-faq-item' ],
			template: TEMPLATE,
		}
	);

	return (
		<>
			<InspectorControls>
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
				<PanelBody title={ __( 'FAQ Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Heading level', 'sgs-blocks' ) }
						value={ headingLevel }
						options={ HEADING_LEVEL_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { headingLevel: Number( val ) } )
						}
						help={ __(
							'Pick the level that fits your page outline — usually H2 on a product page.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Icon position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { iconPosition: val } )
						}
						__nextHasNoMarginBottom
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
