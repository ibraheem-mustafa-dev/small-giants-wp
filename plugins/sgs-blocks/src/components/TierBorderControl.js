/**
 * TierBorderControl: one border (width, style, colour) per device, stored as
 * `{desktop|tablet|mobile: {width, style, colour}}`. One ResponsiveOverride carries the device strip, the inherited cue
 * and the reset; a member left empty on a device takes the device above's. The PHP side is
 * `includes/helpers-tiered-border.php::sgs_tiered_border_specs`.
 *
 * Usage:
 *   <TierBorderControl
 *     label={ __( 'Badge border', 'sgs-blocks' ) }
 *     value={ attributes.badgeBorder }
 *     onChange={ ( obj ) => setAttributes( { badgeBorder: obj } ) }
 *   />
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import ResponsiveOverride from './ResponsiveOverride';
import SgsLengthControl from './SgsLengthControl';
import BorderStyleControl from './BorderStyleControl';
import DesignTokenPicker from './DesignTokenPicker';

/**
 * @param {Object}   props          Props.
 * @param {string}   props.label    Visible label.
 * @param {Object}   props.value    The tier object.
 * @param {Function} props.onChange Receives the whole next tier object.
 * @return {Element} The control.
 */
export default function TierBorderControl( { label, value, onChange } ) {
	return (
		<ResponsiveOverride label={ label } value={ value } onChange={ onChange }>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => {
				const own = ownValue && 'object' === typeof ownValue ? ownValue : {};
				const effective = effectiveValue && 'object' === typeof effectiveValue ? effectiveValue : {};
				const write = ( member, next ) => {
					const merged = { ...own };
					if ( next ) {
						merged[ member ] = next;
					} else {
						delete merged[ member ];
					}
					setOwnValue( Object.keys( merged ).length ? merged : undefined );
				};
				return (
					<>
						<SgsLengthControl
							label={ __( 'Width', 'sgs-blocks' ) }
							value={ own.width ?? '' }
							placeholder={ inherited ? effective.width : '' }
							onChange={ ( next ) => write( 'width', next ) }
						/>
						<BorderStyleControl
							label={ __( 'Style', 'sgs-blocks' ) }
							value={ own.style ?? effective.style ?? '' }
							onChange={ ( next ) => write( 'style', next || 'none' ) }
						/>
						<DesignTokenPicker
							label={ __( 'Colour', 'sgs-blocks' ) }
							states={ [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: own.colour ?? effective.colour ?? '',
									onChange: ( next ) => write( 'colour', next ),
								},
							] }
						/>
					</>
				);
			} }
		</ResponsiveOverride>
	);
}
