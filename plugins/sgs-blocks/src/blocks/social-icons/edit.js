/**
 * sgs/social-icons editor: a row of sgs/icon children (a new row starts with one bound icon per filled Site Info
 * key), the Links checklist, and the group defaults the children read: sizes, colours and the group border as
 * --sgs-si-* custom properties on the canvas root (render.php's twin), shape, background, colour mode and the visible
 * label switch and position through block context, and the label gradient and typography as one scoped canvas rule.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { useBlockProps, useInnerBlocksProps, InspectorControls, useSettings, store as blockEditorStore } from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { useSelect, useDispatch } from '@wordpress/data';
import { useMemo } from '@wordpress/element';
import { useInstanceId } from '@wordpress/compose';
import { CheckboxControl, PanelBody, SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import {
	SgsColourPanel,
	fillRow,
	textRow,
	ResponsiveControl,
	ResponsiveOverride,
	SgsLengthControl,
	SgsBoxControl,
	SgsBorderControl,
	LogicalAlignControl,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../components';
import {
	colourVar,
	tierBoxLonghands,
	usePreviewTier,
	resolveTier,
	sgsBorderPreview,
	flattenPresetSetting,
	patchTier,
	isCssGradient,
} from '../../utils';
import { svgStrokeGradientPreview, parseSvgGradient, SvgGradientDefs } from '../../utils/svg-gradient-preview';
import { iconLengthValue } from '../icon/icon-state';
import { ShapeToggle } from '../icon/shape-options';
import { shapeUsesWidthOnly } from '../../utils/icon-shapes';
import { templateFromSiteInfo, checklistRows, toggleLink } from './links';
import { SocialIconLabelsPanel, rowLabelPreviewCss } from './labels';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

const COLOUR_MODES = [
	{ label: __( 'Automatic (brand colours for a brand)', 'sgs-blocks' ), value: 'inherit' },
	{ label: __( 'Brand colours', 'sgs-blocks' ), value: 'brand' },
	{ label: __( 'Brand colour: logo only', 'sgs-blocks' ), value: 'brand-glyph' },
	{ label: __( 'Theme colours', 'sgs-blocks' ), value: 'theme' },
];

/**
 * The canvas root's style at the previewed device: render.php's root rule.
 *
 * @param {Object}   attributes  Block attributes.
 * @param {string}   tier        Previewed device.
 * @param {Array}    palette     Theme colour palette.
 * @param {string[]} presetSlugs Theme spacing preset slugs.
 * @return {Object} React style.
 */
export function rowCanvasStyle( attributes, tier, palette, presetSlugs ) {
	const {
		childIconSize,
		childIconShapeSize,
		childIconShape,
		childIconShapeSizeLinked = true,
		childIconColour,
		childIconColourHover,
		childIconBackground,
		childIconBackgroundGradient,
		childIconBackgroundHover,
		childIconBackgroundHoverGradient,
		childIconBorderColour,
		childIconBorderColourHover,
		childIconBorderWidth,
		childIconBorderStyle,
		childIconLabelColour,
		childIconLabelColourHover,
		gap,
		rowAlign,
	} = attributes;
	const style = {};
	const size = iconLengthValue( resolveTier( childIconSize, tier ).value, 512, presetSlugs );
	if ( size ) {
		style[ '--sgs-si-size' ] = size;
	}
	const box = resolveTier( childIconShapeSize, tier ).value;
	const width = iconLengthValue( box?.width, 640, presetSlugs );
	const height = shapeUsesWidthOnly( childIconShape ) || childIconShapeSizeLinked ? '' : iconLengthValue( box?.height, 640, presetSlugs );
	if ( width ) {
		style[ '--sgs-si-shape-w' ] = width;
	}
	if ( height ) {
		style[ '--sgs-si-shape-h' ] = height;
	}
	const gapValue = iconLengthValue( resolveTier( gap, tier ).value, 640, presetSlugs );
	if ( gapValue ) {
		style.gap = gapValue;
	}
	const groupColours = [
		[ '--sgs-si-colour', childIconColour ],
		[ '--sgs-si-colour-hover', childIconColourHover ],
		[ '--sgs-si-bg', childIconBackground ],
		[ '--sgs-si-bg-hover', childIconBackgroundHover ],
		[ '--sgs-si-border-colour', childIconBorderColour ],
		[ '--sgs-si-border-colour-hover', childIconBorderColourHover ],
		[ '--sgs-si-label-colour', childIconLabelColour ],
		[ '--sgs-si-label-colour-hover', childIconLabelColourHover ],
	];
	groupColours.forEach( ( [ property, slug ] ) => {
		const value = colourVar( slug );
		if ( value ) {
			style[ property ] = value;
		}
	} );
	if ( isCssGradient( childIconBackgroundGradient ) ) {
		style[ '--sgs-si-bg-gradient' ] = childIconBackgroundGradient;
	}
	if ( isCssGradient( childIconBackgroundHoverGradient ) ) {
		style[ '--sgs-si-bg-hover-gradient' ] = childIconBackgroundHoverGradient;
	} else if ( isCssGradient( childIconBackgroundGradient ) && childIconBackgroundHover ) {
		style[ '--sgs-si-bg-hover-gradient' ] = 'none';
	}
	const border = sgsBorderPreview( { widthValues: childIconBorderWidth, styleValue: childIconBorderStyle }, tier, palette );
	if ( border.borderWidth ) {
		style[ '--sgs-si-border-width' ] = border.borderWidth;
		style[ '--sgs-si-border-style' ] = border.borderStyle;
	}
	if ( 'center' === rowAlign ) {
		style.justifyContent = 'center';
	} else if ( 'end' === rowAlign ) {
		style.justifyContent = 'flex-end';
	}
	Object.assign( style, tierBoxLonghands( attributes.padding, tier, 'padding' ) );
	Object.assign( style, tierBoxLonghands( attributes.margin, tier, 'margin' ) );
	return style;
}

