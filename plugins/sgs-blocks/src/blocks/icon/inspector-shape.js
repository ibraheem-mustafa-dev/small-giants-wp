/**
 * sgs/icon inspector: the Shape panel (shape, background switch, per-device shape size) and the Border panel
 * (the shared SgsBorderControl; the radius only for the square, solid colours only for an outline shape).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { ResponsiveControl, SgsLengthControl, SgsBorderControl } from '../../components';
import { patchTier } from '../../utils';
import { isOutlineShape, shapeUsesWidthOnly } from '../../utils/icon-shapes';
import { ShapeToggle } from './shape-options';

const LENGTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'rem', label: 'rem' },
	{ value: 'em', label: 'em' },
	{ value: '%', label: '%' },
];

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block setAttributes.
 * @param {boolean}  props.brandOn       Brand colours apply (they turn the background on).
 * @param {boolean}  props.outlineShown  The painted shape is a custom outline (its own, or a row's group shape).
 * @return {JSX.Element} The Shape and Border panels.
 */
export default function ShapePanels( { attributes, setAttributes, brandOn, outlineShown = false } ) {
	const {
		shape = 'square',
		showBackground,
		shapeSize,
		shapeSizeLinked = true,
		borderWidth,
		borderStyle,
		borderColour,
		borderColourGradient,
		borderColourHover,
		borderColourHoverGradient,
		borderRadius,
	} = attributes;
	const widthOnly = shapeUsesWidthOnly( shape );
	const outline = outlineShown || isOutlineShape( shape );
	const usesHeight = ! widthOnly && ! shapeSizeLinked;
	// The border is judged against the shape's own background when it has a flat one.
	const iconContrastAgainst =
		attributes.backgroundColour && ! attributes.backgroundColourGradient ? attributes.backgroundColour : '';

	const writeSize = ( tier, side, value ) => {
		const current = shapeSize?.[ tier ] && 'object' === typeof shapeSize[ tier ] ? shapeSize[ tier ] : {};
		const next = { ...current, [ side ]: value || undefined };
		patchTier( attributes, setAttributes, 'shapeSize', tier, next.width || next.height ? next : undefined );
	};

	return (
		<>
			<PanelBody title={ __( 'Shape', 'sgs-blocks' ) } initialOpen={ false }>
				<ShapeToggle
					label={ __( 'Shape', 'sgs-blocks' ) }
					value={ shape }
					onChange={ ( value ) =>
						// Only the square takes a radius: leaving it clears the radius. An outline's stroke takes a flat
						// colour only, and a stored border gradient would hide it: moving to an outline clears them.
						setAttributes( {
							shape: value || 'square',
							...( 'square' === value ? {} : { borderRadius: {} } ),
							...( isOutlineShape( value ) ? { borderColourGradient: '', borderColourHoverGradient: '' } : {} ),
						} )
					}
				/>
				<ToggleControl
					label={ __( 'Background', 'sgs-blocks' ) }
					help={
						brandOn
							? __( 'Brand colours paint the background, whatever this switch says.', 'sgs-blocks' )
							: __( 'Paints the shape behind the icon.', 'sgs-blocks' )
					}
					checked={ !! showBackground || brandOn }
					disabled={ brandOn }
					onChange={ ( value ) => setAttributes( { showBackground: value } ) }
					__nextHasNoMarginBottom
				/>
				<ResponsiveControl label={ __( 'Shape size', 'sgs-blocks' ) }>
					{ ( tier ) => (
						<>
							<SgsLengthControl
								label={ widthOnly || shapeSizeLinked ? __( 'Size', 'sgs-blocks' ) : __( 'Width', 'sgs-blocks' ) }
								value={ shapeSize?.[ tier ]?.width ?? '' }
								units={ LENGTH_UNITS }
								presets
								help={ __( 'Leave blank for the icon size plus a little room each side.', 'sgs-blocks' ) }
								onChange={ ( value ) => writeSize( tier, 'width', value ) }
							/>
							{ usesHeight && (
								<SgsLengthControl
									label={ __( 'Height', 'sgs-blocks' ) }
									value={ shapeSize?.[ tier ]?.height ?? '' }
									units={ LENGTH_UNITS }
									presets
									onChange={ ( value ) => writeSize( tier, 'height', value ) }
								/>
							) }
						</>
					) }
				</ResponsiveControl>
				{ ! widthOnly && (
					<ToggleControl
						label={ __( 'Same width and height', 'sgs-blocks' ) }
						checked={ shapeSizeLinked }
						onChange={ ( value ) => setAttributes( { shapeSizeLinked: value } ) }
						__nextHasNoMarginBottom
					/>
				) }
			</PanelBody>
			<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
				<SgsBorderControl
					widthValues={ borderWidth ?? {} }
					onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
					widthPresets={ [ '10', '20', '30' ] }
					styleValue={ borderStyle }
					onStyleChange={ ( value ) => setAttributes( { borderStyle: value } ) }
					colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
					contrastAgainst={ iconContrastAgainst }
					colourStates={ [
						{
							key: 'normal',
							label: __( 'Normal', 'sgs-blocks' ),
							value: borderColour,
							linked: true,
							onChange: ( value ) => setAttributes( { borderColour: value ?? '' } ),
							// An outline's stroke takes a flat colour only: no gradient control that would paint nothing.
							...( outline
								? {}
								: {
										gradientValue: borderColourGradient,
										onGradientChange: ( value ) => setAttributes( { borderColourGradient: value ?? '' } ),
								  } ),
						},
						{
							key: 'hover',
							label: __( 'Hover', 'sgs-blocks' ),
							value: borderColourHover,
							linked: true,
							onChange: ( value ) => setAttributes( { borderColourHover: value ?? '' } ),
							...( outline
								? {}
								: {
										gradientValue: borderColourHoverGradient,
										onGradientChange: ( value ) => setAttributes( { borderColourHoverGradient: value ?? '' } ),
								  } ),
						},
					] }
					{ ...( 'square' === shape
						? {
								radiusValues: {
									base: borderRadius?.desktop ?? {},
									tablet: borderRadius?.tablet ?? {},
									mobile: borderRadius?.mobile ?? {},
								},
								onRadiusChange: ( tier, next ) =>
									patchTier( attributes, setAttributes, 'borderRadius', 'base' === tier ? 'desktop' : tier, next ),
						  }
						: {} ) }
				/>
				{ outline && (
					<p className="components-base-control__help">
						{ __( 'This shape draws its border as a line around the outline: one width (the top side), a flat colour, dashed or dotted kept. Gradients paint the square, circle and pill only.', 'sgs-blocks' ) }
					</p>
				) }
			</PanelBody>
		</>
	);
}
