/**
 * Nav drawer "Top row border": the bottom border of the chrome row per device (`chromeRowBorder`,
 * `{desktop|tablet|mobile: {width, style, colour}}`). One ResponsiveOverride carries the device strip, the inherited
 * cue and the reset; inside it a member left empty on a device takes the device above's. Rendered by
 * `includes/nav-drawer-chrome-css.php::sgs_nav_drawer_chrome_border_specs`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { ResponsiveOverride, SgsLengthControl, BorderStyleControl, DesignTokenPicker } from '../../components';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The control.
 */
export default function ChromeRowBorderControls( { attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			label={ __( 'Top row bottom border', 'sgs-blocks' ) }
			value={ attributes.chromeRowBorder }
			onChange={ ( next ) => setAttributes( { chromeRowBorder: next } ) }
		>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => {
				const own = ownValue && 'object' === typeof ownValue ? ownValue : {};
				const effective = effectiveValue && 'object' === typeof effectiveValue ? effectiveValue : {};
				const write = ( member, value ) => {
					const next = { ...own };
					if ( value ) {
						next[ member ] = value;
					} else {
						delete next[ member ];
					}
					setOwnValue( Object.keys( next ).length ? next : undefined );
				};
				return (
					<>
						<SgsLengthControl
							label={ __( 'Width', 'sgs-blocks' ) }
							value={ own.width ?? '' }
							placeholder={ inherited ? effective.width : '' }
							onChange={ ( value ) => write( 'width', value ) }
						/>
						<BorderStyleControl
							label={ __( 'Style', 'sgs-blocks' ) }
							value={ own.style ?? effective.style ?? '' }
							onChange={ ( value ) => write( 'style', value || 'none' ) }
						/>
						<DesignTokenPicker
							label={ __( 'Colour', 'sgs-blocks' ) }
							states={ [
								{
									key: 'normal',
									label: __( 'Normal', 'sgs-blocks' ),
									value: own.colour ?? effective.colour ?? '',
									onChange: ( value ) => write( 'colour', value ),
								},
							] }
						/>
					</>
				);
			} }
		</ResponsiveOverride>
	);
}
