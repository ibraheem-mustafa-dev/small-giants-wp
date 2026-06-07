import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { DesignTokenPicker, ResponsiveControl } from '../../components';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing only).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

/**
 * FR-22-6 migration: all card content (icon/media, heading, subtitle,
 * description, and button) is now rendered as InnerBlocks child blocks.
 * RichText inline editing of heading/description/subtitle has been removed —
 * those elements are now editable as child blocks in the InnerBlocks slot.
 *
 * Inspector controls for STYLING/LAYOUT scalar attrs are preserved:
 *   cardStyle, hoverEffect, iconPosition, iconSize*, headingFontSize*,
 *   subtitleFontSize*, headingColour, descriptionColour, subtitleColour,
 *   iconColour, iconBackgroundColour, hover*, transition*, blockLink*, etc.
 *
 * The showMedia/showTitle/showSubtitle/showText/showButton toggles and
 * elementOrder reorder UI are retained as inspector controls — they are
 * styling/layout signals that drive CSS classes + render.php wrapper classes,
 * and they are still needed for the deprecation migration shape.
 */

const CARD_STYLE_OPTIONS = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Border accent', 'sgs-blocks' ), value: 'border-accent' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

const ICON_SIZE_OPTIONS = [
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
];

const FONT_SIZE_OPTIONS = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'Small', 'sgs-blocks' ), value: 'small' },
	{ label: __( 'Medium', 'sgs-blocks' ), value: 'medium' },
	{ label: __( 'Large', 'sgs-blocks' ), value: 'large' },
	{ label: __( 'XL', 'sgs-blocks' ), value: 'x-large' },
	{ label: __( 'XXL', 'sgs-blocks' ), value: 'xx-large' },
];

/**
 * Default InnerBlocks template for a new info-box.
 * Produces: icon → heading → description paragraph → button.
 * Operators customise the child blocks in place in the editor.
 */
