/**
 * SweepAngleControl — the directional sweep angle: one preset SelectControl (UI
 * sugar) plus core's own AnglePickerControl, both writing into the SAME `angle`
 * value (CSS gradient-angle convention: 0 = to top, 90 = to right, 180 = to
 * bottom, 270 = to left). Shared by the nav menus' item border and separator rows
 * and by `SgsSeparatorControl`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, AnglePickerControl } from '@wordpress/components';

/**
 * @param {Object}   root0               Props.
 * @param {number}   root0.angle         The stored angle, degrees.
 * @param {Function} root0.onAngleChange Receives the next angle, degrees.
 * @param {number}   [root0.fallback]    The angle shown when none is stored. Default 90.
 * @return {Object} The node.
 */
export default function SweepAngleControl( { angle, onAngleChange, fallback = 90 } ) {
	const current = Number.isFinite( angle ) ? angle : fallback;
	const presets = [
		{ label: __( 'Horizontal (left to right)', 'sgs-blocks' ), value: 90 },
		{ label: __( 'Horizontal (right to left)', 'sgs-blocks' ), value: 270 },
		{ label: __( 'Vertical (top to bottom)', 'sgs-blocks' ), value: 180 },
		{ label: __( 'Vertical (bottom to top)', 'sgs-blocks' ), value: 0 },
	];
	const presetMatch = presets.find( ( p ) => p.value === current );
	return (
		<>
			<SelectControl
				label={ __( 'Sweep direction', 'sgs-blocks' ) }
				value={ presetMatch ? String( current ) : 'custom' }
				options={ [
					...presets.map( ( p ) => ( {
						label: p.label,
						value: String( p.value ),
					} ) ),
					{ label: __( 'Custom angle…', 'sgs-blocks' ), value: 'custom' },
				] }
				onChange={ ( val ) => {
					if ( 'custom' !== val ) {
						onAngleChange( Number( val ) );
					}
				} }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<AnglePickerControl
				label={ __( 'Angle', 'sgs-blocks' ) }
				value={ current }
				onChange={ ( val ) => onAngleChange( Number( val ) ) }
			/>
		</>
	);
}
