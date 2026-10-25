/**
 * The box a Floating layer paints itself: fill, height, border and shadow, for a ring, a disc, a
 * tinted panel or a pill behind its blocks. Each control is the shared one other blocks mount; the
 * values are read by render.php through the shared border, shadow and fill assemblers and by
 * `layer-preview.js::layerBoxPreview` in the canvas.
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import {
	SgsColourPanel,
	fillRow,
	SgsBorderControl,
	SgsLengthControl,
	ShadowControl,
	ResponsiveOverride,
	shadowAttrKeys,
} from '../../components';
import { SHAPE_OPTIONS } from '../../components/media/controls/MediaBoxShapeControls';
import { validateShape } from '../../components/media/atoms/box-shape';

const HEIGHT_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @return {JSX.Element} The fill row, the Shape and border panel and the Shadow panel.
 */
export default function LayerBoxPanels( { attributes, setAttributes } ) {
	const { borderRadius } = attributes;
	const layerContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient
			? attributes.backgroundColour
			: '';

	return (
		<>
			<SgsColourPanel

				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Fill colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							gradient: 'backgroundColourGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Shape and border', 'sgs-blocks' ) } initialOpen={ false }>
					<ResponsiveOverride
						label={ __( 'Height', 'sgs-blocks' ) }
						value={ attributes.height }
						onChange={ ( obj ) => setAttributes( { height: obj } ) }
					>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SgsLengthControl
								presets={ false }
								label={ __( 'Height', 'sgs-blocks' ) }
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue || '' : '' }
								onChange={ ( v ) => setOwnValue( v || '' ) }
								units={ HEIGHT_UNITS }
								help={ __( 'Leave blank to size to the content. Set a height and a width to draw an empty ring or disc.', 'sgs-blocks' ) }
							/>
						) }
					</ResponsiveOverride>
					<SelectControl
						label={ __( 'Shape', 'sgs-blocks' ) }
						help={ __( 'Clips the layer, its fill, border, image and content to a shape. Set a border, fill or shadow to draw an empty shape.', 'sgs-blocks' ) }
						value={ validateShape( attributes.shape ) }
						options={ SHAPE_OPTIONS }
						onChange={ ( val ) => setAttributes( { shape: validateShape( val ) } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
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
						contrastAgainst={ layerContrastAgainst }
						radiusValues={ {
							base: borderRadius?.desktop ?? {},
							tablet: borderRadius?.tablet ?? {},
							mobile: borderRadius?.mobile ?? {},
						} }
						onRadiusChange={ ( tier, next ) => {
							const key = 'base' === tier ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelBody title={ __( 'Layer shadow', 'sgs-blocks' ) } initialOpen={ false }>
					<ShadowControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ shadowAttrKeys( 'boxShadow', { hover: true, hoverColour: true } ) }
					/>
				</PanelBody>
			</InspectorControls>
		</>
	);
}