const INFO_BOX_TEMPLATE = [
	[ 'sgs/icon', { icon: 'star-filled', iconColour: 'primary', iconBackgroundColour: 'accent-light', iconSize: 'medium' } ],
	[ 'sgs/heading', { level: 'h3', headingRole: 'heading', content: __( 'Feature heading', 'sgs-blocks' ) } ],
	[ 'sgs/text', { text: __( 'Describe the feature or benefit here.', 'sgs-blocks' ) } ],
	[
		'sgs/multi-button',
		{},
		[ [ 'sgs/button', { inheritStyle: 'primary', label: __( 'Learn More', 'sgs-blocks' ) } ] ],
	],
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		cardStyle,
		hoverEffect,
		iconPosition,
		iconSize,
		iconSizeTablet,
		iconSizeMobile,
		iconColour,
		iconBackgroundColour,
		headingColour,
		headingFontSize,
		headingFontSizeTablet,
		headingFontSizeMobile,
		subtitleColour,
		subtitleFontSize,
		subtitleFontSizeTablet,
		subtitleFontSizeMobile,
		descriptionColour,
		link,
		linkOpensNewTab,
	} = attributes;

	const className = [
		'sgs-info-box',
		`sgs-info-box--${ cardStyle }`,
		`sgs-info-box--hover-${ hoverEffect }`,
		`sgs-info-box--media-${ iconPosition }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	// FR-22-6: single InnerBlocks slot covers ALL card content.
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template:     INFO_BOX_TEMPLATE,
		// Open: converter injects varied child block combinations.
		// Do not lock allowedBlocks so the editor remains flexible.
	} );

	return (
		<>
			<InspectorControls>
				{ /* WS-4: mirrored sgs/container wrapper controls (content kind = width/spacing). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
				{ /* ===== Card Style ===== */ }
				<PanelBody title={ __( 'Card Style', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) => setAttributes( { hoverEffect: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ===== Layout ===== */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Media position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) => setAttributes( { iconPosition: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ===== Icon Defaults ===== */ }
				<PanelBody title={ __( 'Icon Defaults', 'sgs-blocks' ) } initialOpen={ false }>
					<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
						{ __(
							'These defaults apply to newly inserted icon child blocks. Edit individual icon blocks directly for per-instance overrides.',
							'sgs-blocks'
						) }
					</p>
					<ResponsiveControl label={ __( 'Icon size', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'iconSize',
								tablet:  'iconSizeTablet',
								mobile:  'iconSizeMobile',
							};
							return (
								<SelectControl
									value={ attributes[ attrMap[ breakpoint ] ] || '' }
									options={
										breakpoint === 'desktop'
											? ICON_SIZE_OPTIONS
											: [
													{
														label: __( 'Same as desktop', 'sgs-blocks' ),
														value: '',
													},
													...ICON_SIZE_OPTIONS,
												]
									}
									onChange={ ( val ) =>
										setAttributes( { [ attrMap[ breakpoint ] ]: val } )
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
					<DesignTokenPicker
						label={ __( 'Icon colour', 'sgs-blocks' ) }
						value={ iconColour }
						onChange={ ( val ) => setAttributes( { iconColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Icon background colour', 'sgs-blocks' ) }
						value={ iconBackgroundColour }
						onChange={ ( val ) =>
							setAttributes( { iconBackgroundColour: val } )
						}
					/>
				</PanelBody>

				{ /* ===== Heading Styling ===== */ }
				<PanelBody title={ __( 'Heading Styling', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Heading colour', 'sgs-blocks' ) }
						value={ headingColour }
						onChange={ ( val ) => setAttributes( { headingColour: val } ) }
					/>
					<ResponsiveControl label={ __( 'Heading font size', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'headingFontSize',
								tablet:  'headingFontSizeTablet',
								mobile:  'headingFontSizeMobile',
							};
							return (
								<SelectControl
									value={ attributes[ attrMap[ breakpoint ] ] || '' }
									options={
										breakpoint === 'desktop'
											? FONT_SIZE_OPTIONS
											: [
													{
														label: __( 'Same as desktop', 'sgs-blocks' ),
														value: '',
													},
													...FONT_SIZE_OPTIONS.filter(
														( opt ) => opt.value !== ''
													),
												]
									}
									onChange={ ( val ) =>
										setAttributes( { [ attrMap[ breakpoint ] ]: val } )
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>

				{ /* ===== Subtitle Styling ===== */ }
				<PanelBody title={ __( 'Subtitle Styling', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Subtitle colour', 'sgs-blocks' ) }
						value={ subtitleColour }
						onChange={ ( val ) => setAttributes( { subtitleColour: val } ) }
					/>
					<ResponsiveControl label={ __( 'Subtitle font size', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'subtitleFontSize',
								tablet:  'subtitleFontSizeTablet',
								mobile:  'subtitleFontSizeMobile',
							};
							return (
								<SelectControl
									value={ attributes[ attrMap[ breakpoint ] ] || '' }
									options={
										breakpoint === 'desktop'
											? FONT_SIZE_OPTIONS
											: [
													{
														label: __( 'Same as desktop', 'sgs-blocks' ),
														value: '',
													},
													...FONT_SIZE_OPTIONS.filter(
														( opt ) => opt.value !== ''
													),
												]
									}
									onChange={ ( val ) =>
										setAttributes( { [ attrMap[ breakpoint ] ]: val } )
									}
									__nextHasNoMarginBottom
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>

				{ /* ===== Text Body Styling ===== */ }
				<PanelBody title={ __( 'Text Body Styling', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Text colour', 'sgs-blocks' ) }
						value={ descriptionColour }
						onChange={ ( val ) =>
							setAttributes( { descriptionColour: val } )
						}
					/>
				</PanelBody>

				{ /* ===== Legacy link (kept for existing content) ===== */ }
				<PanelBody
					title={ __( 'Legacy Link', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
						{ __(
							'Use a button child block for new links. This field is kept for backwards compatibility with existing info boxes.',
							'sgs-blocks'
						) }
					</p>
					<TextControl
						label={ __( 'Link URL', 'sgs-blocks' ) }
						value={ link || '' }
						onChange={ ( val ) => setAttributes( { link: val } ) }
						type="url"
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Open in new tab', 'sgs-blocks' ) }
						checked={ linkOpensNewTab }
						onChange={ ( val ) =>
							setAttributes( { linkOpensNewTab: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			{ /* FR-22-6: innerBlocksProps spread onto the wrapper div — the
			     InnerBlocks slot IS the card content area. */ }
			<div { ...innerBlocksProps } />
		</>
	);
}
