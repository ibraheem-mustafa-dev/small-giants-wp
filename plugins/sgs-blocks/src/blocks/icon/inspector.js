/**
 * sgs/icon inspector: colours, the Icon panel (glyph, size, fill, rotation, colour mode, link), accessibility and
 * the Styles-tab panels. The Shape and Border panels live in inspector-shape.js.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	Notice,
	PanelBody,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import {
	SgsColourPanel,
	fillRow,
	textRow,
	IconPicker,
	LinkPopoverField,
	ResponsiveControl,
	ResponsiveOverride,
	SgsLengthControl,
	SgsBoxControl,
	BOX_UNITS,
	normaliseResponsiveBox,
} from '../../components';
import { patchTier } from '../../utils';
import { BRANDS } from '../../utils/brand-registry';
import { isOutlineShape } from '../../utils/icon-shapes';
import ShapePanels from './inspector-shape';
import { metadataWithoutLinkBinding } from './icon-state';

/**
 * An outline shape fills with a flat colour only (render.php prints no background gradient for it), so its background
 * row drops the gradient toggle from every state and says why: never a control that paints nothing.
 *
 * @param {Object}  row     A fillRow() descriptor.
 * @param {boolean} outline The painted shape is a custom outline.
 * @return {Object} The row.
 */
function solidForOutline( row, outline ) {
	if ( ! outline ) {
		return row;
	}
	return {
		...row,
		states: row.states.map( ( { gradientValue, onGradientChange, ...state } ) => state ), // eslint-disable-line no-unused-vars
		after: (
			<p className="components-base-control__help">
				{ __( 'Gradients paint the square, circle and pill only; this shape fills with a flat colour.', 'sgs-blocks' ) }
			</p>
		),
	};
}

const ICON_SOURCES = [ 'lucide', 'brand', 'emoji', 'wp-icon', 'dashicon', 'custom' ];

const COLOUR_MODES = [
	{ label: __( 'Automatic (brand colours for a brand)', 'sgs-blocks' ), value: 'inherit' },
	{ label: __( 'Brand colours', 'sgs-blocks' ), value: 'brand' },
	{ label: __( 'Theme colours', 'sgs-blocks' ), value: 'theme' },
];