/**
 * The group glyph gradient on the canvas: render.php's defs block and stroke rules, scoped to this row.
 *
 * @param {string} scope          The row's canvas class.
 * @param {string} gradient       childIconColourGradient.
 * @param {string} hoverGradient  childIconColourHoverGradient.
 * @return {{gradients:Array<{id:string, gradient:Object}>, css:string}} The gradient definitions and the rules.
 */
export function rowGlyphGradientPreview( scope, gradient, hoverGradient ) {
	const glyph = `.${ scope } .sgs-icon:not(.sgs-icon--own-colour):not(.sgs-icon--mark)`;
	const rest = svgStrokeGradientPreview( gradient, `${ scope }-g` );
	const hover = svgStrokeGradientPreview( hoverGradient, `${ scope }-gh` );
	let css = '';
	const gradients = [];
	if ( rest.css ) {
		css += `${ glyph } .sgs-icon__svg svg{${ rest.css }}`;
		gradients.push( { id: `${ scope }-g`, gradient: parseSvgGradient( gradient ) } );
	}
	if ( hover.css ) {
		css += `${ glyph } .sgs-icon__link:hover .sgs-icon__svg svg{${ hover.css }}`;
		gradients.push( { id: `${ scope }-gh`, gradient: parseSvgGradient( hoverGradient ) } );
	}
	return { gradients, css };
}

