/**
 * Nav bar menu "Panel motion" panel (Wave 3C U-5): the opening and closing
 * time, speed curve and item stagger shared by every dropdown and mega panel
 * this bar renders. The animation shape itself sits with the other dropdown
 * settings (`submenuAnimation`, DropdownStylePanel). Render side:
 * `render.php`, the "Panel motion" section, and `style.css`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, RangeControl } from '@wordpress/components';
import { MotionEasingControl } from '../../components';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The panel.
 */
export default function PanelMotionPanel( { attributes, setAttributes } ) {
	const {
		submenuAnimationDuration,
		submenuExitDuration,
		submenuAnimationEasing,
		submenuAnimationEasingCustom,
		submenuItemStagger,
		submenuItemStaggerDuration,
		submenuItemStaggerMax,
		submenuItemStaggerDistance,
	} = attributes;

	const range = ( label, key, value, fallback, min, max, step, help ) => (
		<RangeControl
			label={ label }
			help={ help }
			value={ value ?? fallback }
			onChange={ ( next ) => setAttributes( { [ key ]: next ?? fallback } ) }
			min={ min }
			max={ max }
			step={ step }
			allowReset
			resetFallbackValue={ fallback }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);

	return (
		<PanelBody title={ __( 'Panel motion', 'sgs-blocks' ) } initialOpen={ false }>
			{ range( __( 'Opening time (ms)', 'sgs-blocks' ), 'submenuAnimationDuration', submenuAnimationDuration, 180, 0, 3000, 10 ) }
			{ range(
				__( 'Closing time (ms)', 'sgs-blocks' ),
				'submenuExitDuration',
				submenuExitDuration,
				150,
				0,
				3000,
				10,
				__( '0 closes instantly.', 'sgs-blocks' )
			) }
			<MotionEasingControl
				label={ __( 'Speed curve', 'sgs-blocks' ) }
				value={ submenuAnimationEasing }
				custom={ submenuAnimationEasingCustom }
				fallback="ease-out-css"
				onChange={ ( value ) => setAttributes( { submenuAnimationEasing: value } ) }
				onCustomChange={ ( value ) => setAttributes( { submenuAnimationEasingCustom: value } ) }
			/>
			{ range(
				__( 'Item stagger (ms between items)', 'sgs-blocks' ),
				'submenuItemStagger',
				submenuItemStagger,
				0,
				0,
				1000,
				1,
				__( 'Panel items arrive one after another. 0 turns this off.', 'sgs-blocks' )
			) }
			{ ( submenuItemStagger ?? 0 ) > 0 && (
				<>
					{ range(
						__( 'Item arrival time (ms)', 'sgs-blocks' ),
						'submenuItemStaggerDuration',
						submenuItemStaggerDuration,
						0,
						0,
						3000,
						10,
						__( '0 uses the opening time.', 'sgs-blocks' )
					) }
					{ range(
						__( 'Longest item delay (ms)', 'sgs-blocks' ),
						'submenuItemStaggerMax',
						submenuItemStaggerMax,
						0,
						0,
						3000,
						10,
						__( '0 means no cap.', 'sgs-blocks' )
					) }
					{ range(
						__( 'Item travel distance (px)', 'sgs-blocks' ),
						'submenuItemStaggerDistance',
						submenuItemStaggerDistance,
						8,
						-400,
						400,
						1,
						__( 'Negative values drop items in from above.', 'sgs-blocks' )
					) }
				</>
			) }
		</PanelBody>
	);
}
