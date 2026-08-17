/**
 * ShapeDividersPanel — shared wrapper panel.
 *
 * Split out of ContainerWrapperControls.js on 2026-08-17 (Bean-requested). That file held six
 * independently-mountable shared panels in one module, which repeatedly read as a "monolith" — an
 * audit in this repo measured the decomposition by its LINE COUNT, concluded no split had happened,
 * and had to retract it. One panel per file removes the ambiguity: the split is visible in `ls`.
 *
 * Blocks may import this directly, or via ContainerWrapperControls.js which re-exports it for the
 * existing ~30 call sites.
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { GradientOverlayControl, ScaleAxisControl } from '../../../components';

const SHAPE_DIVIDER_SCALE_MIN = 10;
const SHAPE_DIVIDER_SCALE_MAX = 400;
const SHAPE_DIVIDER_SCALE_NEUTRAL = 100;

const SHAPE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
	{ label: __( 'Wave (Smooth)', 'sgs-blocks' ), value: 'wave-smooth' },
	{ label: __( 'Triangle', 'sgs-blocks' ), value: 'triangle' },
	{ label: __( 'Triangle (Asymmetric)', 'sgs-blocks' ), value: 'triangle-asymmetric' },
	{ label: __( 'Curve', 'sgs-blocks' ), value: 'curve' },
	{ label: __( 'Curve (Asymmetric)', 'sgs-blocks' ), value: 'curve-asymmetric' },
	{ label: __( 'Zigzag', 'sgs-blocks' ), value: 'zigzag' },
	{ label: __( 'Cloud', 'sgs-blocks' ), value: 'cloud' },
	{ label: __( 'Slant', 'sgs-blocks' ), value: 'slant' },
	{ label: __( 'Slant (Gentle)', 'sgs-blocks' ), value: 'slant-gentle' },
	{ label: __( 'Mountains', 'sgs-blocks' ), value: 'mountains' },
	{ label: __( 'Drops', 'sgs-blocks' ), value: 'drops' },
	{ label: __( 'Tilt', 'sgs-blocks' ), value: 'tilt' },
	{ label: __( 'Arrow', 'sgs-blocks' ), value: 'arrow' },
	{ label: __( 'Split', 'sgs-blocks' ), value: 'split' },
];

export function ShapeDividersPanel( { attributes, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Shape Dividers', 'sgs-blocks' ) } initialOpen={ false }>
			<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '8px' } }>
				{ __( 'Top Divider', 'sgs-blocks' ) }
			</p>
			<SelectControl
				label={ __( 'Shape', 'sgs-blocks' ) }
				value={ attributes.shapeDividerTop || '' }
				options={ SHAPE_OPTIONS }
				onChange={ ( val ) => setAttributes( { shapeDividerTop: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ attributes.shapeDividerTop && (
				<>
					<GradientOverlayControl
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							solid: 'shapeDividerTopColour',
							gradient: 'shapeDividerTopColourGradient',
						} }
						solidLabel={ __( 'Colour', 'sgs-blocks' ) }
					/>
					<ScaleAxisControl
						label={ __( 'Size', 'sgs-blocks' ) }
						value={ attributes.shapeDividerTopScale }
						onChange={ ( val ) => setAttributes( { shapeDividerTopScale: val } ) }
						min={ SHAPE_DIVIDER_SCALE_MIN }
						max={ SHAPE_DIVIDER_SCALE_MAX }
						step={ 1 }
						unit="%"
						defaultValue={ SHAPE_DIVIDER_SCALE_NEUTRAL }
					/>
					<ToggleControl
						label={ __( 'Flip horizontally', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerTopFlip }
						onChange={ ( val ) => setAttributes( { shapeDividerTopFlip: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Invert vertically', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerTopInvert }
						onChange={ ( val ) => setAttributes( { shapeDividerTopInvert: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }

			<hr style={ { margin: '16px 0' } } />

			<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '8px' } }>
				{ __( 'Bottom Divider', 'sgs-blocks' ) }
			</p>
			<SelectControl
				label={ __( 'Shape', 'sgs-blocks' ) }
				value={ attributes.shapeDividerBottom || '' }
				options={ SHAPE_OPTIONS }
				onChange={ ( val ) => setAttributes( { shapeDividerBottom: val } ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ attributes.shapeDividerBottom && (
				<>
					<GradientOverlayControl
						attributes={ attributes }
						setAttributes={ setAttributes }
						attrNames={ {
							solid: 'shapeDividerBottomColour',
							gradient: 'shapeDividerBottomColourGradient',
						} }
						solidLabel={ __( 'Colour', 'sgs-blocks' ) }
					/>
					<ScaleAxisControl
						label={ __( 'Size', 'sgs-blocks' ) }
						value={ attributes.shapeDividerBottomScale }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomScale: val } ) }
						min={ SHAPE_DIVIDER_SCALE_MIN }
						max={ SHAPE_DIVIDER_SCALE_MAX }
						step={ 1 }
						unit="%"
						defaultValue={ SHAPE_DIVIDER_SCALE_NEUTRAL }
					/>
					<ToggleControl
						label={ __( 'Flip horizontally', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerBottomFlip }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomFlip: val } ) }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Invert vertically', 'sgs-blocks' ) }
						checked={ attributes.shapeDividerBottomInvert }
						onChange={ ( val ) => setAttributes( { shapeDividerBottomInvert: val } ) }
						__nextHasNoMarginBottom
					/>
				</>
			) }
		</PanelBody>
	);
}

/**
 * Grid item defaults panel.
 * Section kind only (grid layout).
 */