export default function Edit( { attributes, setAttributes, clientId } ) {
	const tier = usePreviewTier();
	const [ palette ] = useSettings( 'color.palette' );
	const [ spacingSizes ] = useSettings( 'spacing.spacingSizes' );
	const presetSlugs = flattenPresetSetting( spacingSizes ).map( ( s ) => s.slug );
	const siteInfo = window.sgsBlocksData?.siteInfo;

	const {
		ariaLabel,
		hiddenLinks,
		colourMode,
		childIconSize,
		childIconShape = '',
		childIconShowBackground,
		childIconShapeSize,
		childIconShapeSizeLinked = true,
		childIconBorderWidth,
		childIconBorderStyle,
		childIconBorderColour,
		childIconBorderColourHover,
		childIconShowLabel,
		gap,
		rowAlign,
	} = attributes;

	const children = useSelect( ( select ) => select( blockEditorStore ).getBlocks( clientId ), [ clientId ] );
	const { insertBlock } = useDispatch( blockEditorStore );
	// The template applies only to an empty row, so it never rewrites existing children.
	const template = useMemo( () => templateFromSiteInfo( siteInfo ), [ siteInfo ] );

	const scope = `sgs-si-canvas-${ useInstanceId( Edit ) }`;
	const glyphGradient = rowGlyphGradientPreview( scope, attributes.childIconColourGradient, attributes.childIconColourHoverGradient );
	const labelCss = rowLabelPreviewCss( scope, attributes, tier );
	const blockProps = useBlockProps( {
		className: `sgs-social-icons ${ scope }`,
		style: rowCanvasStyle( attributes, tier, palette, presetSlugs ),
	} );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: [ 'sgs/icon' ],
		template: children.length ? undefined : template,
		templateLock: false,
		orientation: 'horizontal',
	} );

	const rows = checklistRows( children, hiddenLinks, siteInfo );
	const onToggle = ( key, checked ) => {
		const next = toggleLink( key, checked, children, hiddenLinks );
		setAttributes( { hiddenLinks: next.hiddenLinks } );
		if ( next.append ) {
			insertBlock( createBlock( 'sgs/icon', next.append ), children.length, clientId, false );
		}
	};

	const writeShapeSize = ( t, side, value ) => {
		const current = childIconShapeSize?.[ t ] && 'object' === typeof childIconShapeSize[ t ] ? childIconShapeSize[ t ] : {};
		const next = { ...current, [ side ]: value || undefined };
		patchTier( attributes, setAttributes, 'childIconShapeSize', t, next.width || next.height ? next : undefined );
	};

	return (
		<>
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'icon',
						label: __( 'Icon colour', 'sgs-blocks' ),
						attrs: { base: 'childIconColour', hover: 'childIconColourHover', gradient: 'childIconColourGradient', hoverGradient: 'childIconColourHoverGradient' },
						attributes,
						setAttributes,
					} ),
					childIconShowBackground &&
						fillRow( {
							key: 'background',
							label: __( 'Background colour', 'sgs-blocks' ),
							attrs: {
								base: 'childIconBackground',
								hover: 'childIconBackgroundHover',
								gradient: 'childIconBackgroundGradient',
								hoverGradient: 'childIconBackgroundHoverGradient',
							},
							attributes,
							setAttributes,
						} ),
					childIconShowLabel &&
						textRow( {
							key: 'label',
							label: __( 'Label colour', 'sgs-blocks' ),
							attrs: {
								base: 'childIconLabelColour',
								hover: 'childIconLabelColourHover',
								gradient: 'childIconLabelColourGradient',
								hoverGradient: 'childIconLabelColourHoverGradient',
							},
							attributes,
							setAttributes,
						} ),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Links', 'sgs-blocks' ) }>
					<p className="components-base-control__help">
						{ __( 'Each icon links to its Site Info field and hides while that field is empty. Untick to hide an icon; drag icons in List View to reorder them.', 'sgs-blocks' ) }
					</p>
					{ rows.map( ( row ) => (
						<div key={ row.key } className="sgs-social-icons-links__row">
							<CheckboxControl
								label={ row.label }
								checked={ row.checked }
								onChange={ ( value ) => onToggle( row.key, value ) }
								__nextHasNoMarginBottom
							/>
							{ row.missing && (
								<p className="sgs-social-icons-links__flag">
									{ __( 'Filled in Site Info but not in this row: tick it to add it.', 'sgs-blocks' ) }
								</p>
							) }
						</div>
					) ) }
				</PanelBody>
				<PanelBody title={ __( 'Icons', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Colours', 'sgs-blocks' ) }
						help={
							'brand-glyph' === colourMode
								? __( 'Each logo takes its brand colour on the row own background and border (Google keeps its four colours, Instagram its gradient). On hover the border turns the brand colour with a thin ring. A colour set here or on an icon always wins.', 'sgs-blocks' )
								: __( 'For icons left on Automatic. A colour set here or on an icon always wins.', 'sgs-blocks' )
						}
						value={ colourMode || 'inherit' }
						options={ COLOUR_MODES }
						onChange={ ( value ) => setAttributes( { colourMode: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<ResponsiveControl label={ __( 'Icon size', 'sgs-blocks' ) }>
						{ ( t ) => (
							<SgsLengthControl
								label={ __( 'Icon size', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ childIconSize?.[ t ] ?? '' }
								units={ LENGTH_UNITS }
								presets
								help={ __( 'Every icon without its own size. Blank: 32px.', 'sgs-blocks' ) }
								onChange={ ( value ) => patchTier( attributes, setAttributes, 'childIconSize', t, value || undefined ) }
							/>
						) }
					</ResponsiveControl>
				</PanelBody>
				<PanelBody title={ __( 'Icon shape', 'sgs-blocks' ) } initialOpen={ false }>
					<ShapeToggle
						label={ __( 'Shape', 'sgs-blocks' ) }
						help={ __( 'For icons left on the square. With no shape picked (click the picked one again), each icon keeps its own.', 'sgs-blocks' ) }
						value={ childIconShape }
						onChange={ ( value ) => setAttributes( { childIconShape: value ?? '' } ) }
						isDeselectable
					/>
					<ToggleControl
						label={ __( 'Background', 'sgs-blocks' ) }
						help={ __( 'Paints a shape behind every icon.', 'sgs-blocks' ) }
						checked={ !! childIconShowBackground }
						onChange={ ( value ) => setAttributes( { childIconShowBackground: value } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
				<PanelBody title={ __( 'Shape size', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveControl label={ __( 'Shape size', 'sgs-blocks' ) }>
						{ ( t ) => (
							<>
								<SgsLengthControl
									label={ shapeUsesWidthOnly( childIconShape ) || childIconShapeSizeLinked ? __( 'Size', 'sgs-blocks' ) : __( 'Width', 'sgs-blocks' ) }
									value={ childIconShapeSize?.[ t ]?.width ?? '' }
									units={ LENGTH_UNITS }
									presets
									help={ __( 'Blank: the icon size plus a little room each side.', 'sgs-blocks' ) }
									onChange={ ( value ) => writeShapeSize( t, 'width', value ) }
								/>
								{ ! shapeUsesWidthOnly( childIconShape ) && ! childIconShapeSizeLinked && (
									<SgsLengthControl
										label={ __( 'Height', 'sgs-blocks' ) }
										value={ childIconShapeSize?.[ t ]?.height ?? '' }
										units={ LENGTH_UNITS }
										presets
										onChange={ ( value ) => writeShapeSize( t, 'height', value ) }
									/>
								) }
							</>
						) }
					</ResponsiveControl>
					{ ! shapeUsesWidthOnly( childIconShape ) && (
						<ToggleControl
							label={ __( 'Same width and height', 'sgs-blocks' ) }
							checked={ childIconShapeSizeLinked }
							onChange={ ( value ) => setAttributes( { childIconShapeSizeLinked: value } ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>
				<PanelBody title={ __( 'Icon border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ childIconBorderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { childIconBorderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ childIconBorderStyle }
						onStyleChange={ ( value ) => setAttributes( { childIconBorderStyle: value ?? '' } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourStates={ [
							{
								key: 'normal',
								label: __( 'Normal', 'sgs-blocks' ),
								value: childIconBorderColour,
								linked: true,
								onChange: ( value ) => setAttributes( { childIconBorderColour: value ?? '' } ),
							},
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: childIconBorderColourHover,
								linked: true,
								onChange: ( value ) => setAttributes( { childIconBorderColourHover: value ?? '' } ),
							},
						] }
					/>
				</PanelBody>
				<SocialIconLabelsPanel attributes={ attributes } setAttributes={ setAttributes } />
				<PanelBody title={ __( 'Row', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveControl label={ __( 'Gap between icons', 'sgs-blocks' ) }>
						{ ( t ) => (
							<SgsLengthControl
								label={ __( 'Gap between icons', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ gap?.[ t ] ?? '' }
								units={ LENGTH_UNITS }
								presets
								onChange={ ( value ) => patchTier( attributes, setAttributes, 'gap', t, value || undefined ) }
							/>
						) }
					</ResponsiveControl>
					<LogicalAlignControl
						label={ __( 'Alignment', 'sgs-blocks' ) }
						value={ rowAlign }
						onChange={ ( value ) => setAttributes( { rowAlign: value || 'start' } ) }
					/>
				</PanelBody>
				<PanelBody title={ __( 'Accessibility', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'List name', 'sgs-blocks' ) }
						help={ __( 'What screen readers call this row of links.', 'sgs-blocks' ) }
						placeholder={ __( 'Social media and contact', 'sgs-blocks' ) }
						value={ ariaLabel }
						onChange={ ( value ) => setAttributes( { ariaLabel: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Spacing', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride value={ attributes.padding } onChange={ ( obj ) => setAttributes( { padding: obj } ) }>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Padding', 'sgs-blocks' ) }
								values={ ownValue && 'object' === typeof ownValue ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
					<ResponsiveOverride value={ attributes.margin } onChange={ ( obj ) => setAttributes( { margin: obj } ) }>
						{ ( { ownValue, setOwnValue } ) => (
							<SgsBoxControl
								label={ __( 'Margin', 'sgs-blocks' ) }
								values={ ownValue && 'object' === typeof ownValue ? ownValue : {} }
								units={ BOX_UNITS }
								presets
								onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
							/>
						) }
					</ResponsiveOverride>
				</PanelBody>
			</InspectorControls>
			<div { ...innerBlocksProps }>
				{ glyphGradient.gradients.length > 0 && (
					<svg className="sgs-social-icons__defs" aria-hidden="true" focusable="false">
						<defs>
							{ glyphGradient.gradients.map( ( g ) => (
								<SvgGradientDefs key={ g.id } id={ g.id } gradient={ g.gradient } />
							) ) }
						</defs>
					</svg>
				) }
				{ glyphGradient.css && <style>{ glyphGradient.css }</style> }
				{ labelCss && <style>{ labelCss }</style> }
				{ innerBlocksProps.children }
			</div>
		</>
	);
}
