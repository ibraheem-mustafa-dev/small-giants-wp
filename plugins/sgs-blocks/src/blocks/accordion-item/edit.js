import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	RichText,
	InspectorControls,
	useSettings,
} from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { BandWrap, tierBoxShorthand, usePreviewTier } from '../../utils';
import { SvgGradientDefs } from '../../utils/svg-gradient-preview';
import { itemWrapperPreview, headerPreview } from './preview-style';
import { SgsColourPanel, fillRow, textRow,
	SgsBorderControl,
	resolveColourToken,
} from '../../components';

// The chevron glyph; a parsed icon gradient paints its stroke through a
// <linearGradient>/<radialGradient> def, as sgs_icon_gradient_css() does.
function Chevron( { gradient, gradientId } ) {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			{ gradient && (
				<defs>
					<SvgGradientDefs id={ gradientId } gradient={ gradient } />
				</defs>
			) }
			<path
				d="M6 9l6 6 6-6"
				stroke={ gradient ? `url(#${ gradientId })` : 'currentColor' }
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default function Edit( { attributes, setAttributes, context, clientId } ) {
	const { title, isOpen } = attributes;

	// D288/D636 pattern (mirrors sgs/container): resolve the wrapper's textColour/
	// textColourGradient pair to a live canvas preview — render.php applies this
	// pair to $root_sel (the whole `.sgs-accordion-item` wrapper, per block.json's
	// `wrapper` element attrMap css:color/css:background-image), so it belongs on
	// the wrapper's own blockProps style, inherited by header/content beneath it.
	const [ colourPalette ] = useSettings( 'color.palette' );

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
	const iconRotation = Number( context[ 'sgs/accordionIconRotation' ] ) || 0;

	// Active editor device, so the canvas previews the same tier the inspector edits.
	const tier = usePreviewTier();
	const wrapper = itemWrapperPreview( attributes, tier, colourPalette );
	const head = headerPreview( context, colourPalette, editorOpen );
	const iconGradientId = `${ clientId }-icon-gradient`;
	// Mirrors render.php's $sgs_ai_px_tiers closure: the narrowest tier holding a
	// value wins and falls back outwards, which is what the emitted media queries
	// do on the front end. allowZero matches that closure's own flag — 0 is a real
	// choice for a gap or a height floor, never for an icon size.
	const pxTier = ( obj, allowZero ) =>
		[ tier, 'tablet', 'desktop' ]
			.slice( tier === 'mobile' ? 0 : tier === 'tablet' ? 1 : 2 )
			.map( ( t ) => ( obj || {} )[ t ] )
			.find(
				( v ) =>
					typeof v === 'number' && ( allowZero ? v >= 0 : v > 0 )
			);
	const iconSizeTier = pxTier( context[ 'sgs/accordionIconSize' ], false );
	const headerGapTier = pxTier( context[ 'sgs/accordionHeaderGap' ], true );
	const headerMinHeightTier = pxTier(
		context[ 'sgs/accordionHeaderMinHeight' ],
		true
	);
	const slotVars = {
		'--sgs-accordion-header-pad': tierBoxShorthand( context[ 'sgs/accordionHeaderPadding' ], tier ),
		'--sgs-accordion-content-pad': tierBoxShorthand( context[ 'sgs/accordionContentPadding' ], tier ),
		// typeof, not truthiness: a gap or height floor of 0 must still emit.
		'--sgs-accordion-header-gap':
			typeof headerGapTier === 'number' ? `${ headerGapTier }px` : undefined,
		'--sgs-accordion-header-min-h':
			typeof headerMinHeightTier === 'number'
				? `${ headerMinHeightTier }px`
				: undefined,
		'--sgs-accordion-icon-size': iconSizeTier ? `${ iconSizeTier }px` : undefined,
		'--sgs-accordion-icon-rotate': iconRotation > 0 ? `${ iconRotation }deg` : undefined,
	};

	const className = [
		'sgs-accordion-item',
		`sgs-accordion-item--${ accordionStyle }`,
		editorOpen ? 'sgs-accordion-item--open' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( {
		className,
		style: {
			...wrapper.style,
			...slotVars,
		},
	} );

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


	const chevron = (
		<span className="sgs-accordion-item__icons">
			<span
				className={ `sgs-accordion-item__icon-open ${
					iconRotation > 0 ? 'sgs-accordion-item__icon-open--rotates' : ''
				}` }
				style={ head.icon }
			>
				<Chevron gradient={ head.iconGradient } gradientId={ iconGradientId } />
			</span>
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
					textRow( {
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						attrs: {
							base: 'textColour',
							hover: 'textColourHover',
							gradient: 'textColourGradient',
							hoverGradient: 'textColourHoverGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls group="settings">
				{ /* WS-4: mirrored sgs/container wrapper controls (content kind). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
				<PanelBody title={ __( 'Item', 'sgs-blocks' ) } initialOpen={ false }>
					<ToggleControl
						label={ __( 'Open when the page loads', 'sgs-blocks' ) }
						checked={ !! isOpen }
						onChange={ ( value ) => setAttributes( { isOpen: value } ) }
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
						contrastAgainst={ accordionItemContrastAgainst }
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
			<div { ...blockProps }>
			{ /* The content band (.sgs-container__inner) wraps the header and panel
			   when a content width is set, as SGS_Container_Wrapper renders it. */ }
			<BandWrap hasBandProps={ wrapper.hasBandProps } bandStyle={ wrapper.bandStyle }>
			{ /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */ }
			<div
				className="sgs-accordion-item__header"
				style={ head.header }
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
					style={ head.title }
				/>
				{ iconPosition === 'right' && chevron }
			</div>
			<div { ...innerBlocksProps } />
			</BandWrap>
			</div>
		</>
	);
}
