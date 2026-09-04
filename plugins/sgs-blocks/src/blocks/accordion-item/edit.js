import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	RichText,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { colourVar } from '../../utils';
import { SgsColourPanel, fillRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';

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

export default function Edit( { attributes, setAttributes, context, clientId } ) {
	const { title, isOpen, backgroundColour, backgroundColourGradient, textColour, textColourGradient } = attributes;

	// Position of this item among its accordion siblings — mirrors sgs/tab's
	// index derivation, needed to compare against the parent's `defaultOpen`
	// (index-based) attribute so the editor canvas can preview it.
	const itemIndex = useSelect(
		( select ) => {
			const { getBlockRootClientId, getBlockIndex } =
				select( 'core/block-editor' );
			const parentId = getBlockRootClientId( clientId );
			return getBlockIndex( clientId, parentId );
		},
		[ clientId ]
	);

	const defaultOpenIndex = context[ 'sgs/accordionDefaultOpen' ];
	const isDefaultOpenItem =
		typeof defaultOpenIndex === 'number' &&
		defaultOpenIndex >= 0 &&
		defaultOpenIndex === itemIndex;

	// null = no manual click override yet this session — follow isOpen/defaultOpen.
	const [ manualOpen, setManualOpen ] = useState( null );
	const editorOpen =
		manualOpen !== null ? manualOpen : isOpen || isDefaultOpenItem;

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
					'sgs/text',
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

	// Contrast check for border colour against the accordion item's own background.
	// When the background has a gradient sibling, skip the check (flat colour would be inaccurate).
	const accordionItemContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	return (
		<>
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
			<InspectorControls group="settings">
				{ /* WS-4: mirrored sgs/container wrapper controls (content kind). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
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
						contrastAgainst={ accordionItemContrastAgainst }
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
				className="sgs-accordion-item__header"
				style={ headerStyle }
				onClick={ () => setManualOpen( ! editorOpen ) }
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
		</>
	);
}
