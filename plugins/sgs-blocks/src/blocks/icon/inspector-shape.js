/**
 * sgs/icon inspector: the Shape panel (outline, background switch, per-device shape size) and the Border panel
 * (the shared SgsBorderControl; the radius only for the square).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { ResponsiveControl, SgsLengthControl, SgsBorderControl } from '../../components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';
import { patchTier } from '../../utils';

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
 * @return {JSX.Element} The Shape and Border panels.
 */
export default function ShapePanels( { attributes, setAttributes, brandOn } ) {
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
	const usesHeight = 'circle' !== shape && ! shapeSizeLinked;
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
				<ToggleGroupControl
					label={ __( 'Shape', 'sgs-blocks' ) }
					value={ shape }
					onChange={ ( value ) =>
						// Only the square takes a radius: leaving it clears the radius.
						setAttributes( 'square' === value ? { shape: value } : { shape: value, borderRadius: {} } )
					}
					isBlock
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					<ToggleGroupControlOption value="square" label={ __( 'Square', 'sgs-blocks' ) } />
					<ToggleGroupControlOption value="circle" label={ __( 'Circle', 'sgs-blocks' ) } />
					<ToggleGroupControlOption value="pill" label={ __( 'Pill', 'sgs-blocks' ) } />
				</ToggleGroupControl>
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
								label={ 'circle' === shape || shapeSizeLinked ? __( 'Size', 'sgs-blocks' ) : __( 'Width', 'sgs-blocks' ) }
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
				{ 'circle' !== shape && (
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
							gradientValue: borderColourGradient,
							onGradientChange: ( value ) => setAttributes( { borderColourGradient: value ?? '' } ),
						},
						{
							key: 'hover',
							label: __( 'Hover', 'sgs-blocks' ),
							value: borderColourHover,
							linked: true,
							onChange: ( value ) => setAttributes( { borderColourHover: value ?? '' } ),
							gradientValue: borderColourHoverGradient,
							onGradientChange: ( value ) => setAttributes( { borderColourHoverGradient: value ?? '' } ),
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
			</PanelBody>
		</>
	);
}