const TEXT_ALIGN_OPTIONS = [
	{ label: __( 'Inherit', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
	{ label: __( 'Justify', 'sgs-blocks' ), value: 'justify' },
];

const SIZE_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
];

/**
 * The per-source attribute holding the icon's identifier.
 *
 * @param {Object} attrs Block attributes.
 * @return {string} Name, slug, character or SVG for the active source.
 */
export function currentIconName( attrs ) {
	switch ( attrs.iconSource ) {
		case 'emoji':
			return attrs.emojiChar;
		case 'dashicon':
			return attrs.dashiconName;
		case 'wp-icon':
			return attrs.wpIconName;
		case 'custom':
			return attrs.iconSvg;
		case 'brand':
			return attrs.brandName;
		default:
			return attrs.iconName;
	}
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {Object}   props.state         { boundKey, link (siteInfoLinkState), brand (resolveBrand), name (accessibleName),
 *                                       paintedShape (the shape the canvas paints) }.
 * @return {JSX.Element} Inspector panels.
 */
export default function IconInspector( { attributes, setAttributes, state } ) {
	const { iconSource, iconSvg, iconSize, iconFill, iconRotate, colourMode, showBackground, linkUrl, linkTarget, linkRel, ariaLabel, scaleHover, opacityHover, textAlign } = attributes;
	const { boundKey, link, brand, name, paintedShape } = state;
	// The shape the canvas paints (a row's group shape replaces the square), which decides what the colours can do.
	const outlineShown = isOutlineShape( paintedShape || attributes.shape );
	const strokeGlyph = ! [ 'emoji', 'dashicon' ].includes( iconSource ) && ! ( 'brand' === iconSource && brand.glyphBrand?.glyph?.svg );

	const handleIconChange = ( { source, name: picked, svg } ) => {
		const next = { iconSource: source };
		const field = { emoji: 'emojiChar', dashicon: 'dashiconName', 'wp-icon': 'wpIconName', custom: 'iconSvg', brand: 'brandName' }[ source ] || 'iconName';
		next[ field ] = 'custom' === source ? svg : picked;
		setAttributes( next );
	};

	return (
		<>
			<SgsColourPanel
				rows={ [
					textRow( {
						key: 'icon',
						label: __( 'Icon colour', 'sgs-blocks' ),
						attrs: { base: 'iconColour', hover: 'iconColourHover', gradient: 'iconColourGradient', hoverGradient: 'iconColourHoverGradient' },
						attributes,
						setAttributes,
					} ),
					( showBackground || brand.brandOn ) &&
						solidForOutline(
							fillRow( {
								key: 'background',
								label: __( 'Background colour', 'sgs-blocks' ),
								attrs: { base: 'backgroundColour', hover: 'backgroundColourHover', gradient: 'backgroundColourGradient', hoverGradient: 'backgroundColourHoverGradient' },
								attributes,
								setAttributes,
							} ),
							outlineShown
						),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Icon', 'sgs-blocks' ) }>
					<IconPicker
						label={ __( 'Icon', 'sgs-blocks' ) }
						value={ { source: iconSource, name: currentIconName( attributes ), svg: 'custom' === iconSource ? iconSvg : undefined } }
						sources={ ICON_SOURCES }
						brands={ BRANDS }
						onChange={ handleIconChange }
					/>
					<ResponsiveControl label={ __( 'Icon size', 'sgs-blocks' ) }>
						{ ( tier ) => (
							<SgsLengthControl
								label={ __( 'Icon size', 'sgs-blocks' ) }
								hideLabelFromVision
								value={ iconSize?.[ tier ] ?? '' }
								units={ SIZE_UNITS }
								presets
								help={ __( 'Leave blank for the group size, else 32px.', 'sgs-blocks' ) }
								onChange={ ( value ) => patchTier( attributes, setAttributes, 'iconSize', tier, value || undefined ) }
							/>
						) }
					</ResponsiveControl>
					{ strokeGlyph && (
						<ToggleControl
							label={ __( 'Fill the icon', 'sgs-blocks' ) }
							help={ __( 'Fills an outline icon with its colour.', 'sgs-blocks' ) }
							checked={ !! iconFill }
							onChange={ ( value ) => setAttributes( { iconFill: value } ) }
							__nextHasNoMarginBottom
						/>
					) }
					<SelectControl
						label={ __( 'Colours', 'sgs-blocks' ) }
						help={
							brand.colourBrand
								? sprintf(
										/* translators: %s: brand name, e.g. WhatsApp. */
										__( 'This icon is %s. A colour you set above always wins.', 'sgs-blocks' ),
										brand.colourBrand.label
								  )
								: __( 'Brand colours apply to an icon linked to a social network or showing its logo.', 'sgs-blocks' )
						}
						value={ colourMode || 'inherit' }
						options={ COLOUR_MODES }
						onChange={ ( value ) => setAttributes( { colourMode: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ link.bound ? (
						<BaseControl
							id="sgs-icon-bound-link"
							label={ __( 'Link', 'sgs-blocks' ) }
							help={ __( 'The link follows Site Info; change it there. Unlink to type your own.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
						>
							<p className="sgs-icon-bound-link">
								{ sprintf(
									/* translators: %s: Site Info field, e.g. Phone. */
									__( 'Linked to Site Info: %s', 'sgs-blocks' ),
									link.label
								) }
							</p>
							<Button
								variant="secondary"
								size="compact"
								onClick={ () => setAttributes( { metadata: metadataWithoutLinkBinding( attributes.metadata ) } ) }
							>
								{ __( 'Unlink', 'sgs-blocks' ) }
							</Button>
						</BaseControl>
					) : (
						<LinkPopoverField
							label={ __( 'Link', 'sgs-blocks' ) }
							help={ __( 'Search your site or paste a URL to make this icon clickable.', 'sgs-blocks' ) }
							value={ { url: linkUrl, linkTarget, rel: linkRel } }
							targetMode="boolean"
							onChange={ ( next ) => {
								const patch = {};
								if ( undefined !== next.url ) patch.linkUrl = next.url;
								if ( undefined !== next.linkTarget ) patch.linkTarget = next.linkTarget;
								if ( undefined !== next.rel ) patch.linkRel = next.rel;
								setAttributes( patch );
							} }
						/>
					) }
				</PanelBody>
				<ShapePanels attributes={ attributes } setAttributes={ setAttributes } brandOn={ brand.brandOn } outlineShown={ outlineShown } />
				<PanelBody title={ __( 'Accessibility', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Accessible label', 'sgs-blocks' ) }
						help={
							linkUrl || boundKey
								? sprintf(
										/* translators: %s: the name screen readers announce. */
										__( 'What screen readers say for this link. Blank: "%s".', 'sgs-blocks' ),
										name.name
								  )
								: __( 'Describes the icon for screen readers. Leave blank for a decorative icon.', 'sgs-blocks' )
						}
						value={ ariaLabel }
						onChange={ ( value ) => setAttributes( { ariaLabel: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					{ ( linkUrl || boundKey ) && [ '', 'host' ].includes( name.from ) && (
						<Notice status="warning" isDismissible={ false }>
							{ '' === name.from
								? __( 'This link has no name for screen readers. Add an accessible label.', 'sgs-blocks' )
								: sprintf(
										/* translators: %s: site name taken from the link. */
										__( 'Screen readers will only hear "%s". Add an accessible label that says where the link goes.', 'sgs-blocks' ),
										name.name
								  ) }
						</Notice>
					) }
				</PanelBody>
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Text align', 'sgs-blocks' ) }
						value={ textAlign }
						options={ TEXT_ALIGN_OPTIONS }
						onChange={ ( value ) => setAttributes( { textAlign: value } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Rotation (degrees)', 'sgs-blocks' ) }
						help={ __( 'Turns the icon and its shape without changing the space it takes up.', 'sgs-blocks' ) }
						value={ iconRotate ?? 0 }
						onChange={ ( value ) => setAttributes( { iconRotate: value ?? 0 } ) }
						min={ -180 }
						max={ 180 }
						step={ 5 }
						allowReset
						resetFallbackValue={ 0 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
				<PanelBody title={ __( 'Hover effects', 'sgs-blocks' ) } initialOpen={ false }>
					<RangeControl
						label={ __( 'Scale on hover', 'sgs-blocks' ) }
						help={ __( 'Linked icons only. Visitors who reduce motion see no growth.', 'sgs-blocks' ) }
						value={ scaleHover }
						onChange={ ( value ) => setAttributes( { scaleHover: value } ) }
						min={ 1 }
						max={ 1.5 }
						step={ 0.05 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<RangeControl
						label={ __( 'Hover opacity', 'sgs-blocks' ) }
						help={ __( 'Fades the icon link on hover. 1 = no fade. 0 disables the fade entirely.', 'sgs-blocks' ) }
						value={ opacityHover ?? 0 }
						onChange={ ( value ) => setAttributes( { opacityHover: value ?? 0 } ) }
						min={ 0 }
						max={ 1 }
						step={ 0.05 }
						allowReset
						resetFallbackValue={ 0 }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</PanelBody>
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
		</>
	);
}
