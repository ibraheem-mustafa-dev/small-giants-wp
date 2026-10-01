/**
 * SeparatorAxisRow — one axis of `SgsSeparatorControl`: the per-device thickness
 * beside ONE colour swatch whose popover holds the Normal / Hover tabs and the line
 * style picker, the same shape as `SgsBorderControl`'s width + colour pair.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { BaseControl } from '@wordpress/components';
import ResponsiveLengthControl from './ResponsiveLengthControl';
import DesignTokenPicker from './DesignTokenPicker';

/**
 * @param {Object}   props
 * @param {string}   props.title    Group heading, e.g. "Between rows".
 * @param {Object}   props.axis     The stored axis `{ style, width, colour, colourHover }`.
 * @param {boolean}  props.hover    Whether the colour popover carries a Hover tab.
 * @param {Function} props.onPatch  Receives the fields to merge into the axis.
 * @return {JSX.Element} The row.
 */
export default function SeparatorAxisRow( { title, axis, hover, onPatch } ) {
	const states = [
		{
			key: 'normal',
			label: __( 'Normal', 'sgs-blocks' ),
			value: axis.colour,
			onChange: ( val ) => onPatch( { colour: val ?? '' } ),
			linked: true,
		},
		...( hover
			? [
					{
						key: 'hover',
						label: __( 'Hover', 'sgs-blocks' ),
						value: axis.colourHover,
						onChange: ( val ) => onPatch( { colourHover: val ?? '' } ),
						linked: true,
					},
			  ]
			: [] ),
	];
	return (
		<div className="sgs-separator-control__axis">
			<BaseControl.VisualLabel>{ title }</BaseControl.VisualLabel>
			<ResponsiveLengthControl
				label={ __( 'Thickness', 'sgs-blocks' ) }
				help={ __( 'A CSS length such as 1px. Empty draws no line.', 'sgs-blocks' ) }
				value={ axis.width }
				onChange={ ( width ) => onPatch( { width } ) }
			/>
			<DesignTokenPicker
				label={ __( 'Line colour and style', 'sgs-blocks' ) }
				states={ states }
				borderStyle={ axis.style }
				onBorderStyleChange={ ( style ) => onPatch( { style } ) }
			/>
		</div>
	);
}
